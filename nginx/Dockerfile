FROM nginx:1.28-alpine

RUN apk add --no-cache openssl

COPY default.conf /etc/nginx/conf.d/default.conf
COPY 40-self-signed-cert.sh /docker-entrypoint.d/40-self-signed-cert.sh

# A Windows checkout can add CRLF, which stops the shell from running the script
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-self-signed-cert.sh \
    && chmod +x /docker-entrypoint.d/40-self-signed-cert.sh

EXPOSE 443
