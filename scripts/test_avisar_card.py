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
PREVIOUS = 'd' * 40
C1, C2 = '1' * 40, '2' * 40
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

    def __init__(self, commit=SHA, post_error=None, probe_error=None):
        self.requests, self.commit, self.post_error, self.probe_error = [], commit, post_error, probe_error

    def __call__(self, request, timeout=10):
        self.requests.append(request)
        if request.get_method() == 'POST':
            if self.post_error:
                raise self.post_error
            return Response('{}')
        if self.probe_error:
            raise self.probe_error
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

    def test_probe_that_failed_is_not_verified_instead_of_different(self):
        body = build_body('CD (Produção) concluído', SHA, PR, RUN, {'/api/version': None, '/version.json': SHA})
        self.assertIn('não verificado', body)
        self.assertIn('indisponível', body)
        self.assertNotIn('diferente', body)

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


class NotifyFixture(unittest.TestCase):
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

    def run_notify(self, prs=(PR,), http=None, env=None, github=None, compare=None):
        http = http or Http()
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = notify(env or self.env, github or (lambda sha: list(prs)), http, self.root, compare)
        return code, http, out.getvalue()


class NotifyTests(NotifyFixture):
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

    def test_unreachable_production_is_posted_as_not_verified(self):
        code, http, _ = self.run_notify(http=Http(probe_error=urllib.error.URLError('sem rota')))
        self.assertEqual(code, 0)
        [post] = http.posts()
        content = json.loads(post.data)['content']
        self.assertIn('não verificado', content)
        self.assertNotIn('diferente', content)

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


class Compare:
    """Stands in for the GitHub compare call: answers a range, or fails."""

    def __init__(self, commits, status='ahead', total=None, error=None):
        self.commits, self.status, self.total, self.error, self.calls = commits, status, total, error, []

    def __call__(self, previous, sha):
        self.calls.append((previous, sha))
        if self.error:
            raise self.error
        return {'status': self.status, 'total_commits': self.total or len(self.commits),
                'commits': [{'sha': commit} for commit in self.commits]}


def pull(number, delivery):
    return {'number': number, 'html_url': 'https://github.com/dmrepositorio/aponta/pull/' + str(number),
            'body': 'Aponta-Delivery: ' + delivery + '\nRefs dmrepositorio/aponta#' + str(number)}


class RangeTests(NotifyFixture):
    """A deploy publishes everything between the commit in production and the tip of main."""

    def setUp(self):
        super().setUp()
        self.env['PREVIOUS_SHA'] = PREVIOUS
        self.parents = {'DMTE-901': 'p-901', 'DMTE-902': 'p-902', 'DMTE-903': 'p-903'}
        for delivery, parent in self.parents.items():
            (self.root / '.delivery/deliveries' / (delivery + '.json')).write_text(json.dumps({'multica_id': parent}))
        self.prs = {C1: [pull(31, 'DMTE-901')], C2: [pull(32, 'DMTE-902')], SHA: [pull(33, 'DMTE-903')]}
        self.asked = []

    def github(self, commit):
        self.asked.append(commit)
        return list(self.prs.get(commit, []))

    def run_range(self, commits=(C1, C2, SHA), http=None, env=None, **kwargs):
        compare = Compare(list(commits), **kwargs)
        code, http, out = self.run_notify(http=http, env=env, github=self.github, compare=compare)
        self.compare = compare
        return code, http, out

    def comments(self, http):
        return {request.full_url.split('/issues/')[1].split('/')[0]: json.loads(request.data)['content']
                for request in http.posts()}

    def test_each_delivery_of_the_range_gets_its_own_comment_with_mention(self):
        code, http, _ = self.run_range()
        self.assertEqual(code, 0)
        self.assertEqual(self.compare.calls, [(PREVIOUS, SHA)])
        comments = self.comments(http)
        self.assertEqual(sorted(comments), ['p-901', 'p-902', 'p-903'])
        for parent, commit, number in (('p-901', C1, 31), ('p-902', C2, 32), ('p-903', SHA, 33)):
            self.assertTrue(comments[parent].startswith(LEADER))
            self.assertIn('- Commit: `' + commit + '`', comments[parent])
            self.assertIn('#' + str(number), comments[parent])
            self.assertIn(RUN, comments[parent])
            self.assertIn('coincide com o commit implantado', comments[parent])

    def test_comment_names_the_published_commit_and_the_other_deliveries(self):
        _, http, _ = self.run_range()
        comments = self.comments(http)
        self.assertEqual(sorted(comments), ['p-901', 'p-902', 'p-903'])
        self.assertIn('- Publicado no commit: `' + SHA + '`', comments['p-901'])
        self.assertIn('- Publicado no commit: `' + SHA + '`', comments['p-902'])
        self.assertNotIn('Publicado no commit', comments['p-903'])
        self.assertIn('- Publicado junto com: DMTE-902 (PR #32), DMTE-903 (PR #33)', comments['p-901'])
        self.assertIn('- Publicado junto com: DMTE-901 (PR #31), DMTE-903 (PR #33)', comments['p-902'])
        self.assertIn('- Publicado junto com: DMTE-901 (PR #31), DMTE-902 (PR #32)', comments['p-903'])

    def test_production_is_probed_once_for_all_the_cards(self):
        _, http, _ = self.run_range()
        probed = [r.full_url for r in http.requests if r.get_method() == 'GET']
        self.assertEqual(probed, ['https://dm.aponta.cloud/api/version', 'https://dm.aponta.cloud/version.json'])

    def test_single_delivery_in_the_range_is_identical_to_today(self):
        expected = build_body('CD (Produção) concluído', SHA, PR, RUN, {'/api/version': SHA, '/version.json': SHA})
        self.prs = {SHA: [PR]}
        _, http, _ = self.run_range(commits=(SHA,))
        self.assertEqual(self.comments(http), {PARENT: expected})
        self.assertNotIn('Publicado', expected)

    def test_range_with_one_delivery_and_other_commits_without_pr_is_identical_to_today(self):
        expected = build_body('CD (Produção) concluído', SHA, PR, RUN, {'/api/version': SHA, '/version.json': SHA})
        self.prs = {SHA: [PR]}
        _, http, out = self.run_range()
        self.assertEqual(self.comments(http), {PARENT: expected})
        self.assertIn(C1, out)

    def test_failure_comments_every_card_of_the_range(self):
        env = {**self.env, 'STAGING_RESULT': 'failure', 'PRODUCTION_RESULT': 'skipped'}
        code, http, _ = self.run_range(env=env)
        self.assertEqual(code, 0)
        comments = self.comments(http)
        self.assertEqual(sorted(comments), ['p-901', 'p-902', 'p-903'])
        for content in comments.values():
            self.assertTrue(content.startswith(LEADER))
            self.assertIn('CD falhou em staging', content)
            self.assertIn(RUN, content)
        self.assertEqual([r.get_method() for r in http.requests], ['POST'] * 3)

    def test_production_failure_comments_every_card_of_the_range(self):
        env = {**self.env, 'PRODUCTION_RESULT': 'failure'}
        _, http, _ = self.run_range(env=env)
        comments = self.comments(http)
        self.assertEqual(len(comments), 3)
        self.assertTrue(all('CD falhou em produção' in content for content in comments.values()))

    def assert_only_the_published_commit(self, previous=PREVIOUS, reason=None, **kwargs):
        env = {**self.env, 'PREVIOUS_SHA': previous}
        self.prs = {SHA: [pull(33, 'DMTE-903')]}
        code, http, out = self.run_range(env=env, **kwargs)
        self.assertEqual(code, 0)
        self.assertEqual(self.asked, [SHA])
        self.assertEqual(sorted(self.comments(http)), ['p-903'])
        self.assertNotIn('Publicado junto com', self.comments(http)['p-903'])
        self.assertIn(reason, out)

    def test_empty_previous_sha_falls_back_to_the_published_commit(self):
        self.assert_only_the_published_commit(previous='', reason='PREVIOUS_SHA vazio')
        self.assertEqual(self.compare.calls, [])

    def test_previous_sha_that_is_not_a_commit_id_falls_back_without_calling_github(self):
        self.assert_only_the_published_commit(previous='main; rm -rf', reason='PREVIOUS_SHA inválido')
        self.assertEqual(self.compare.calls, [])

    def test_previous_sha_equal_to_the_published_one_falls_back(self):
        self.assert_only_the_published_commit(previous=SHA, reason='igual ao commit publicado')
        self.assertEqual(self.compare.calls, [])

    def test_rollback_range_falls_back(self):
        for status in ('behind', 'diverged'):
            with self.subTest(status=status):
                self.asked = []
                self.assert_only_the_published_commit(reason='status ' + status, status=status)

    def test_github_compare_failure_falls_back(self):
        self.assert_only_the_published_commit(reason='gh fora do ar', error=RuntimeError('gh fora do ar'))

    def test_truncated_range_falls_back(self):
        self.assert_only_the_published_commit(reason='truncado', commits=(C2, SHA), total=130)

    def test_commits_without_pr_or_delivery_line_are_ignored_and_the_others_still_comment(self):
        self.prs = {C1: [], C2: [{**pull(32, 'DMTE-902'), 'body': 'hotfix'}], SHA: [pull(33, 'DMTE-903')]}
        code, http, out = self.run_range()
        self.assertEqual(code, 0)
        self.assertEqual(sorted(self.comments(http)), ['p-903'])
        self.assertIn(C1, out)
        self.assertIn(C2, out)

    def test_delivery_without_manifest_does_not_stop_the_others(self):
        self.prs[C2] = [pull(32, 'DMTE-950')]
        code, http, out = self.run_range()
        self.assertEqual(code, 0)
        self.assertEqual(sorted(self.comments(http)), ['p-901', 'p-903'])
        self.assertIn('DMTE-950', out)
        self.assertNotIn('DMTE-950', self.comments(http)['p-901'])

    def test_github_lookup_failure_on_one_commit_does_not_stop_the_others(self):
        def github(commit):
            if commit == C2:
                raise RuntimeError('gh fora do ar')
            return list(self.prs.get(commit, []))
        compare = Compare([C1, C2, SHA])
        code, http, out = self.run_notify(github=github, compare=compare)
        self.assertEqual(code, 0)
        self.assertEqual(sorted(self.comments(http)), ['p-901', 'p-903'])
        self.assertIn('gh fora do ar', out)

    def test_delivery_in_two_commits_gets_one_comment_for_the_newest(self):
        self.prs[C2] = [pull(31, 'DMTE-901')]
        _, http, _ = self.run_range()
        comments = self.comments(http)
        self.assertEqual(sorted(comments), ['p-901', 'p-903'])
        self.assertIn('- Commit: `' + C2 + '`', comments['p-901'])
        self.assertNotIn(C1, comments['p-901'])
        self.assertIn('- Publicado junto com: DMTE-903 (PR #33)', comments['p-901'])

    def test_failure_to_comment_on_one_card_does_not_stop_the_others_nor_leak_the_token(self):
        class FirstPostFails(Http):
            def __call__(self, request, timeout=10):
                if request.get_method() == 'POST' and '/p-901/' in request.full_url:
                    self.requests.append(request)
                    raise urllib.error.HTTPError('u', 401, 'bad ' + TOKEN, {}, io.BytesIO(b''))
                return super().__call__(request, timeout)
        code, http, out = self.run_range(http=FirstPostFails())
        self.assertEqual(code, 0)
        self.assertEqual(len(http.posts()), 3)
        self.assertIn('DMTE-901', out)
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

    def test_checkout_failure_never_fails_the_deploy(self):
        self.assertEqual(self.notify.count('continue-on-error: true'), 2)

    def test_delivery_contract_runs_these_tests(self):
        contract = (DEPLOY.parent / 'delivery.yml').read_text()
        self.assertIn('-p test_avisar_card.py', contract)

    def test_resolve_captures_the_commit_in_production_before_any_deploy(self):
        resolve = self.text.split('\n  staging:\n')[0]
        self.assertIn('previous_sha: ${{ steps.previous.outputs.previous_sha }}', resolve)
        self.assertIn('https://dm.aponta.cloud/api/version', resolve)
        self.assertIn('previous_sha=', resolve)
        self.assertLess(resolve.index('id: previous'), resolve.index('id: target'))

    def test_capturing_the_previous_commit_never_fails_the_job(self):
        self.assertIn('id: previous', self.text)
        step = self.text.split('id: previous')[1].split('id: target')[0]
        self.assertIn('|| true', step)
        self.assertIn('--max-time', step)

    def test_notify_receives_the_previous_commit_and_the_deploy_jobs_do_not(self):
        self.assertIn('PREVIOUS_SHA: ${{ needs.resolve.outputs.previous_sha }}', self.notify)
        deploy = self.text.split('\n  staging:\n')[1].split('\n  notify:\n')[0]
        self.assertNotIn('previous_sha', deploy)
        self.assertNotIn('PREVIOUS_SHA', deploy)

    def test_token_is_only_read_by_notify(self):
        self.assertEqual(self.text.count('secrets.MULTICA_TOKEN'), 1)
        self.assertIn('MULTICA_TOKEN: ${{ secrets.MULTICA_TOKEN }}', self.notify)


if __name__ == '__main__':
    unittest.main()
