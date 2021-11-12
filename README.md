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

The 0x API is a collection of services and endpoints that can be run together or separately. In aggregate, the APIs provide interfaces to 0x liquidity.
Everything can be run monolithically via `yarn start` and `docker-compose` up as described in [Getting Started](#getting-started).

## Services

The API contains different services that serve a collection of HTTP or websocket endpoints and keep your order states in sync with the Ethereum state.

### HTTP Services

These are services that handle HTTP requests and responses.

| Name                                                | Path                | Run Command                                | Requires Ethereum JSON RPC Provider? | Requires Relational Database? |
| --------------------------------------------------- | ------------------- | ------------------------------------------ | ------------------------------------ | ----------------------------- |
| All HTTP Services                                   | `/*`                | `yarn start:service:http`                  | Yes                                  | Yes                           |
| [Swap](https://0x.org/docs/api#swap)                | `/swap`             | `yarn start:service:swap_http`             | Yes                                  | Yes                           |
| [Orderbook](https://0x.org/docs/api#orderbook) | `/orderbook`              | `yarn start:service:sra_http`              | No                                   | Yes                           |
| Meta Transaction Service                            | `/meta_transaction` | `yarn start:service:meta_transaction_http` | Yes                                  | Yes                           |

### Data Services

The transaction watcher ensures that the data being served is present and up-to-date by keeping the database in sync with Ethereum. The endpoints above run without it, but would be providing degraded or non-functional service.

| Name                                                          | Run Command                              | Requires Ethereum JSON RPC Provider? | Requires Relational Database? |
| ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------ | ----------------------------- |
| Transaction Watcher (monitor and broadcast meta transactions) | `yarn start:service:transaction_watcher` | Yes                                  | Yes                           |

## Getting started

#### Pre-requirements

-   [Node.js](https://nodejs.org/en/download/) > v8.x
-   [Yarn](https://yarnpkg.com/en/) > v1.x
-   [Docker](https://www.docker.com/products/docker-desktop) > 19.x

#### Developing

To get a local development version of `0x-api` running:

1. Clone the repo.

2. Create an `.env` file and copy the content from the `.env_example` file. Defaults are defined in `config.ts`/`config.js`. The bash environment takes precedence over the `.env` file. If you run `source .env`, changes to the `.env` file will have no effect until you unset the colliding variables.

| Environment Variable                   | Default                                                         | Description                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHAIN_ID`                             | Required. No default.                                           | The chain id you'd like your API to run on (e.g: `1` -> mainnet, `42` -> Kovan, `3` -> Ropsten, `1337` -> Ganache). Defaults to `42` in the API, but required for `docker-compose up`. |
| `ETHEREUM_RPC_URL`                     | Required. No default.                                           | The URL used to issue JSON RPC requests. Use `http://ganache:8545` to use the local ganache instance.                                                                                  |
| `LIQUIDITY_POOL_REGISTRY_ADDRESS`      | Optional. No default                                            | The Ethereum address of a Liquidity Provider registry. If unspecified, no Liquidity Provider is used.                                                                                  |
| `POSTGRES_URI`                         | Required. Default for dev: `postgresql://api:api@localhost/api` | A URI of a running postgres instance. By default, the API will create all necessary tables. A default instance is spun up in `docker-compose up`                                       |
| `POSTGRES_READ_REPLICA_URIS`           | Optional. No default                                            | A comma separated list of URIs of running postgres read replica instances.                                                                                                             |
| `FEE_RECIPIENT_ADDRESS`                | `0x0000000000000000000000000000000000000000`                    | The Ethereum address which should be specified as the fee recipient in orders your API accepts.                                                                                        |
| `MAKER_FEE_ASSET_DATA`                 | `0x`                                                            | The maker fee token asset data for created 0x orders.                                                                                                                                  |
| `TAKER_FEE_ASSET_DATA`                 | `0x`                                                            | The taker fee token asset data for created 0x orders.                                                                                                                                  |
| `MAKER_FEE_UNIT_AMOUNT`                | `0`                                                             | The flat maker fee amount you'd like to receive for filled orders hosted by you.                                                                                                       |
| `TAKER_FEE_UNIT_AMOUNT`                | `0`                                                             | The flat taker fee amount you'd like to receive for filled orders hosted by you.                                                                                                       |
| `WHITELIST_ALL_TOKENS`                 | `false`                                                         | A boolean determining whether all tokens should be allowed to be posted.                                                                                                               |
| `SWAP_IGNORED_ADDRESSES`               | `[]`                                                            | A comma separated list of addresses to ignore. These addresses are persisted but not used in any `/swap/*` endpoints                                                                   |
| `META_TXN_SUBMIT_WHITELISTED_API_KEYS` | `[]`                                                            | A comma separated list of whitelisted 0x API keys that can use the meta-txn /submit endpoint.                                                                                          |
| `META_TXN_RELAY_PRIVATE_KEYS`          | `[]`                                                            | A comma separated list of meta-txn relay sender private keys managed by the TransactionWatcherSignerService.                                                                           |
| `META_TXN_SIGNING_ENABLED`             | `true`                                                          | A boolean determining whether the meta-txn signs and submits transactions .                                                                                                            |
| `META_TXN_MAX_GAS_PRICE_GWEI`          | `50`                                                            | The maximum gas price (in gwei) the meta-txn service will submit a transaction at. If the gas price of the network exceeds this value then the meta-txn service will be disabled.      |
| `META_TXN_RELAY_EXPECTED_MINED_SEC`    | Default: `120`                                                  | The expected time for a meta-txn to be included in a block.                                                                                                                            |
| `ENABLE_PROMETHEUS_METRICS`            | Default: `false`                                                | A boolean determining whether to enable prometheus monitoring.                                                                                                                         |
| `PROMETHEUS_PORT`                      | Default: `8080`                                                 | The port from which prometheus metrics should be served.                                                                                                                               |
| `KAFKA_BROKERS`                        | Optional. No default.                                           | A comma separated list of Kafka broker servers                                                                                                                                         |
| `KAFKA_TOPIC_QUOTE_REPORT`             | Optional. No default                                            | The name of the Kafka topic to publish quote reports on. Setting this and `KAFKA_BROKERS` enable publirhing.                                                                           |

3. Install the dependencies:

    ```sh
    yarn
    ```

4. Build the project:

    ```sh
    yarn build
    ```

5. Run `docker-compose up` to run the other dependencies required for the API. This uses the local `docker-compose.yml` file.

6. Run the database migrations:

```
yarn db:migrate
```

7. Start the API

    ```sh
    yarn start
    ```

    For development:

    ```sh
    yarn dev
    ```

#### Developing on Ganache

To use ganache, use the `.env` file below:

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
Running this image will run 0x API as a monolith, with all its dependencies. You can run any of the [services](#services) separately by [overriding the Docker command](https://docs.docker.com/engine/reference/run/#cmd-default-command-or-options) with the service-specific command when running the container.

When versioning the API, we freeze the old version in a separate branch so that we can deploy patches, and continue to support the old version until it's officially deprecated. **Be aware when contributing fixes that you may want to apply the fix to an older version too.**

This is a list of endpoints supported by different versions of the API. If an endpoint is not on this list, it is by default pointed to the master branch.

| Endpoint(s)                         | API version branch                                      | @0x/asset-swapper branch                                       |
| ----------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `/swap/v0/`, `/meta_transaction/v0` | https://github.com/0xProject/0x-api/tree/freeze/swap-v0 | https://github.com/0xProject/0x-monorepo/tree/v0-asset-swapper |
| `/sra/v3`                           | https://github.com/0xProject/0x-api/tree/freeze/sra-v3  | N/A                                                            |

## Release

Releases are triggered automatically by the [release GitHub action](https://github.com/0xProject/0x-api/actions?query=workflow%3ARelease).
They can also be triggered manually by using `yarn release`, which requires a [GITHUB_TOKEN](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) environment variable.

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses a [PostgreSQL](https://www.postgresql.org/) database.

To add a migration, you may use the following command:

```
yarn db:migration:create -n myMigration
```

## Legal Disclaimer

The laws and regulations applicable to the use and exchange of digital assets and blockchain-native tokens, including through any software developed using the licensed work created by ZeroEx Intl. as described here (the “Work”), vary by jurisdiction. As set forth in the Apache License, Version 2.0 applicable to the Work, developers are “solely responsible for determining the appropriateness of using or redistributing the Work,” which includes responsibility for ensuring compliance with any such applicable laws and regulations.
See the Apache License, Version 2.0 for the specific language governing all applicable permissions and limitations: http://www.apache.org/licenses/LICENSE-2.0
