## Development

To run your Dev0x Portal app locally, make sure your project's local dependencies are installed:

```sh
yarn install
```

Afterwards, start the Remix development server like so:

```sh
yarn dev
```

Open up [http://localhost:3000](http://localhost:3000) and you should be ready to go!

## Unit tests

We use [Vitest](https://vitest.dev/)

Running tests

```sh
yarn test
```

To debug unit tests follow [https://vitest.dev/guide/debugging.html](https://vitest.dev/guide/debugging.html)

## E2E tests

We use [Playwright](https://playwright.dev/) to for e2e tests.

Make sure before first run to install Playwright dependencies

```sh
npx playwright install
```

Running tests

```sh
yarn test:e2e
```

Debug mode

```sh
PWDEBUG=1 yarn tests:e2e
```

Running tests in headed mode

```sh
yarn tests:e2e --headed
```
