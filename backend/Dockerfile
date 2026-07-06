FROM node:24-slim
WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
