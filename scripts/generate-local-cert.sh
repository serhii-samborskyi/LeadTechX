#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAN_IP="${1:-10.0.0.211}"
CERT_DIR="$ROOT_DIR/certs"
OPENSSL_CNF="$CERT_DIR/local-openssl.cnf"
KEY_FILE="$CERT_DIR/local-key.pem"
CERT_FILE="$CERT_DIR/local-cert.pem"

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate a local HTTPS certificate."
  exit 1
fi

mkdir -p "$CERT_DIR"

cat > "$OPENSSL_CNF" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext
x509_extensions = req_ext

[dn]
CN = localhost

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = ${LAN_IP}
EOF

openssl req \
  -x509 \
  -nodes \
  -days 825 \
  -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -config "$OPENSSL_CNF" >/dev/null 2>&1

echo "Created:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"
echo
echo "Start HTTPS:"
echo "  ./restart.sh 3000 --foreground --https"
echo
echo "Open:"
echo "  https://${LAN_IP}:3000/?business_name=Chicago%20Locksmiths&website=https%3A%2F%2Fwww.chicagolocksmiths.net"
