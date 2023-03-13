# ZIPPO - ZeroEx Integrator Permission Provisioning Operator

# Dev Setup

Note: Having a working docker installation is required.

## Database

### Start Postgres

Set up a local postgres database, and configure `DATABASE_URL`. The simplest way is to use the included docker-compose
configuration in this repo to spin up a local postgres database for development. Run the following yarn task to start
it:

```shell
yarn db:dev:start
```

This runs docker-compose to start a postgres server on port `5432`, with persistent data by mapping the postgres data
directory to the host machine. The above example would result in a `DATABASE_URL` of:

```shell
DATABASE_URL="postgresql://api:api@localhost:5432/api"
```

### Migrate Database

To initialize/migrate your local database, change to the `packages/integrator-db` directory and run:

```shell
yarn db:migrate
```

## Kong Setup

Note: The kong configuration is managed via a tool called `deck`. deck is used for establishing the baseline
configuration as well as resetting the kong configuration before each integration test. Information on
installing `deck` can be found at https://docs.konghq.com/deck/1.17.x/installation/.

### Bootstrap Kong Database

Kong requires its own database and needs to be bootstrapped once before kong will start. After the postgres server is
running from the previous steps, to bootstrap the kong database, from within the `apps-node/zippo` directory, run:

```shell
yarn kong:dev:bootstrap
```

### Start Kong

The integration tests will automatically attempt to start kong, but you can start it manually with:

```shell
yarn kong:dev:start
```

### Initialize Kong

Integration tests will automatically reset the kong configuration to the baseline configuration defined
in `kong/configs/kong_base.yml` before each test.

Outside of integration tests, to (re-)configure kong with the known baseline configuration, run:

```shell
yarn kong:dev:configure
```

or to reset kong to a blank configuration, run:

```shell
yarn kong:dev:reset
```

## Environment Configuration

Once postgres and kong are running, there are several `.env` files that need to be configured:

First is `packages/integrator-db/.env`, which only needs the single `DATABASE_URL` variable. This is used to
perform database migration operations.

The second is `apps-node/zippo/.env` which also needs the same `DATABASE_URL` value, and can have other variables
used by zippo. See `.env.example` for details. Generally, for development, it's usually ok to simply copy
`.env.example` to `.env`.

# Yarn Scripts

The following yarn script can be useful during development.

`yarn dev:server` - Run a development server, watching for changes.

`yarn examples:basic` - Run the basic example client.

`yarn db:dev:start` - Start the postgres container from the docker-compose file.

`yarn kong:dev:start` - Start the kong container from the docker-compose file.

`yarn kong:dev:reset` - Reset the local kong container to an empty kong configuration.

`yarn kong:dev:configure` - Reset the local kong container to the baseline kong configuration defined
in `kong/configs/kong_base.yml`.

# Testing

Tests are written using [jest](https://jestjs.io/docs/getting-started). There are two types of tests, unit tests and
integration tests.

Unit tests have no external dependencies (such as kong or postgres) due to the use of mocks. Unit tests make
use of the environment configuration defined in `test.env`. To run unit tests:

```shell
yarn test
```

Integration tests require access to a real postgres and kong server. See [Dev Setup](#dev-setup) for details.
Integration tests use the regular environment configuration (ie, `.env` or the existing shell environment).
To run integration tests:

```shell
yarn test:integration
```
