# ZIPPO - ZeroEx Integrator Permission Provisioning Operator

# Dev Setup

## Set Up A Database

Set up a local postgres database, and configure `DATABASE_URL`. The simplest way is to use the included docker-compose
configuration in this repo to spin up a local postgres database for development. Run the following yarn task to start it:

```shell
yarn db:dev:start
```

This runs docker-compose to start a postgres server on port `5432`, with persistent data by mapping the postgres data
directory to the host machine. The above example would result in a `DATABASE_URL` of:

```shell
DATABASE_URL="postgresql://api:api@localhost:5432/api"
```

## Configure Environment

Once postgres is running, there are several `.env` files that need to be configured:

First is `packages/integrator-db/.env`, which only needs the single `DATABASE_URL` variable.

The second is `apps/zippo/.env` which also needs the same `DATABASE_URL` value, and can have other variables
used by zippo. See `.env.example` for details. Generally, for development, its usually ok to simply copy
`.env.example` to `.env`.

## Migrate Database

To initialize/migrate your local database, change to the `packages/integrator-db` directory and run:

```shell
yarn db:migrate
```

## Kong Bootstrap

Kong requires its own database and needs to be bootstrapped. After the postgres server is running from the previous steps,
to bootstrap the kong database, from within the `apps-node/zippo` directory, run:

```shell
yarn kong:dev:bootstrap
```

## Start Kong

The integration tests will automatically attempt to start kong, but you can start it maually with:

```shell
yarn kong:dev:start
```

# Yarn Scripts

The following yarn script can be useful during development.

`yarn dev:server` - Run a development server, watching for changes.

`yarn examples:basic` - Run the basic example client.

`yarn db:dev:start` - Start the postgres container from the docker-compose file.

`yarn kong:dev:start` - Start the kong container from the docker-compose file.

`yarn kong:dev:reset` - Reset the local kong container to an empty kong configuration.

`yarn kong:dev:configure` - Reset the local kong container to the baseline kong configuration.

# Testing

Tests are written using [jest](https://jestjs.io/docs/getting-started). There are two types of tests, unit tests and
integration tests.

Unit tests require no external dependency and can run in parallel. To run unit tests:

```shell
yarn test
```

Integration tests require a working database and a kong instance. The integration test suite expects
these to be running via `docker-compose`, and the containers will be started automatically as part of
the integration test suite, but you can also start them manually (say for dev purposes) by running:

```shell
docker-compose up -d
```

The kong integration tests use a tool called `deck` to manage the kong configuration, including resetting
the kong configuration back to a baseline configuration before each integration test. Information on
installing `deck` can be found at https://docs.konghq.com/deck/1.17.x/installation/.

To run integration tests:

```shell
yarn test:integration
```
