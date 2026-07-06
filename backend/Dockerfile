FROM node:24-slim
WORKDIR /app
RUN mkdir -p /app/data

COPY package.json tsconfig.json drizzle.config.ts ./
RUN npm install

COPY drizzle ./drizzle
COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && npm run build

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npx drizzle-kit migrate && npm run start"]
