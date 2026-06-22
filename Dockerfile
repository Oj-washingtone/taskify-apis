FROM node:18-bullseye-slim

WORKDIR /app


COPY package*.json ./


RUN npm ci --omit=dev


COPY . .


RUN mkdir -p data && chown -R node:node /app

EXPOSE 3000

USER node


CMD ["sh", "-c", "npm run migrate && npm start"]
