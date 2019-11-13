# 0x-api

## Table of contents

- [Introduction](#introduction)
- [Getting started](#getting-started)
        - [Pre-requirements](#pre-requirements)
- [Commands](#commands)
- [Database](#database)
- [Deployment](#deployment)
- [Legal Disclaimer](#legal-disclaimer)

## Introduction


## Getting started

#### Pre-requirements

-   [Node.js](https://nodejs.org/en/download/) > v8.x
-   [Yarn](https://yarnpkg.com/en/) > v1.x
-   [Docker](https://www.docker.com/products/docker-desktop) > 19.x

To develop ontop of `0x-api`, follow the following instructions:

1. Clone the repo.
   
2. Create an `.env` file and copy the content from the `.env_example` file. Defaults are defined in `config.ts`/`config.js`. The bash environment takes precedence over the `.env` file. If you run `source .env`, changes to the `.env` file will have no effect until you unset the colliding variables.

    **Required**
    - `CHAIN_ID` -- the chain id you'd like your API to run on (e.g: `1` -> mainnet, `42` -> Kovan, 3 -> Ropsten, etc...). Defaults to `42` in the API, but required for `docker-compose up`.
    - `ETHEREUM_RPC_URL` -- the URL used to issue JSON RPC requests.


    **Optional**
    - `MESH_WEBSOCKET_URI` -- the url pointing to the 0x Mesh node. Defaults to `ws://localhost:60557`
    - `FEE_RECIPIENT_ADDRESS` -- The Ethereum address which should be specified as the fee recipient in orders your API accepts. Defaults to `0x0000000000000000000000000000000000000000`.
    - `MAKER_FEE_ASSET_DATA` -- The maker fee token asset data. Defaults to `0x`, i.e no fee
    - `MAKER_FEE_UNIT_AMOUNT` -- The flat maker fee amount you'd like to receive for filled orders hosted by you. Defaults to `0`
    - `MAKER_FEE_ASSET_DATA` -- The taker fee token asset data. Defaults to `0x`, i.e no fee
    - `TAKER_FEE_UNIT_AMOUNT` -- The flat taker fee you'd like to receive for filled orders hosted by you. Defaults to `0`
    - `POSTGRES_URI` -- A URI of a running postgres instance. Defaults to `postgresql://api:api@localhost/api` which is what is spun up by `docker-compose up`.
    - `WHITELIST_ALL_TOKENS` -- A boolean determining whether all tokens should be allowed to be posted.

3. Install the dependencies:

    ```sh
    yarn
    ```

4. Build the project

    ```sh
    yarn build
    ```

    or build & watch:

    ```sh
    yarn watch
    ```


5. Run `docker-compose up` to run the other dependencies required for the API. This uses the local `docker-compose.yml` file.
   
6.  Start the API

    ```sh
    yarn start
    ```

    For development:
    ```sh
    yarn dev
    ```

## Commands

-   `yarn build` - Build the code
-   `yarn lint` - Lint the code
-   `yarn start` - Starts the API
-   `yarn dev` - Starts the API in dev-mode
-   `yarn watch` - Watch the source code and rebuild on change
-   `yarn prettier` - Auto-format the code

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses a [PostgreSQL](https://www.postgresql.org/) database.

## Deployment

## Legal Disclaimer

The laws and regulations applicable to the use and exchange of digital assets and blockchain-native tokens, including through any software developed using the licensed work created by ZeroEx Intl. as described here (the “Work”), vary by jurisdiction. As set forth in the Apache License, Version 2.0 applicable to the Work, developers are “solely responsible for determining the appropriateness of using or redistributing the Work,” which includes responsibility for ensuring compliance with any such applicable laws and regulations.
See the Apache License, Version 2.0 for the specific language governing all applicable permissions and limitations: http://www.apache.org/licenses/LICENSE-2.0
