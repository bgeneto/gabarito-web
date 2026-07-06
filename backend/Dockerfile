FROM node:24-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data

COPY package.json tsconfig.json drizzle.config.ts ./
RUN npm install

COPY drizzle ./drizzle
COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && npm run build

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
