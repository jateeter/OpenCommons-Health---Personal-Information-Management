#!/usr/bin/env bash
# Issue PIM's lane certificates from the suite PKI and link them where the
# compose overlays and the host app read them (PIM#86, RealityEngine_CI#668).
#
# The suite PKI is RealityEngine_CI scripts/lib/re_pki.py: one CA per install
# (lane $RE_PKI_LANE, default native), kept under ~/.reality-engine/pki/<lane>.
# This script issues two certificates from it:
#   pim-css  PIM's Solid Community Server (server):  localhost, css.localhost, 127.0.0.1
#   pim      the PIM app (serves and calls, kind both): localhost, pim.localhost, 127.0.0.1
#            and, with --ip ADDR, the host's LAN address, for a phone reaching PIM
# and links them under PIM_TLS_DIR (default runtime/tls, gitignored):
#   ca.crt  ca.crl  css/ -> the pim-css directory  pim/ -> the pim directory
# (each directory holds chain.pem and key.pem)
#
# Usage: scripts/lane-tls-certs.sh [--ip ADDR]...
# Env:   RE_PKI       path to re_pki.py (default ../RealityEngine_CI/scripts/lib/re_pki.py)
#        PIM_TLS_DIR  where to link them (default runtime/tls)
#
# It prints the environment that turns the lane on for the host app. Nothing
# here changes a trust store; it never writes a key outside the PKI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKI="${RE_PKI:-$ROOT/../RealityEngine_CI/scripts/lib/re_pki.py}"
TLS_DIR="${PIM_TLS_DIR:-$ROOT/runtime/tls}"
extra_ips=()
while [ $# -gt 0 ]; do
  case "$1" in
    --ip) extra_ips+=("$2"); shift 2 ;;
    --ip=*) extra_ips+=("${1#*=}"); shift ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -f "$PKI" ] || { echo "the suite PKI is not at $PKI: check out RealityEngine_CI beside this repository, or set RE_PKI" >&2; exit 1; }

re() { python3 "$PKI" "$@"; }
re init >/dev/null
re renew >/dev/null
re issue pim-css --kind server --dns localhost --dns css.localhost --ip 127.0.0.1 >/dev/null
pim_args=(--kind both --dns localhost --dns pim.localhost --ip 127.0.0.1)
for ip in "${extra_ips[@]+"${extra_ips[@]}"}"; do pim_args+=(--ip "$ip"); done
re issue pim "${pim_args[@]}" >/dev/null

css_json="$(re paths pim-css)"
pim_json="$(re paths pim)"
field() { python3 -c 'import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])' "$1" "$2"; }

# Directories and files are linked whole, as localAssetStorageStack's up.js
# does: a bind mount resolves its source link, but links inside a mounted
# directory would dangle in the container.
mkdir -p "$TLS_DIR"
link() { rm -f "$2"; ln -s "$1" "$2"; }
link "$(field "$css_json" ca)" "$TLS_DIR/ca.crt"
link "$(field "$css_json" crl)" "$TLS_DIR/ca.crl"
link "$(dirname "$(field "$css_json" chain)")" "$TLS_DIR/css"
link "$(dirname "$(field "$pim_json" chain)")" "$TLS_DIR/pim"

cat <<EOF
# Lane TLS for PIM: certificates linked under $TLS_DIR
export PIM_TLS_DIR='$TLS_DIR'
export RE_TLS_CERT='$TLS_DIR/pim/chain.pem'
export RE_TLS_KEY='$TLS_DIR/pim/key.pem'
export RE_TLS_CA='$TLS_DIR/ca.crt'
export RE_TLS_CRL='$TLS_DIR/ca.crl'
EOF
