FROM node:24-slim
WORKDIR /app
RUN mkdir -p /app/data && chmod 777 /app/data

COPY package.json tsconfig.json drizzle.config.ts ./
RUN npm install

COPY src ./src
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
