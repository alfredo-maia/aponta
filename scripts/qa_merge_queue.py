#!/usr/bin/env python3
"""Independent QA inside the merge queue: the queue commit passes when the PR head carries the attestation."""


def pr_number(head_ref):
    return None


def queue_verdict(statuses):
    return False
