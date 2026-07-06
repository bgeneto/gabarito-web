# Build Stage
FROM node:24-slim AS build
WORKDIR /app

COPY package.json tsconfig.json vite.config.ts ./
RUN npm install

COPY src ./src
COPY index.html ./
RUN npm run build

# Runner Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Support running as non-root user
RUN chmod -R 777 /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
