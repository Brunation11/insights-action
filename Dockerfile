FROM node:16-alpine

ENV WORKON_HOME /root

COPY insights.js /
COPY package.json /
COPY package-lock.json /

RUN npm install
RUN npm ci --only=production

ENTRYPOINT ["node", "/insights.js"]