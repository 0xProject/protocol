# workspace-hash-action

A GitHub Action which outputs the name and hash
of workspaces in the repository.

## Inputs

### `dir`

**Optional** Only get results from workspaces in the provided directory.
If not provided, all workspaces in the repository will be used.

### `separator`

**Optional** The separator between the workspace name and hash. Defaults
to `@`.

## Outputs

### `workspace-hashes`

A JSON stringified array the workspace names and hashes.
Example:

```
[
  workspace-hash-action@f7d2b0c9c3a382cab15e,
  api@f7d2b0c9c3a382cab15e,
]
```

## Example usage

```yaml
- name: Get workspace hashes
  uses: workspace-hash-action
  with:
    dir: "apps"
    separator: "$"
```
