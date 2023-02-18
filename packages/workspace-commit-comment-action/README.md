# workspace-hash-action

A GitHub Action which comments on a commit with a list
of workspaces and their turbo hashes.

Emoji list sourced from the [GitHub API](https://api.github.com/emojis).

## Inputs

### `token`

**Optional** The Github authentication token.

default: `${{ github.token }}`

### `require-consistent-names`

**Optional** Fail if a workspace's name does not match it's top-level directory name.

default: `false`
