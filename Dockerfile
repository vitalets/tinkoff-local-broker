FROM node:18-alpine

ARG PORT=8080
ENV PORT $PORT

WORKDIR /app

COPY package*.json ./
RUN ([ -f ./package-lock.json ] && npm ci --only=prod || npm i --only=prod) && npm cache clean --force

ENV PATH="$PATH:./node_modules/.bin"

COPY ./dist ./dist
CMD ["node", "dist/server/start.js"]
