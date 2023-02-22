# eslint-config-common

A common eslint setup for workspaces in `0x-labs`.

## Usage

Add the dependency to your `package.json`:

```jsonc
  "dependencies": {
    "eslint-config-common": "*"
  }
```

Create an `.eslintrc.js` file in your workspace root:

```js
module.exports = {
  root: true,
  extends: ["common"],
};
```

## Reference

- https://turbo.build/repo/docs/handbook/linting/eslint
