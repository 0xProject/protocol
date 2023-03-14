## Introduction

This is the RFQ API codebase. Today, it powers:

-   Gasless Products:
    -   Tx Relay
    -   Zero/g
    -   RFQm
-   RFQt

### Services

There are a number of services that can be run from this folder:

```bash
# run tx-relay and zero/g API
yarn dev:service:gasless_swap

# run our workers - shared across all of our gasless services
yarn dev:service:rfqm_workers
```

## Getting started

#### Pre-requirements

-   [Node.js](https://nodejs.org/en/download/) > v18.x
-   [Yarn](https://yarnpkg.com/en/) > v1.x
-   [Docker](https://www.docker.com/products/docker-desktop) > 19.x

#### Developing

1. Clone the repo.

2. Create an `.env` file and copy the content from the `.env_example` file. Defaults are defined in `config.ts`/`config.js`. The bash environment takes precedence over the `.env` file. If you run `source .env`, changes to the `.env` file will have no effect until you unset the colliding variables.

3. Install the dependencies:

    ```sh
    yarn
    ```

4. Build the project:

    ```sh
    yarn build
    ```

5. Run `docker compose up` to run the other dependencies required for the API. This uses the local `docker-compose.yml` file.

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

## Architecture

Our infrastructure relies on the following:

-   An EVM based chain with 0x v4 deployed, preferably fully-featured
-   Postgres
-   SQS
-   Redis

All of these infrastructural dependencies can be run locally and will be spun up via `docker compose up`

For a more detailed overview of our architecture, refer to: https://www.notion.so/zeroex/Tx-Relay-Architecture-51fb5b7f21b9435694de7b37e82cbe08?pvs=4

## Deployment

Use the GitHub Action

## Database

This project uses [TypeORM](https://github.com/typeorm/typeorm). It makes it easier for anyone to switch out the backing database used by this project. By default, this project uses a [PostgreSQL](https://www.postgresql.org/) database.

To add a migration, you may use the following command (prefer PascalCase):

```
yarn db:migration:create -n MyMigration
```
