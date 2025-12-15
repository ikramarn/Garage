# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Prefer reproducible install when lockfile present; fallback to install
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
EXPOSE 5173
ENV VITE_PROXY_TARGET=http://gateway:8080
# Build and serve static assets in production
RUN npm run build
CMD ["npx", "serve", "-s", "dist", "-l", "5173"]
