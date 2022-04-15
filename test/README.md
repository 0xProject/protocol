# Testing in 0x-rfq-api

Tests in `0x-rfq-api` are written in [Jest](https://jestjs.io/) with the
[ts-jest](https://kulshekhar.github.io/ts-jest/) plugin.

Currently, assertions are written using [Chai](https://www.chaijs.com/) with the
[chai-as-promised](https://www.chaijs.com/plugins/chai-as-promised/) plugin. However,
"expect" to migrate to [Jest expect](https://jestjs.io/docs/en/expect) in the future.

## Migrating from Mocha

The only superficial difference when writing tests is that Jest uses `beforeAll` and `afterAll`
instead of `before` and `after`.

Since we're using ts-jest, **no build is required before running the tests**. If there
are build errors, they will be caught by Jest.

## Running the tests

```bash
yarn test
```

This invokes the script `jest --forceExit --runInBand`.

`--forceExit` makes the test suite close while the dependencies shut down.
`--runInBand` runs the tests sequentially. This is necessary for the docker
service dependencies. If we can swap those for in memory versions, we should
be able to run the tests in parallel.

### Customizing your test run

View details at https://jestjs.io/docs/cli.

#### Run tests for specific files

```bash
yarn test --findRelatedTests src/services/rfqm_service.ts src/services/rfq_maker_service.ts
```

#### Testing uncommitted file changes

```bash
yarn test -o
```

#### Watch for changes

To watch for changes in all files, run `yarn test --watchAll`.

To watch for changes in uncommitted files, run `yarn test --watch`.

#### Run tests by name

Use the `-t` flag with the name of your test:

```bash
yarn test -t "RfqmService HTTP Logic"
```

#### Test by test file name

Append the file name (you can omit the extension).

```bash
yarn test rfqm_service_test
```

#### Failing fast

By default Jest will run all the tests and then exit.

To exit after the first failure, run

```bash
yarn test --bail
```

### Under the hood

First Jest fetches the configuration in `jest.config.ts`.

Next, Jest runs `test/configureTestEnv.ts` to configure the test environment.

This logic:

-   Sets the environment variables present in `test/test_env`
-   Loads chai-as-promised
-   Silences the output of the logger

If you need to see the output from the logger, change the line
`process.env.LOG_LEVEL = 'silent'` to use the log level you need
(i.e. `info`, `warn`, `error`).

## Dependencies

Dependency managment logic lives in `test/test_utils/deployment.ts`.

Services are specified in `docker-compose-test.yml`. Currently, the
available services are a Postgres database (`postgres`), Redis key-value
store (`redis`), and Ganache local blockchain (`ganache`).

To startup dependencies, use

```typescript
const teardownDependencies = await setupDependenciesAsync(['ganache', 'postgres']);
```

This will use the docker compose file to start the services specified in the
argument.

The function returns a handle to a function that will shut down the services.

### Adding a dependent service

-   Add the service to `docker-compose-test.yml`
-   Update `test/test_utils/deployment.ts` to support the dependency
    -   Update `waitForDependencyStartupAsync` with the log line that indicates that the service is up

## Writing new tests

Tests files live under the `test` directory and must end with `_test.ts`
or `Test.ts`.

Each file should have a top level `describe` block with the name of the test suite.

### Snapshot testing

Snapshot testing is a technique where, instead of making individual assertions about
a test result, you commit a "snapshot" of the test result to a file, then assert
that the test result matches the snapshot.

This can be beneficial when the result of a test is complex; for instance a large
server response.

A snapshot test can replace

```typescript
expect(appResponse.body.price).to.equal(expectedPrice);
expect(appResponse.body.type).to.equal(RfqmTypes.OtcOrder);
expect(appResponse.body.orderHash).to.match(/^0x[0-9a-fA-F]+/);
expect(appResponse.body.order.maker).to.equal(MARKET_MAKER_2_ADDR);
```

with

```typescript
expect(appResponse).toMatchSnapshot();
```

Read more at https://jestjs.io/docs/snapshot-testing
