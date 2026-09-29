# ---------------------------------------------------------------------------
# Stage 1 — build the static site and run the quality/security gate.
# mirror.gcr.io caches Docker Hub official images (no Hub rate limits in CI).
# Pin by digest for fully reproducible builds:  node:22-alpine@sha256:...
# ---------------------------------------------------------------------------
FROM mirror.gcr.io/library/node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY tests/validate.mjs ./tests/validate.mjs
RUN node scripts/build.mjs && node tests/validate.mjs

# ---------------------------------------------------------------------------
# Stage 2 — runtime: unprivileged nginx (uid 101), no shell tools needed.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
LABEL org.opencontainers.image.title="adrgarcia-web" \
      org.opencontainers.image.description="Adrián García Juárez — personal site" \
      org.opencontainers.image.source="https://github.com/OWNER/adrian-garcia-webpage"

USER root
# Remove the default site and any package tooling we don't need at runtime.
RUN rm -f /etc/nginx/conf.d/*.conf \
 && rm -rf /usr/share/nginx/html/* \
 && mkdir -p /etc/nginx/snippets \
 && apk --no-cache upgrade
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf nginx/csp-page.conf /etc/nginx/snippets/
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
RUN nginx -t

USER 101
EXPOSE 8080
# Cloud Run sends SIGTERM; nginx handles it via the image's STOPSIGNAL (SIGQUIT).
