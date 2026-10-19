# ---- build stage ----
FROM node:26.12-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---- runtime stage ----
FROM node:26.12-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# The Solid server provisioning step (account, pod, client credentials). The
# development compose mounts it into a node image; the release bundle runs it
# from this image, so it has to be in it (RealityEngine_CI ReleaseRoadmap B2).
COPY scripts/provision-css.mjs ./scripts/provision-css.mjs

# Document default; actual bind port comes from PORT/APP_PORT at runtime.
EXPOSE 8080

# Run unprivileged, as the node image's own user. The app writes nothing under
# /app. The provisioning step writes the client credentials; its mount points
# exist here owned by node, so a fresh named volume mounted on either path is
# created writable by node (Docker seeds a new volume from the image path).
RUN mkdir -p /run/opencommons /credentials && chown node:node /run/opencommons /credentials
USER node

# /livez answers without touching the Solid server, so a slow pod never marks
# the app itself unhealthy.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/livez" >/dev/null || exit 1

CMD ["node", "dist/server.js"]
