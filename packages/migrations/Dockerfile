FROM mhart/alpine-node:12

WORKDIR /usr/src/app

RUN npm install -g ganache-cli@6.12.1

ENV MNEMONIC "concert load couple harbor equip island argue ramp clarify fence smart topic"
ENV NETWORK_ID 1337
ENV CHAIN_ID 1337
ENV VERSION "latest"
ENV SNAPSHOT_HOST "http://ganache-snapshots.0x.org.s3-website.us-east-2.amazonaws.com"
ENV SNAPSHOT_NAME "0x_ganache_snapshot"
EXPOSE 8545

CMD [ "sh", "-c", "echo downloading snapshot version: $VERSION; wget $SNAPSHOT_HOST/$SNAPSHOT_NAME-$VERSION.zip -O snapshot.zip && unzip -o snapshot.zip && ganache-cli --gasLimit 12000000 --allowUnlimitedContractSize=true --db $SNAPSHOT_NAME --noVMErrorsOnRPCResponse -p 8545 --keepAliveTimeout=40000 --networkId \"$NETWORK_ID\" --chainId \"$CHAIN_ID\" -m \"$MNEMONIC\" -h 0.0.0.0"]
