#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/certs
THIRTY_DAYS=2592000

host=${WEB_ORIGIN#*://}
host=${host%%/*}
host=${host%:*}

if echo "$host" | grep -Eq '^[0-9.]+$'; then
    san="DNS:localhost,IP:127.0.0.1,IP:$host"
else
    san="DNS:localhost,IP:127.0.0.1,DNS:$host"
fi

mkdir -p "$CERT_DIR"

# Reused while it still fits, so devices that already trust it keep working across restarts
if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/key.pem" ] \
    && [ "$(cat "$CERT_DIR/san" 2>/dev/null)" = "$san" ] \
    && openssl x509 -checkend "$THIRTY_DAYS" -noout -in "$CERT_DIR/cert.pem" >/dev/null; then
    exit 0
fi

# 825 days is the longest validity iPhones accept
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 \
    -subj "/CN=$host" \
    -addext "subjectAltName=$san" \
    -addext "extendedKeyUsage=serverAuth" \
    -keyout "$CERT_DIR/key.pem" \
    -out "$CERT_DIR/cert.pem" 2>/dev/null

chmod 600 "$CERT_DIR/key.pem"
printf '%s' "$san" > "$CERT_DIR/san"
echo "Created a self-signed certificate for $san"
