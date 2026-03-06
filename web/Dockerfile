# web/Dockerfile

# Purpose: Production multi-stage build for React/Vite UI served by Nginx
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM nginx:alpine
# Copy custom Nginx configuration to support React Router SPA fallbacks
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Copy compiled Vite output to Nginx HTML directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]