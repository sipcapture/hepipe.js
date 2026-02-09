FROM node:24-alpine

WORKDIR /app

COPY hepipe.js .
COPY hep-client.js .
COPY log-client.js .
COPY esl-client.js .
COPY janus-client.js .
COPY package.json .

RUN npm install

# config.js will be passed as volume

CMD ["node", "hepipe.js"]
