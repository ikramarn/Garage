# syntax=docker/dockerfile:1
FROM node:20-alpine
ARG BUILD_ID
LABEL org.opencontainers.image.revision="${BUILD_ID}"
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 5173
ENV VITE_PROXY_TARGET=http://gateway:8080
# Build and serve static assets in production
RUN npm run build
CMD ["npx", "serve", "-s", "dist", "-l", "5173"]
