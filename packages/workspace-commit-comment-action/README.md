# workspace-hash-action

A GitHub Action which comments on a commit with a list
of workspaces and their turbo hashes.

Emoji list sourced from the [GitHub API](https://api.github.com/emojis).

## Inputs

### `token`

**Optional** The Github authentication token.

default: `${{ github.token }}`

## Example usage

```yaml
- name: Get workspace hashes
  uses: workspace-hash-action
  with:
    dir: "apps"
    separator: "$"
```
