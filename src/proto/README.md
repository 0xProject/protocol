# Proto

This directory contains protobuf definitions used in 0x API.

## Service-to-service stack

0x API uses the Twirp framework for service-to-service communication. Twirp
is a lightweight RPC framework built on top of Protocol Buffers and created
by Twitch. Twirp is similar to [gRPC](https://grpc.io/), but without some
peripheral features like authentication.

To generate TypeScript definitions from `proto` files, 0x API uses TwirpScript,
a TypeScript-native implementation of Twirp.

## Creating + modifying protos

Add or modify files in this directory and run `yarn build:proto`. This script
runs the `twirpscript` binary, which requires the [protobuf compiler](https://github.com/protocolbuffers/protobuf/). Follow the directions in the output of
`yarn build:proto` to install it.

TwirpScript builds TypeScript definitions and places them in `src/proto-ts`. Files
in `src/proto-ts` shall not be modified by hand.

### A note on build methodology

Since `proto`s are not modified frequently and to prevent requiring all developers
to install the protobuf compiler, commit the output files in `src/proto-ts` and
include them in your PR when creating or modifying a proto.

If you modify a `proto` and do not commit the output, CI will fail.

## References

-   [Language Guide (proto3)](https://developers.google.com/protocol-buffers/docs/proto3#importing_definitions)
-   [Twirp](https://twitchtv.github.io/twirp/docs/intro.html)
-   [TwirpScript](https://github.com/tatethurston/TwirpScript)
