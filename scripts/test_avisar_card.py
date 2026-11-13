import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import urllib.error

from avisar_card import LEADER, build_body, delivery_of, notify, outcome

SHA = 'a' * 40
OTHER = 'b' * 40
RUN = 'https://github.com/dmrepositorio/aponta/actions/runs/777'
PARENT = '01a1d2f2-e5bf-7db7-b553-00a37815a9bc'
WORKSPACE = 'dabf7eb3-4a03-4e26-8eb0-0773f65cfff4'
TOKEN = 'mul_secret_token'
PR = {'number': 12, 'html_url': 'https://github.com/dmrepositorio/aponta/pull/12',
      'body': 'Aponta-Delivery: DMTE-900\nRefs dmrepositorio/aponta#1'}
DEPLOY = Path(__file__).resolve().parent.parent / '.github/workflows/deploy.yml'


class Response:
    def __init__(self, text):
        self.text = text

    def read(self):
        return self.text.encode()


class Http:
    """Stands in for urlopen: records requests, answers production version probes with a commit."""

    def __init__(self, commit=SHA, post_error=None):
        self.requests, self.commit, self.post_error = [], commit, post_error

    def __call__(self, request, timeout=10):
        self.requests.append(request)
        if request.get_method() == 'POST':
            if self.post_error:
                raise self.post_error
            return Response('{}')
        return Response(json.dumps({'commit': self.commit}))

    def posts(self):
        return [r for r in self.requests if r.get_method() == 'POST']


class OutcomeTests(unittest.TestCase):
    def test_production_success_is_ok(self):
        self.assertEqual(outcome('success', 'success'), (True, 'CD (Produção) concluído'))

    def test_staging_failure_is_reported_as_staging(self):
        self.assertEqual(outcome('failure', 'skipped'), (False, 'CD falhou em staging'))

    def test_production_failure_is_reported_as_production(self):
        self.assertEqual(outcome('success', 'failure'), (False, 'CD falhou em produção'))

    def test_cancelled_job_shows_its_own_result(self):
        self.assertEqual(outcome('cancelled', 'skipped'), (False, 'CD falhou em staging (cancelled)'))


class CommentBodyTests(unittest.TestCase):
    def test_success_starts_with_leader_mention_and_carries_sha_pr_run_and_version(self):
        body = build_body('CD (Produção) concluído', SHA, PR, RUN, {'/api/version': SHA, '/version.json': SHA})
        self.assertTrue(body.startswith(LEADER))
        for part in ('CD (Produção) concluído', '`' + SHA + '`', '#12', PR['html_url'], RUN,
                     '`/api/version`', '`/version.json`', 'coincide com o commit implantado'):
            self.assertIn(part, body)

    def test_version_that_differs_from_the_deployed_commit_is_said_so(self):
        body = build_body('CD (Produção) concluído', SHA, PR, RUN, {'/api/version': OTHER, '/version.json': SHA})
        self.assertIn('diferente do commit implantado', body)
        self.assertNotIn('coincide', body)

    def test_failure_names_the_job_and_the_run(self):
        body = build_body('CD falhou em staging', SHA, PR, RUN)
        self.assertTrue(body.startswith(LEADER))
        for part in ('CD falhou em staging', RUN, '`' + SHA + '`', '#12'):
            self.assertIn(part, body)
        self.assertNotIn('/api/version', body)


class DeliveryTests(unittest.TestCase):
    def test_single_delivery_line_names_the_delivery(self):
        self.assertEqual(delivery_of([PR]), ('DMTE-900', PR))

    def test_no_pr_or_no_line_names_nothing(self):
        self.assertIsNone(delivery_of([]))
        self.assertIsNone(delivery_of([{**PR, 'body': 'sem entrega'}, {**PR, 'body': None}]))

    def test_two_distinct_deliveries_name_nothing(self):
        self.assertIsNone(delivery_of([PR, {**PR, 'number': 13, 'body': 'Aponta-Delivery: DMTE-901'}]))


class NotifyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / '.delivery/deliveries').mkdir(parents=True)
        (self.root / '.delivery/deliveries/DMTE-900.json').write_text(json.dumps({'multica_id': PARENT}))
        (self.root / '.delivery/registry.json').write_text(json.dumps({'deliveries': {}}))
        self.env = {'SHA': SHA, 'STAGING_RESULT': 'success', 'PRODUCTION_RESULT': 'success', 'MULTICA_TOKEN': TOKEN,
                    'GITHUB_REPOSITORY': 'dmrepositorio/aponta', 'GITHUB_SERVER_URL': 'https://github.com',
                    'GITHUB_RUN_ID': '777'}

    def run_notify(self, prs=(PR,), http=None, env=None, github=None):
        http = http or Http()
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = notify(env or self.env, github or (lambda sha: list(prs)), http, self.root)
        return code, http, out.getvalue()

    def test_posts_content_with_workspace_and_bearer_headers(self):
        code, http, _ = self.run_notify()
        self.assertEqual(code, 0)
        [post] = http.posts()
        self.assertEqual(post.full_url, 'https://multica.aponta.cloud/api/issues/' + PARENT + '/comments')
        self.assertEqual(post.get_header('Authorization'), 'Bearer ' + TOKEN)
        self.assertEqual(post.get_header('X-workspace-id'), WORKSPACE)
        content = json.loads(post.data)['content']
        self.assertTrue(content.startswith(LEADER))
        self.assertIn(SHA, content)
        self.assertIn(RUN, content)
        self.assertIn('coincide com o commit implantado', content)
        probed = [r.full_url for r in http.requests if r.get_method() == 'GET']
        self.assertEqual(probed, ['https://dm.aponta.cloud/api/version', 'https://dm.aponta.cloud/version.json'])

    def test_failure_comments_without_probing_production(self):
        code, http, _ = self.run_notify(env={**self.env, 'STAGING_RESULT': 'failure', 'PRODUCTION_RESULT': 'skipped'})
        self.assertEqual(code, 0)
        [post] = http.posts()
        self.assertIn('CD falhou em staging', json.loads(post.data)['content'])
        self.assertEqual(len(http.requests), 1)

    def test_delivery_with_registry_entry_resolves_its_parent(self):
        other = '01a17485-8de1-7e6d-950a-1e295fef336b'
        (self.root / '.delivery/registry.json').write_text(json.dumps({'deliveries': {'DMTE-900': {'multica_id': other}}}))
        _, http, _ = self.run_notify()
        self.assertEqual([r.full_url for r in http.posts()], ['https://multica.aponta.cloud/api/issues/' + other + '/comments'])

    def test_commit_without_pr_does_not_comment(self):
        code, http, out = self.run_notify(prs=[])
        self.assertEqual((code, http.requests), (0, []))
        self.assertIn('sem PR', out)

    def test_pr_without_delivery_line_does_not_comment(self):
        code, http, out = self.run_notify(prs=[{**PR, 'body': 'hotfix'}])
        self.assertEqual((code, http.requests), (0, []))
        self.assertIn('Aponta-Delivery', out)

    def test_two_distinct_deliveries_do_not_comment(self):
        code, http, out = self.run_notify(prs=[PR, {**PR, 'number': 13, 'body': 'Aponta-Delivery: DMTE-901'}])
        self.assertEqual((code, http.requests), (0, []))
        self.assertIn('DMTE-900', out)

    def test_delivery_without_manifest_does_not_comment(self):
        code, http, out = self.run_notify(prs=[{**PR, 'body': 'Aponta-Delivery: DMTE-901'}])
        self.assertEqual((code, http.requests), (0, []))
        self.assertIn('DMTE-901', out)

    def test_github_lookup_failure_does_not_fail_the_deploy(self):
        def broken(sha):
            raise RuntimeError('gh fora do ar')
        code, http, out = self.run_notify(github=broken)
        self.assertEqual((code, http.requests), (0, []))
        self.assertIn('gh fora do ar', out)

    def test_missing_token_does_not_comment_nor_fail(self):
        code, http, out = self.run_notify(env={**self.env, 'MULTICA_TOKEN': ''})
        self.assertEqual((code, http.requests), (0, []))
        self.assertIn('MULTICA_TOKEN', out)

    def test_http_error_never_fails_the_deploy(self):
        error = urllib.error.HTTPError('u', 403, 'Forbidden', {}, io.BytesIO(b'forbidden'))
        code, http, out = self.run_notify(http=Http(post_error=error))
        self.assertEqual(code, 0)
        self.assertEqual(len(http.posts()), 1)
        self.assertIn('403', out)

    def test_network_error_never_fails_the_deploy(self):
        code, http, out = self.run_notify(http=Http(post_error=urllib.error.URLError('sem rota')))
        self.assertEqual(code, 0)
        self.assertEqual(len(http.posts()), 1)
        self.assertIn('sem rota', out)

    def test_token_is_redacted_from_logged_errors(self):
        error = urllib.error.HTTPError('u', 401, 'bad ' + TOKEN, {}, io.BytesIO(('echo ' + TOKEN).encode()))
        code, _, out = self.run_notify(http=Http(post_error=error))
        self.assertEqual(code, 0)
        self.assertIn('401', out)
        self.assertNotIn(TOKEN, out)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.text = DEPLOY.read_text()
        self.assertTrue('\n  notify:\n' in self.text, 'deploy.yml sem o job notify')
        self.notify = self.text.split('\n  notify:\n')[1]

    def test_notify_runs_after_cd_whatever_its_result(self):
        self.assertIn('needs: [resolve, staging, production]', self.notify)
        self.assertIn("if: always() && needs.resolve.outputs.sha != ''", self.notify)
        self.assertIn('scripts/avisar_card.py', self.notify)
        self.assertIn('STAGING_RESULT: ${{ needs.staging.result }}', self.notify)
        self.assertIn('PRODUCTION_RESULT: ${{ needs.production.result }}', self.notify)

    def test_notify_never_fails_the_deploy(self):
        self.assertIn('continue-on-error: true', self.notify)

    def test_token_is_only_read_by_notify(self):
        self.assertEqual(self.text.count('secrets.MULTICA_TOKEN'), 1)
        self.assertIn('MULTICA_TOKEN: ${{ secrets.MULTICA_TOKEN }}', self.notify)


if __name__ == '__main__':
    unittest.main()
