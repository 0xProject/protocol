[![Version](https://img.shields.io/github/package-json/v/0xProject/0x-api)](https://github.com/0xProject/0x-api/releases)
[![Docs](https://img.shields.io/badge/docs-website-yellow.svg)](https://0x.org/docs/api)
[![Chat with us on Discord](https://img.shields.io/badge/chat-Discord-blueViolet.svg)](https://discord.com/invite/d3FTX3M)
[![Continuous Integration](https://github.com/0xProject/0x-api/workflows/Build%20and%20Test/badge.svg)](https://github.com/0xProject/0x-api/actions?query=workflow%3A%22Build+and+Test%22+branch%3Amaster)

![alt text](https://raw.githubusercontent.com/0xProject/0x-api/master/0x-api.png '0x API')

## Table of contents

-   [Introduction](#introduction)
-   [Services](#services)
    -   [HTTP Services](#http-services)
    -   [Data Services](#data-services)
-   [Getting started](#getting-started)
    -   [Pre-requirements](#pre-requirements)
    -   [Developing](#developing)
-   [Commands](#commands)
-   [Database](#database)
-   [Deployment](#deployment)
-   [Release](#release)
-   [Legal Disclaimer](#legal-disclaimer)

## Introduction

The 0x API is a collection of services and endpoints that can be run together or separately. In aggregate, the APIs provide interfaces to 0x liquidity, 0x staking data and more.
Everything can be run monolithically via `yarn start` and `docker-compose` up as described in [Getting Started](#getting-started).

## Services

The API contains different services that serve a collection of HTTP or websocket endpoints and keep your database in sync with [0x Mesh](https://github.com/0xProject/0x-mesh) and Ethereum state.

### HTTP Services

These are services that handle HTTP requests and responses.

| Name                                                | Path                | Run Command                                | Requires [0x Mesh](https://github.com/0xProject/0x-mesh)? | Requires Ethereum JSON RPC Provider? | Requires Relational Database? |
| --------------------------------------------------- | ------------------- | ------------------------------------------ | --------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| All HTTP Services                                   | `/*`                | `yarn start:service:http`                  | Yes                                                       | Yes                                  | Yes                           |
| [Swap](https://0x.org/docs/api#swap)                | `/swap`             | `yarn start:service:swap_http`             | Yes                                                       | Yes                                  | Yes                           |
| [Standard Relayer API](https://0x.org/docs/api#sra) | `/sra`              | `yarn start:service:sra_http`              | Yes                                                       | No                                   | Yes                           |
| Staking (Not Public)                                | `/staking`          | `yarn start:service:staking_http`          | No                                                        | No                                   | Yes                           |
| Meta Transaction Service                            | `/meta_transaction` | `yarn start:service:meta_transaction_http` | No                                                        | Yes                                  | Yes                           |

### Data Services

These are services that make sure the data being served is present and up-to-date by keeping the database in sync with [0x Mesh](https://github.com/0xProject/0x-mesh) and Ethereum. With the exception of the Staking HTTP service, which has a hard dependency on the [Staking Event Pipeline](https://github.com/0xProject/0x-event-pipeline), the endpoints above run without these services, but would be providing degraded or non-functional service. There is nothing stateful about 0x API -- all the data comes from [0x Mesh](https://github.com/0xProject/0x-mesh) or the Ethereum blockchain.

| Name                                                                     | Run Command                              | Requires [0x Mesh](https://github.com/0xProject/0x-mesh)? | Requires Ethereum JSON RPC Provider? | Requires Relational Database? |
| ------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| Order Watcher (keep database in sync with Mesh)                          | `yarn start:service:order_watcher`       | Yes                                                       | No                                   | Yes                           |
| [Staking Event Pipeline](https://github.com/0xProject/0x-event-pipeline) | `docker run 0xorg/event-pipeline:latest` | No                                                        | Yes                                  | Yes                           |
| Transaction Watcher (monitor and broadcast meta transactions)            | `yarn start:service:transaction_watcher` | No                                                        | Yes                                  | Yes                           |

## Getting started

#### Pre-requirements

-   [Node.js](https://nodejs.org/en/download/) > v8.x
-   [Yarn](https://yarnpkg.com/en/) > v1.x
-   [Docker](https://www.docker.com/products/docker-desktop) > 19.x

#### Developing

To get a local development version of `0x-api` running:

1. Clone the repo.

2. Create an `.env` file and copy the content from the `.env_example` file. Defaults are defined in `config.ts`/`config.js`. The bash environment takes precedence over the `.env` file. If you run `source .env`, changes to the `.env` file will have no effect until you unset the colliding variables.

| Environment Variable                   | Default                                                         | Description                                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHAIN_ID`                             | Required. No default.                                           | The chain id you'd like your API to run on (e.g: `1` -> mainnet, `42` -> Kovan, `3` -> Ropsten, `1337` -> Ganache). Defaults to `42` in the API, but required for `docker-compose up`.                    |
| `ETHEREUM_RPC_URL`                     | Required. No default.                                           | The URL used to issue JSON RPC requests. Use `http://ganache:8545` to use the local ganache instance.                                                                                                     |
| `MESH_WEBSOCKET_URI`                   | Required. Default for dev: `ws://localhost:60557`               | The URL pointing to the 0x Mesh node. A default node is spun up in `docker-compose up`                                                                                                                    |
| `MESH_HTTP_URI`                        | Optional. No default                                            | The URL pointing to the Mesh node's HTTP JSON-RPC endpoint. Used for syncing the orderbook. If not provided, will fallback to websocket connection. A default Mesh node is spun up in `docker-compose up` |
| `LIQUIDITY_POOL_REGISTRY_ADDRESS`      | Optional. No default                                            | The Ethereum address of a Liquidity Provider registry. If unspecified, no Liquidity Provider is used.                                                                                                     |
| `POSTGRES_URI`                         | Required. Default for dev: `postgresql://api:api@localhost/api` | A URI of a running postgres instance. By default, the API will create all necessary tables. A default instance is spun up in `docker-compose up`                                                          |
| `FEE_RECIPIENT_ADDRESS`                | `0x0000000000000000000000000000000000000000`                    | The Ethereum address which should be specified as the fee recipient in orders your API accepts.                                                                                                           |
| `MAKER_FEE_ASSET_DATA`                 | `0x`                                                            | The maker fee token asset data for created 0x orders.                                                                                                                                                     |
| `TAKER_FEE_ASSET_DATA`                 | `0x`                                                            | The taker fee token asset data for created 0x orders.                                                                                                                                                     |
| `MAKER_FEE_UNIT_AMOUNT`                | `0`                                                             | The flat maker fee amount you'd like to receive for filled orders hosted by you.                                                                                                                          |
| `TAKER_FEE_UNIT_AMOUNT`                | `0`                                                             | The flat taker fee amount you'd like to receive for filled orders hosted by you.                                                                                                                          |
| `WHITELIST_ALL_TOKENS`                 | `false`                                                         | A boolean determining whether all tokens should be allowed to be posted.                                                                                                                                  |
| `MESH_IGNORED_ADDRESSES`               | `[]`                                                            | A comma seperated list of addresses to ignore. These addresses are ignored at the ingress (Mesh) layer and are never persisted                                                                            |
| `SWAP_IGNORED_ADDRESSES`               | `[]`                                                            | A comma seperated list of addresses to ignore. These addresses are persisted but not used in any `/swap/*` endpoints                                                                                      |
| `PINNED_POOL_IDS`                      | `[]`                                                            | A comma seperated list of pool IDs whose MMers orders will be pinned to the Mesh node. This makes them immune to spam attacks.                                                                            |
| `PINNED_MM_ADDRESSES`                  | `[]`                                                            | A comma seperated list of MMer addresses whose orders will be pinned to the Mesh node. This makes them immune to spam attacks.                                                                            |
| `WHITELISTED_API_KEYS_META_TXN_SUBMIT` | `[]`                                                            | A comma seperated list of whitelisted 0x API keys that can use the meta-txn /submit endpoint.                                                                                                             |
| `META_TXN_RELAY_PRIVATE_KEYS`          | `[]`                                                            | A comma seperated list of meta-txn relay sender private keys managed by the TransactionWatcherSignerService.                                                                                              |
| `META_TXN_RELAY_EXPECTED_MINED_SEC`    | Default: `120`                                                  | The expected time for a meta-txn to be included in a block.                                                                                                                                               |
| `ENABLE_PROMETHEUS_METRICS`            | Default: `false`                                                | A boolean determining whether to enable prometheus monitoring.                                                                                                                                            |
| `PROMETHEUS_PORT`                      | Default: `8080`                                                 | The port from which prometheus metrics should be served.                                                                                                                                                  |

3. Install the dependencies:

    ```sh
    yarn
    ```

4. Build the project:

    ```sh
    yarn build
    ```

5) Run `docker-compose up` to run the other dependencies required for the API. This uses the local `docker-compose.yml` file. On start-up, the [event-pipeline](https://github.com/0xProject/0x-event-pipeline) container will crash and restart until Postgres is up. If you switch `CHAIN_ID` after a prior run, you will have to `rm -rf 0x_mesh postgres` to delete the volumes containing stale data.

6) Start the API

    ```sh
    yarn start
    ```

    For development:

    ```sh
    yarn dev
    ```

#### Developing on Ganache

Ganache is supported, but will not contain the same staking data and 0x Mesh liquidity that kovan or mainnet have for example. To use ganache, use the `.env` file below:

```
CHAIN_ID=1337
ETHEREUM_RPC_URL=http://ganache:8545
```

Then run

```
$ docker-compose up
$ yarn dev
```

## Testing

Run `yarn test`. It's really that easy :)

Tip: Test suites set up and teardown sandboxed environments, so using `.only` on `it` and `describe` statements will save lots of development time.

## Commands

-   `yarn build` - Build the code
-   `yarn test` - Test the code
-   `yarn lint` - Lint the code
-   `yarn start` - Starts the API
-   `yarn dev` - Starts the API in dev-mode
-   `yarn watch` - Watch the source code and rebuild on change
-   `yarn prettier` - Auto-format the code
-   `yarn release` - Release a new version of the 0x-api

## Deployment

A Docker image is built and hosted by [Dockerhub](https://hub.docker.com/r/0xorg/0x-api) every time a change to the `master` branch occurs. A Docker image is built, pushed and [tagged](https://hub.docker.com/r/0xorg/0x-api/tags) when a new version is [released](https://github.com/0xProject/0x-api/releases) as well.
Running this image will run 0x API as a monolith, with all it's dependencies. You can run any of the [services](#services) separately by [overriding the Docker command](https://docs.docker.com/engine/reference/run/#cmd-default-command-or-options) with the service-specific command when running the container.

## Release

Releases are triggered automatically by the [release GitHub action](https://github.com/0xProject/0x-api/actions?query=workflow%3ARelease).
They can also be triggered manually by using `yarn release`, which requires a [GITHUB_TOKEN](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) environment variable.

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses a [PostgreSQL](https://www.postgresql.org/) database.

## Legal Disclaimer

The laws and regulations applicable to the use and exchange of digital assets and blockchain-native tokens, including through any software developed using the licensed work created by ZeroEx Intl. as described here (the “Work”), vary by jurisdiction. As set forth in the Apache License, Version 2.0 applicable to the Work, developers are “solely responsible for determining the appropriateness of using or redistributing the Work,” which includes responsibility for ensuring compliance with any such applicable laws and regulations.
See the Apache License, Version 2.0 for the specific language governing all applicable permissions and limitations: http://www.apache.org/licenses/LICENSE-2.0
