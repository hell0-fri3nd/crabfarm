FROM node:24-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM node:24-slim AS builder

# Next.js writes the /ws/detections rewrite target into the build output
ARG API_URL=http://api:8000
ARG API_PREFIX=/api/v1

ENV API_URL=$API_URL \
    API_PREFIX=$API_PREFIX \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM node:24-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]
