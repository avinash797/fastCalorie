#!/usr/bin/env bash
# PreToolUse hook: ensures git commits happen on a properly named priority branch,
# not directly on master.
set -euo pipefail

INPUT=$(cat)

# Only check on git commit commands — let everything else pass through
TOOL_INPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

if ! echo "$TOOL_INPUT" | grep -q "git commit"; then
  exit 0
fi

BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Allow commits on priority branches (p0/..., p1/..., etc.)
if echo "$BRANCH" | grep -qE '^p[0-9]+/'; then
  exit 0
fi

# Block commits on master/main
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
  cat >&2 <<'MSG'
BLOCKED: You are trying to commit directly to master/main.

Priority work MUST be on a dedicated branch:
  - Branch naming: p<N>/<short-kebab-description>  (e.g. p1/database-schema)
  - Create from master:  git checkout -b p<N>/<description> master
  - Each task = one commit, message format: P<N>: <imperative summary>

If this is a non-priority meta commit (e.g. updating CLAUDE.md), ask the user
for explicit confirmation before proceeding.
MSG
  exit 2
fi

# Any other branch — allow
exit 0
