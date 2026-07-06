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

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
