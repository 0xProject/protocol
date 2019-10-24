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

1. Fork this repository

2. Clone your fork of this repository

3. Open the `config.ts`/`config.js` file (depending on the language you've chosen above) and edit the whitelisted tokens:

    - `WHITELISTED_TOKENS` -- Which tokens you would like to host orderbooks for.

4. Open the `.env` file and edit the following fields. Defaults are defined in `config.ts`/`config.js`. The bash environment takes precedence over the `.env` file. If you run `source .env`, changes to the `.env` file will have no effect until you unset the colliding variables.

    - `NETWORK_ID` -- the network you'd like your relayer to run on (e.g: `1` -> mainnet, `42` -> Kovan, 3 -> Ropsten, etc...). Defaults to `42`
    - `MESH_ENDPOINT` -- the url pointing to the 0x Mesh node. Defaults to `ws://localhost:60557`
    - `FEE_RECIPIENT` -- The Ethereum address which should be specified as the fee recipient in orders your relayer accepts. Defaults to a fake address that helps the 0x core team use anonymous, already public data to understand Launch Kit developer usage. Defaults to an auto-generated address
    - `MAKER_FEE_ASSET_DATA` -- The maker fee token asset data. Defaults to `0x`, i.e no fee
    - `MAKER_FEE_UNIT_AMOUNT` -- The flat maker fee amount you'd like to receive for filled orders hosted by you. Defaults to `0`
    - `MAKER_FEE_ASSET_DATA` -- The taker fee token asset data. Defaults to `0x`, i.e no fee
    - `TAKER_FEE_UNIT_AMOUNT` -- The flat taker fee you'd like to receive for filled orders hosted by you. Defaults to `0`

[Instructions for using Launch Kit with Ganache](https://hackmd.io/-rC79gYWRyG7h6M9jUf5qA)

5. Make sure you have [Yarn](https://yarnpkg.com/en/) installed.

6. Install the dependencies:

    ```sh
    yarn
    ```

7. Build the project

    ```sh
    yarn build
    ```

    or build & watch:

    ```sh
    yarn watch
    ```

8. Run an instance of [0x Mesh](https://github.com/0xProject/0x-mesh) > v5.0.1 for v3. Docker image `0xorg/mesh:5.0.1-beta-0xv3` or greater.
   
9.  Start the relayer

    ```sh
    yarn start
    ```

## Commands

-   `yarn build` - Build the code
-   `yarn lint` - Lint the code
-   `yarn start` - Starts the relayer
-   `yarn watch` - Watch the source code and rebuild on change
-   `yarn prettier` - Auto-format the code

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses an [SQLite](https://sqlite.org/docs.html) database.

Because we want to support both Javascript and Typescript codebases, we don't use `TypeORM`'s [decorators](https://github.com/typeorm/typeorm/blob/master/docs/decorator-reference.md) (since they don't transpile nicely into readable Javascript). TypeORM shines with decorators however, so you might want to use them if you're going to be working in Typescript.

## Deployment

## Legal Disclaimer

The laws and regulations applicable to the use and exchange of digital assets and blockchain-native tokens, including through any software developed using the licensed work created by ZeroEx Intl. as described here (the “Work”), vary by jurisdiction. As set forth in the Apache License, Version 2.0 applicable to the Work, developers are “solely responsible for determining the appropriateness of using or redistributing the Work,” which includes responsibility for ensuring compliance with any such applicable laws and regulations.
See the Apache License, Version 2.0 for the specific language governing all applicable permissions and limitations: http://www.apache.org/licenses/LICENSE-2.0
