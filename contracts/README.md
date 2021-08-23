#### Development

Building solidity files will update the contract artifact in `{package-name}/generated-artifacts/{contract}.json`, but does not automatically update the `contract-artifacts` or `contract-wrappers` packages, which are generated from the artifact JSON. See `contract-artifacts/README.md` for instructions on updating these packages.
