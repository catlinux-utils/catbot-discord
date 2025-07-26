FROM node:24.4.1-alpine

RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

RUN apk update && \
    apk add --no-cache \
    make \
    g++ \
    python3 \
    yt-dlp \ 
    ffmpeg \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

COPY package.json /usr/src/bot
RUN npm install --production

COPY . /usr/src/bot

CMD ["npm", "start"]