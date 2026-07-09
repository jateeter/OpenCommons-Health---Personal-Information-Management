# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Document default; actual bind port comes from PORT/APP_PORT at runtime.
EXPOSE 8080

CMD ["node", "dist/server.js"]
