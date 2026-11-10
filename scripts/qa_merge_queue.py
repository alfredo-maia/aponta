#!/usr/bin/env python3
"""Independent QA inside the merge queue.

The attestation is a commit status on the PR head, published from the QA's own approval.
The merge queue tests a commit of its own, where that status does not exist, so the required
check "Independent QA" would never report there. This job reports it: the queue commit passes
when the head of the queued PR carries a successful attestation. It runs only on merge_group,
never on pull_request, where a skipped job would count as a pass.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'dmrepositorio/aponta')
CONTEXT = 'Independent QA'


def pr_number(head_ref):
    match = re.search(r'/pr-(\d+)-', head_ref or '')
    return match.group(1) if match else None


def queue_verdict(statuses):
    """`statuses` come newest first, as the API returns them: the latest attestation decides."""
    for status in statuses:
        if status.get('context') == CONTEXT:
            return status.get('state') == 'success'
    return False


def api(path):
    return json.loads(subprocess.run(['gh', 'api', path], capture_output=True, text=True, check=True).stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--event', type=Path, required=True)
    args = parser.parse_args()
    number = pr_number((json.loads(args.event.read_text()).get('merge_group') or {}).get('head_ref'))
    if not number:
        print('ERROR: could not resolve the PR from the merge_group head_ref.', file=sys.stderr)
        return 1
    head = api('repos/' + REPOSITORY + '/pulls/' + number)['head']['sha']
    if queue_verdict(api('repos/' + REPOSITORY + '/commits/' + head + '/statuses?per_page=100')):
        print('Independent QA attested PR #' + number + ' at ' + head + '.')
        return 0
    print('ERROR: PR #' + number + ' has no successful Independent QA on its head ' + head + '.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
