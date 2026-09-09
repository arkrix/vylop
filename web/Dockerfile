# Stage 1: Build the React/Vite app
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve static files and proxy API/WS via Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy external nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]