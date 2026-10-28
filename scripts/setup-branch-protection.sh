#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh não encontrado. Instale o GitHub CLI e autentique com gh auth login." >&2
  exit 1
fi

REPO_JSON="$(gh repo view --json nameWithOwner,defaultBranchRef)"
OWNER_REPO="$(printf '%s' "$REPO_JSON" | jq -r '.nameWithOwner')"
DEFAULT_BRANCH="$(printf '%s' "$REPO_JSON" | jq -r '.defaultBranchRef.name')"

if [ "$DEFAULT_BRANCH" != "main" ]; then
  echo "A branch padrão é '$DEFAULT_BRANCH', não 'main'." >&2
  exit 1
fi

echo "Configurando proteção de $OWNER_REPO#$DEFAULT_BRANCH..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER_REPO/branches/$DEFAULT_BRANCH/protection" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci-success"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

gh repo edit "$OWNER_REPO" --delete-branch-on-merge

echo "Proteção aplicada. Verifique o check 'ci-success' após a primeira execução do CI."
