FROM node:lts-alpine

WORKDIR /usr/app

COPY package*.json ./

RUN apk --no-cache add --virtual builds-deps build-base python openssl-dev

RUN npm install

COPY . .

EXPOSE 8081

CMD [ "node", "server.js" ]