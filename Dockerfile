FROM node:22-alpine

RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

RUN apk update && \
    apk add --no-cache \
    build-base \
    make \
    g++ \
    python3 \
    yt-dlp \ 
    ffmpeg \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    librsvg-dev \
    libjpeg-turbo-dev \
    giflib-dev

COPY package.json /usr/src/bot
RUN npm install --omit=dev

COPY . /usr/src/bot

CMD ["npm", "start"]