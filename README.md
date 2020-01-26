![alt text](https://raw.githubusercontent.com/0xProject/0x-api/master/0x-api.png "0x API")

## Table of contents
- [Getting started](#getting-started)
        - [Pre-requirements](#pre-requirements)
        - [Developing](#developing)
- [Commands](#commands)
- [Database](#database)
- [Deployment](#deployment)
- [Legal Disclaimer](#legal-disclaimer)

## Getting started

#### Pre-requirements

-   [Node.js](https://nodejs.org/en/download/) > v8.x
-   [Yarn](https://yarnpkg.com/en/) > v1.x
-   [Docker](https://www.docker.com/products/docker-desktop) > 19.x

#### Developing

To get a local development version of `0x-api` running:

1. Clone the repo.
   
2. Create an `.env` file and copy the content from the `.env_example` file. Defaults are defined in `config.ts`/`config.js`. The bash environment takes precedence over the `.env` file. If you run `source .env`, changes to the `.env` file will have no effect until you unset the colliding variables.

| Environment Variable    | Default                                      | Description                                                                                                                                                                                   |
|-------------------------|----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`CHAIN_ID`               | No default. Required.                        |  The chain id you'd like your API to run on (e.g: `1` -> mainnet, `42` -> Kovan, `3` -> Ropsten, etc...). Defaults to `42` in the API, but required for `docker-compose up`.                  |
|`ETHEREUM_RPC_URL`       | No default. Required.                        |  The URL used to issue JSON RPC requests.                                                                                                                                                     |
|`MESH_WEBSOCKET_URI`     |  `ws://localhost:60557`                      |  The url pointing to the 0x Mesh node.                                                                                                                                                        |
|`FEE_RECIPIENT_ADDRESS`  | `0x0000000000000000000000000000000000000000` |  The Ethereum address which should be specified as the fee recipient in orders your API accepts.                                                                                              |
|`MAKER_FEE_ASSET_DATA`   | `0x`                                         |  The maker fee token asset data for created 0x orders.                                                                                                                                        |
|`TAKER_FEE_ASSET_DATA`   | `0x`                                         |  The taker fee token asset data for created 0x orders.                                                                                                                                        |
|`MAKER_FEE_UNIT_AMOUNT`  | `0`                                          |  The flat maker fee amount you'd like to receive for filled orders hosted by you.                                                                                                             |
|`TAKER_FEE_UNIT_AMOUNT`  | `0`                                          |  The flat taker fee amount you'd like to receive for filled orders hosted by you.                                                                                                             |
|`POSTGRES_URI`           | `postgresql://api:api@localhost/api`         |  A URI of a running postgres instance. By default, the API will create all necessary tables.                                                                                                  |
|`WHITELIST_ALL_TOKENS`   | `false`                                      |   A boolean determining whether all tokens should be allowed to be posted.                                                                                                                    |


1. Install the dependencies:

    ```sh
    yarn
    ```

2. Build the project:

    ```sh
    yarn build
    ```


3. Run `docker-compose up` to run the other dependencies required for the API. This uses the local `docker-compose.yml` file. On start-up, the [event-pipeline](https://github.com/0xProject/0x-event-pipeline) container will crash and restart until Postgres is up.
   
4.  Start the API

    ```sh
    yarn start
    ```

    For development:
    ```sh
    yarn dev
    ```


## Testing
Run `docker-compose up` and wait for containers to start up.

Then run `yarn test`. 

## Commands

-   `yarn build` - Build the code
-   `yarn test` - Test the code (must run docker-compose first)
-   `yarn lint` - Lint the code
-   `yarn start` - Starts the API
-   `yarn dev` - Starts the API in dev-mode
-   `yarn watch` - Watch the source code and rebuild on change
-   `yarn prettier` - Auto-format the code

## Deployment

A Docker image is built and hosted by [Dockerhub](https://hub.docker.com/r/0xorg/0x-api) every time a change to the `master` branch occurs.
Running this image will run 0x API as a monolith, with all it's dependencies. With some minor configuration and refactoring, you can run the different components of the API separately.

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses a [PostgreSQL](https://www.postgresql.org/) database.


## Legal Disclaimer

The laws and regulations applicable to the use and exchange of digital assets and blockchain-native tokens, including through any software developed using the licensed work created by ZeroEx Intl. as described here (the “Work”), vary by jurisdiction. As set forth in the Apache License, Version 2.0 applicable to the Work, developers are “solely responsible for determining the appropriateness of using or redistributing the Work,” which includes responsibility for ensuring compliance with any such applicable laws and regulations.
See the Apache License, Version 2.0 for the specific language governing all applicable permissions and limitations: http://www.apache.org/licenses/LICENSE-2.0
