"""Post the result of the CD run on the Multica card of the delivery it shipped (stub)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEADER = '[@dev_ultra_lider](mention://agent/0427564a-c9cc-494e-8ea1-592a98588251)'


def outcome(staging, production):
    return None


def delivery_of(prs):
    return None


def build_body(label, sha, pr, run_url, version=None):
    return ''


def notify(env, github=None, http=None, root=ROOT):
    return 1
