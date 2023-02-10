# tsconfig

This workspace contains a base TypeScript configuration file
which other workspaces can extend.

## Usage

In your workspace's `package.json`, add this package as a dependency:

```jsonc
{
  "dependencies": {
    "tsconfig": "*"
  }
}
```

In the workspace root `tsconfig.json`, extend the base configuration:

```jsonc
{
  "extends": "tsconfig/base.json",

  // Modify to suit your needs
  "include": ["next-env.d.ts", "special-folder/*.tsx?"]
}
```

## Resources

- [TSConfig reference](https://www.typescriptlang.org/tsconfig)
- [Turborepo TSConfig guide](https://turbo.build/repo/docs/handbook/linting/typescript)
