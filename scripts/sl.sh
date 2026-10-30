#!/usr/bin/env bash
#
# sl.sh — run the SHOPLINE CLI with proxy variables removed.
#
# Why this exists:
#   When HTTP_PROXY / HTTPS_PROXY are set (CI containers, corporate laptops, sandboxed
#   agent environments), the CLI's HTTP client routes through the proxy and every single
#   command fails with "Request failed with status code 400" — whoami, theme list,
#   theme push, theme check alike. It looks exactly like an expired session, and
#   `sl login` does not fix it.
#
#   Diagnosis: `DEBUG=axios* sl whoami` prints the real request URL. Fetch that URL with
#   Node's fetch (which ignores proxy env vars) and it returns 200 — proving the
#   credentials are fine and the proxy is the culprit.
#
# Usage:
#   bash scripts/sl.sh whoami
#   bash scripts/sl.sh theme check --path ./theme
#   bash scripts/sl.sh theme push --theme <theme-id> --path ./theme
#
set -euo pipefail

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy \
      NO_PROXY no_proxy npm_config_proxy npm_config_https_proxy 2>/dev/null || true

if command -v sl >/dev/null 2>&1; then
  SL_BIN="sl"
elif [ -n "${SHOPLINE_CLI:-}" ] && [ -x "${SHOPLINE_CLI}" ]; then
  SL_BIN="${SHOPLINE_CLI}"
else
  echo "error: 'sl' not found on PATH." >&2
  echo "       install the SHOPLINE CLI, or set SHOPLINE_CLI=/path/to/sl" >&2
  exit 127
fi

exec "$SL_BIN" "$@"
