"""Behavioral tests for the staging -> production release tool (DMTE-473)."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import aponta_release as release

SHA = 'a' * 40
IMAGES = {'api': 'sha256:1', 'web': 'sha256:2', 'storybook': 'sha256:3'}


def passed_record(**changes):
    return {'version': 1, 'sha': SHA, 'images': dict(IMAGES),
            'staging': {'result': 'passed', 'checks': []}, **changes}


class PromotionGateTests(unittest.TestCase):
    """Production only receives the commit and the images that passed staging."""

    def test_commit_without_a_staging_record_is_refused(self):
        self.assertIn('No staging record for this commit.', release.promotion_errors(None, SHA, IMAGES))

    def test_commit_whose_staging_failed_is_refused(self):
        record = passed_record(staging={'result': 'failed', 'checks': []})
        self.assertIn('Staging did not pass for this commit.', release.promotion_errors(record, SHA, IMAGES))

    def test_record_of_another_commit_is_refused(self):
        self.assertIn('Staging record belongs to another commit.',
                      release.promotion_errors(passed_record(sha='b' * 40), SHA, IMAGES))

    def test_images_rebuilt_after_staging_are_refused(self):
        rebuilt = {**IMAGES, 'api': 'sha256:9'}
        self.assertIn('Image differs from the one validated in staging: api',
                      release.promotion_errors(passed_record(), SHA, rebuilt))

    def test_validated_commit_and_images_are_accepted(self):
        self.assertEqual(release.promotion_errors(passed_record(), SHA, IMAGES), [])


class OrderingTests(unittest.TestCase):
    """An older commit never replaces a newer one, except in an explicit rollback."""
    ENV = {'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t', 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q', '-b', 'main')
        self.old, self.new = self.commit('one'), self.commit('two')
        self.git('checkout', '-q', '-b', 'side', self.old)
        self.side = self.commit('side')

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.root), *args], check=True, capture_output=True, text=True,
                              env={**os.environ, **self.ENV}).stdout.strip()

    def commit(self, message):
        self.git('commit', '-q', '--allow-empty', '-m', message)
        return self.git('rev-parse', 'HEAD')

    def test_first_deploy_is_accepted(self):
        self.assertEqual(release.ordering_errors(self.root, None, self.new), [])

    def test_newer_commit_replaces_older(self):
        self.assertEqual(release.ordering_errors(self.root, self.old, self.new), [])

    def test_older_commit_does_not_replace_newer(self):
        self.assertIn('Commit is older than the one deployed; use --rollback to go back on purpose.',
                      release.ordering_errors(self.root, self.new, self.old))

    def test_commit_outside_the_deployed_history_is_refused(self):
        self.assertIn('Commit does not contain the one deployed.',
                      release.ordering_errors(self.root, self.new, self.side))

    def test_rollback_accepts_only_an_ancestor_of_the_deployed_commit(self):
        self.assertEqual(release.ordering_errors(self.root, self.new, self.old, rollback=True), [])
        self.assertIn('Rollback target is not an ancestor of the deployed commit.',
                      release.ordering_errors(self.root, self.new, self.side, rollback=True))


class EnvironmentTests(unittest.TestCase):
    """Staging never shares names, files, ports or secrets with production."""
    PROD = 'POSTGRES_PASSWORD=prod-db-secret\nJWT_SECRET=prod-jwt-secret\nSMTP_PASS=prod-mail-secret\nWEB_PORT=8090\n'

    def test_env_file_values_are_read_without_comments(self):
        self.assertEqual(release.env_values('# c\nWEB_PORT=8190\n\nA="x y"\n'), {'WEB_PORT': '8190', 'A': 'x y'})

    def test_new_staging_env_has_its_own_secrets_and_no_mail(self):
        text = release.new_staging_env()
        values = release.env_values(text)
        for key in ('POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'JWT_SECRET', 'WEB_PORT', 'API_PORT'):
            self.assertTrue(values.get(key), key)
        self.assertNotEqual(values['WEB_PORT'], release.env_values(self.PROD)['WEB_PORT'])
        self.assertNotEqual(release.env_values(release.new_staging_env())['JWT_SECRET'], values['JWT_SECRET'])
        self.assertFalse([key for key in values if key.startswith(('SMTP_', 'IMAP_'))])

    def test_compose_command_keeps_each_environment_in_its_own_project(self):
        home, config = Path('/srv/deploy'), Path('/srv/config')
        staging = release.compose_command('staging', SHA, home, config)
        production = release.compose_command('production', SHA, home, config)
        self.assertEqual(staging[staging.index('-p') + 1], 'aponta-staging')
        self.assertEqual(production[production.index('-p') + 1], 'aponta-prod')
        self.assertIn(str(config / '.env.staging'), staging)
        self.assertNotIn(str(config / '.env.prod'), staging)
        self.assertIn(str(home / 'releases' / SHA / 'docker-compose.staging.yml'), staging)
        self.assertNotIn(str(home / 'releases' / SHA / 'docker-compose.staging.yml'), production)

    def test_unknown_environment_is_refused(self):
        with self.assertRaises(ValueError):
            release.compose_command('prod', SHA, Path('/a'), Path('/b'))


class SmokeTests(unittest.TestCase):
    """The smoke test proves which commit is answering, not only that something answers."""

    def fetch(self, commit=SHA, health='ok', web_commit=None):
        pages = {'/': (200, '<html>'), '/api/health': (200, json.dumps({'status': health})),
                 '/api/version': (200, json.dumps({'commit': commit})),
                 '/version.json': (200, json.dumps({'commit': web_commit or commit}))}
        return lambda path: pages[path]

    def failed(self, checks):
        return [check['name'] for check in checks if not check['ok']]

    def test_matching_commit_and_health_pass(self):
        checks = release.smoke(SHA, self.fetch())
        self.assertEqual(len(checks), 4)
        self.assertEqual(self.failed(checks), [])

    def test_api_answering_from_another_commit_fails(self):
        self.assertEqual(self.failed(release.smoke(SHA, self.fetch(commit='b' * 40))), ['api commit', 'web commit'])

    def test_web_bundle_from_another_commit_fails(self):
        self.assertEqual(self.failed(release.smoke(SHA, self.fetch(web_commit='c' * 40))), ['web commit'])

    def test_unhealthy_api_fails(self):
        self.assertEqual(self.failed(release.smoke(SHA, self.fetch(health='error'))), ['api health'])

    def test_unreachable_page_is_a_failed_check_not_a_crash(self):
        def fetch(path):
            raise OSError('connection refused')
        self.assertEqual(len(self.failed(release.smoke(SHA, fetch))), 4)


class RecordTests(unittest.TestCase):
    def test_record_is_stored_per_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            release.save_record(Path(tmp), passed_record())
            self.assertEqual(release.load_record(Path(tmp), SHA)['images'], IMAGES)
            self.assertIsNone(release.load_record(Path(tmp), 'b' * 40))


if __name__ == '__main__':
    unittest.main()
