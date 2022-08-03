## ZeroEx (ExchangeProxy)

This package contains contracts for the ZeroEx extensible contract architecture.

> **_NOTE:_**  This repo is undergoing a tooling change. If adding a contract, you will need to
> add it to `compiler.json`. You can generate the entire list by running the following:
> `find . -type f -name "*.sol" | grep -v foundry | grep -v "contracts/dep" | grep -v "node_modules"`

## Installation

**Install**

```bash
npm install @0x/contracts-zero-ex --save
```

## Contributing

We strongly recommend that the community help us make improvements and determine the future direction of the protocol. To report bugs within this package, please create an issue in this repository.

For proposals regarding the 0x protocol's smart contract architecture, message format, or additional functionality, go to the [0x Improvement Proposals (ZEIPs)](https://github.com/0xProject/ZEIPs) repository and follow the contribution guidelines provided therein.

Please read our [contribution guidelines](../../CONTRIBUTING.md) before getting started.

### Install Dependencies

If you don't have yarn workspaces enabled (Yarn < v1.0) - enable them:

```bash
yarn config set workspaces-experimental true
```

Then install dependencies

```bash
yarn install
```

### Build

To build this package and all other monorepo packages that it depends on, run the following from the monorepo root directory:

```bash
PKG=@0x/contracts-zero-ex yarn build
```

Or continuously rebuild on change:

```bash
PKG=@0x/contracts-zero-ex yarn watch
```

### Clean

```bash
yarn clean
```

### Lint

```bash
yarn lint
```

### Run Tests

```bash
yarn test
```
