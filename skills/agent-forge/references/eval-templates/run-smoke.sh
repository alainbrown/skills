#!/usr/bin/env bash
# evals/run-smoke.sh — Stage 7 smoke level.
#
# Runs the produced project's plumbing checks: install, typecheck, unit/tool tests,
# and a boot smoke (one canned prompt that should trigger >=1 tool call + non-empty output).
#
# Exits 0 if every required phase passes (or skips with reason). Exits non-zero only on
# a hard failure (install/typecheck/test failure). The boot smoke skip-with-message is NOT
# a hard failure.
#
# Usage: bash evals/run-smoke.sh
set -u
set -o pipefail

# Resolve to the produced project root (the directory that contains evals/).
cd "$(dirname "$0")/.." || exit 1

# Color/no-color helpers — only emit color if stdout is a TTY.
if [ -t 1 ]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; DIM=""; RESET=""
fi
PASS="${GREEN}PASS${RESET}"; FAIL="${RED}FAIL${RESET}"; SKIP="${YELLOW}SKIP${RESET}"

FAILED=0

phase() { printf "\n%s== %s ==%s\n" "$DIM" "$1" "$RESET"; }
report() { printf "  [%s] %s\n" "$1" "$2"; }

# Pick the package manager — pnpm by default (agent-forge ships pnpm), fall back gracefully.
PM=pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v npm >/dev/null 2>&1; then PM=npm; else
    echo "${RED}No package manager found (pnpm or npm required)${RESET}"; exit 2
  fi
fi

phase "1. install"
if [ -f pnpm-lock.yaml ] && [ "$PM" = "pnpm" ]; then
  $PM install --frozen-lockfile && report "$PASS" "install (frozen-lockfile)" \
    || { report "$FAIL" "install"; FAILED=1; }
else
  $PM install && report "$PASS" "install" || { report "$FAIL" "install"; FAILED=1; }
fi

phase "2. typecheck"
if grep -q '"typecheck"' package.json 2>/dev/null; then
  $PM run typecheck && report "$PASS" "typecheck" || { report "$FAIL" "typecheck"; FAILED=1; }
else
  report "$SKIP" "typecheck (no \"typecheck\" script in package.json)"
fi

phase "3. unit and tool tests"
if grep -q '"test"' package.json 2>/dev/null; then
  $PM test && report "$PASS" "test suite" || { report "$FAIL" "test suite"; FAILED=1; }
else
  report "$SKIP" "test (no \"test\" script in package.json)"
fi

phase "4. boot smoke (>=1 tool call, non-empty output)"
# The boot smoke is `tests/smoke.test.ts` written by Stage 6 per verification.md.
# It calls the agent with a canned prompt and asserts toolCallsObserved > 0 + non-empty output.
# Skip cleanly when the harness needs an API key that isn't set in this env.
if [ -f tests/smoke.test.ts ] || [ -f tests/smoke.test.tsx ]; then
  if [ -z "${ANTHROPIC_API_KEY:-}${OPENAI_API_KEY:-}${GOOGLE_API_KEY:-}" ]; then
    report "$SKIP" "boot smoke (no API key set — export ANTHROPIC_API_KEY or equivalent to run)"
  else
    timeout 30 $PM test -- tests/smoke.test.ts 2>&1 \
      && report "$PASS" "boot smoke" \
      || { report "$FAIL" "boot smoke (see output above)"; FAILED=1; }
  fi
else
  report "$SKIP" "boot smoke (tests/smoke.test.ts not found — Stage 6 should have written it)"
fi

echo
if [ "$FAILED" -eq 0 ]; then
  printf "%sSmoke OK.%s Run \`pnpm eval:behavior\` next for the primary behavior signal.\n" "$GREEN" "$RESET"
  exit 0
else
  printf "%sSmoke failed.%s Fix the failures above before running behavior or real-model evals.\n" "$RED" "$RESET"
  exit 1
fi
