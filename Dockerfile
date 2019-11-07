# Stage 1
FROM node:11-alpine as yarn-install
WORKDIR /usr/src/app
# Install app dependencies
COPY package.json yarn.lock ./
RUN apk update && \
    apk upgrade && \
    apk add --no-cache --virtual build-dependencies bash git openssh python make g++ && \
    yarn --frozen-lockfile --no-cache && \
    apk del build-dependencies && \
    yarn cache clean

# Runtime container with minimal dependencies
FROM node:11-alpine
WORKDIR /usr/src/app
COPY --from=yarn-install /usr/src/app/node_modules /usr/src/app/node_modules
# Bundle app source
COPY . .

RUN yarn build

EXPOSE 3000
CMD [ "node", "lib/index.js" ]
