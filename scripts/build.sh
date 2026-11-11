#!/bin/sh
# Build the site with the Zola release the templates are written for.
#
# A `zola` on PATH is not enough: Vercel pre-installs whatever the
# ZOLA_VERSION project env var names before running this script. Templates
# are only compatible within one minor release (0.23 brought Tera v2), so a
# PATH zola is used only when its major.minor matches; otherwise the pinned
# release is downloaded.
set -eu

ZOLA_PINNED="0.23.6"
ZOLA_SERIES="${ZOLA_PINNED%.*}"
ZOLA_DIR=".zola-bin"

installed_version() {
  command -v zola >/dev/null 2>&1 || return 1
  zola --version | awk '{print $2}'
}

release_target() {
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) echo "x86_64-unknown-linux-musl" ;;
    Linux-aarch64 | Linux-arm64) echo "aarch64-unknown-linux-gnu" ;;
    *) return 1 ;;
  esac
}

version="$(installed_version || true)"
case "$version" in
  "$ZOLA_SERIES" | "$ZOLA_SERIES".*)
    exec zola build "$@"
    ;;
esac

if ! target="$(release_target)"; then
  echo "zola ${ZOLA_SERIES}.x is required (found: ${version:-none})." >&2
  echo "Install it, for example: mise use zola@${ZOLA_PINNED}" >&2
  exit 1
fi

echo "Using zola ${ZOLA_PINNED} (found: ${version:-none})"
mkdir -p "$ZOLA_DIR"
curl -fsSL "https://github.com/getzola/zola/releases/download/v${ZOLA_PINNED}/zola-v${ZOLA_PINNED}-${target}.tar.gz" |
  tar xz -C "$ZOLA_DIR"
exec "$ZOLA_DIR/zola" build "$@"
