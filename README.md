**`0x-labs` is the home of 0x's private codebase.**

# Working in the repository

## Technology

The repository relies on the following technologies:

- **[Yarn classic](https://classic.yarnpkg.com/)**: A JavaScript package manager. `0x-labs` is built on [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/).
- **[Turborepo](https://turbo.build/repo)**: Provides a caching solution to speed up workflows (`build`, `test`, etc.)

> ℹ️ Tip: the Turborepo [Monorepo Handbook](https://turbo.build/repo/docs/handbook) explains many of the concepts
> you'll want to know to work in the repository

## Remote caching

Turborepo has a [remote caching feature](https://turbo.build/repo/docs/core-concepts/remote-caching) which allows build artifacts
to be cached and shared between your local machine, other developers' machines, and CI. This means that if you've built and tested
your changes locally, they won't need to be rebuilt and retested in CI.

To enable remote caching on your machine, you'll need to be a member of the [Vercel 0x-eng team](https://vercel.com/0x-eng). Once you've
been added, run:

```bash
yarn turbo login
yarn turbo link
```

> ℹ️ Tip: after the `link` script asks "Would you like to enable Remote Caching for ~/0x-labs?", make sure to
> select the `0x-eng` team, _not_ your personal account.

## Depending on shared code

See the [Internal Packages](https://turbo.build/repo/docs/handbook/sharing-code/internal-packages) section of the Turborepo
Monorepo Handbook.

## Working with workspaces

If you're only dealing with one workspace, _and_ all its dependencies have been built,
you can `cd` into the workspace root and mostly ignore that you're in a monorepo:

```sh
cd node-apps/swap-api
yarn install
yarn build
yarn test
```

> 👆🏾 Note: Working in a specific workspace this way won't get you any of the
> caching benefits of Turborepo.

Working from the repository root allows you perform actions on some or all
workspaces.

Use [`yarn workspace <workspace_name> <command>`](https://classic.yarnpkg.com/en/docs/cli/workspace#toc-yarn-workspace)
to run a command in a specific workspace:

```bash
pwd # ~/0x-labs
yarn workspace swap-api add -D ts-node
```

Use [`yarn workspaces <command>`](https://classic.yarnpkg.com/en/docs/cli/workspaces#toc-yarn-workspaces-info)
to run a script in _every_ workspace, if it is defined:

```bash
pwd # ~/0x-labs
yarn workspaces fix
```

To perform complex actions across workspaces, we use Turborepo
[pipelines](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks).
Turborepo pipelines are cached for speed and allow dependencies between pipelines
to be specified. For example:

- "run `test` in every workspace that has one, but run `build` in each of those workspaces first"
- "`build` each workspace, but make sure `build` is first run on any [dependencies](#depending-on-shared-code) within the repository"

Pipelines are specified in `turbo.json`. Each pipeline can be run with `yarn <pipeline name>` via the
scripts defined in the root `package.json`.

For example, the `test:ci` pipeline first ensures each workspace under test has been built,
then runs the `test:ci` script in each workspace that has one defined:

```bash
pwd # ~/0x-labs
yarn test:ci # runs script `turbo run test:ci`
```

To run a Turbo pipeline on a single workspace, use the `--filter` flag:

```bash
pwd # ~/0x-labs
yarn build --filter=swap-api # Builds workspace "swap-api" and its dependencies
```

> ℹ️ Tip: The `--filter` flag has syntax to match on a number of dimensions. See
> ["Filtering Workspaces"](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
> for more.

# Structure

Code in the repository is organized into "workspaces", which are directories with a `package.json` file in the root.
Workspaces are created for logical pieces of architecture: servers, websites, shared libraries, etc., and
are _not_ organized based on team structure.

Files in the root directory contain code that either (a) applies to **all** workspaces in the repository or
(b) is necessary for repository operation. Generally, adding a new workspace should not involve any changes
to files in the root directory.

For example, if your workspace contains an `.xyz/` directory which shouldn't be included in git, then
`.xyz/*` shall be added to the `.gitignore` _in the workspace root_, not in the root `.gitignore`.

> ⚠️ Note: there may be very limited exceptions to this, such as defining a
> [specific workspace-task](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks#specific-workspace-tasks)
> in `turbo.json`. Modifying files in the root directory should only be a last resort, however.

Workspaces exist in the following directories:

- `apps-node`
- `packages`
- `sites`

## `apps-node`

Workspaces in the `apps-node` directory **have a Docker image built for each** using `.github/Dockerfile-node`.
The image is uploaded to AWS Elastic Container Registry and is tagged with both the commit hash of the commit where
the image was built and the Turborepo hash of the workspace. Either of these tags can be used in `0x-main-infra`
to specify the image to use.

If there are no changes to a workspace, then no new image is created.

As an example, a new image for `my-app` could be accessed at:

- `***.dkr.ecr.us-east-1.amazonaws.com/apps:my-app__789355d868cd646f` (Turborepo hash, note the double underscore)
- `***.dkr.ecr.us-east-1.amazonaws.com/apps:my-app_2a4810fbd3f195bf8da8c161d7d5b03e9626cd2e` (Commit hash)

> ℹ️ Tip: Click on the "Summary" section of the GitHub actions for a PR to view the built and skipped images.

## `packages`

Workspaces in `packages` contain shared code meant to be used by app and website workspaces. They do
not create any "runnable" output.

See [Depending on shared code](#Depending-on-shared-code) for more on how to use packages.

## `sites`

Workspaces in `sites` represent a type of app which will be deployed through means other than
a Docker image, most commonly Vercel or similar.

# CI & pipelines

GitHub Actions runs the following pipelines on each pull request and commit to the repository:

- `build`
- `build:no-diff`
- `test:ci`
- `lint:ci`

Each pipeline will run the corresponding script in the `package.json` of each workspace, if
it exists. To pass CI, each pipeline must finish with a `0` exit code. Additionally, the
`build:no-diff` pipeline must not produce any new build artifacts.

> ❓ FYI: There are some advanced use cases, such as auto-generating documentation, where one
> might want to run a build step and commit the output. CI will run `git diff --exit-code` after
> `build:no-diff`, which will return an exit code `1`, and thus fail CI, if `build:no-diff` produced
> outputs that were not included in the PR.

# Configuration

- The primary branch of the repository is `main`
- `main` is protected from pushes
- `main` has a linear commit history
- Commits to `main` must be [signed](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)
- Commits to `main` are accomplished by a pull request (PR)
  - PRs require an approval to submit
  - PRs require [CI](#ci--pipelines) to pass to submit
  - PRs are submitted via “Squash and Merge”. One PR will translate to one commit.
    - Commit messages should be in the form of a present-tense “action”, i.e. `Add prometheus metric for TokenPriceOracle`
    - Commit messages may be prefixed with one or more “tags” describing the portions of the codebase the commit affects, i.e. `[rfqm] Add support for BSC`
  - A [`CODEOWNERS`](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) file may be used to require PR approvals from specific people for specific sub-directories of the repository

# Creating workspaces

At the most basic level, creating a workspace is as simple as adding a directory under the appropriate
[top-level](#structure) directory and adding a `package.json`.

However, there are some conventions meant to make sure that workspaces play well with each other in
the repository:

- The workspace name (`name` field in `package.json`) matches the top-level directory name of the workspace
- The workspace version (`version` field in `package.json`) is `0.0.0`. As no workspace is published as an npm package, there is no concept of a "version".
- The workspace `private` field is set to `true` to prevent `yarn` from complaining
- Source files are located in the `src/` directory
- Test files are located in either a `test/` or `__tests__` directory, or a nested child directory thereof
- Build artifacts not committed to the repository are written to the `__build__`, `dist`, or `out` directory in the package’s top level folder

Some other things to keep in mind:

The CI runs the scripts specified in the [_CI & pipelines_](#ci--pipelines) section. If your repository needs some
special check in CI, make sure to run it as part of one of the CI checks:

```json
{
  "scripts": {
    "circular": "madge --circular --extensions ts ./",
    "lint": "eslint .",
    "format": "prettier --list-different --config .prettierrc",
    "lint:ci": "yarn circular && yarn format && yarn lint"
  }
}
```

If, for some reason, you absolutely, positively, cannot write the outputs of
your `build` script to the `__build__`, `dist`, or `out` directory, make sure to add
the build directory to the `outputs` field of the `build` pipeline in `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["__build__/**", "dist/**", "out/**", "other-build-folder/**"]
    }
  }
}
```

Alternatively, consider creating a [specific workspace-task](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks#specific-workspace-tasks).

Failure to add the directory to the turbo pipeline configuration will cause caching problems.
Specifically, if there is a cache hit on the `build` pipeline the pipeline won't run _and_ the
build artifacts won't be replayed.

> ⛔️ Warning: some 0x projects write their build outputs to `lib`. This collides with conventions
> of many frameworks (i.e. Foundry, SvelteKit, Rust). Make sure to change the build target from `lib`
> before migrating the project into `0x-labs`.

> ⛔️ Warning: adding a directory to the `turbo.json` `outputs` which contains source files in any
> workspace will make you a sad panda.

## Websites

Since Vercel is the author of Turborepo, it's no surprise that deploying websites from the
repository to Vercel is a cinch. Key points of the Vercel project settings follow:

- Set "General > Root Directory" to the workspace directory, e.g. `sites/matcha`
- In "General > Root Directory" ensure that "Include source files outside of the Root Directory in the Build Step" is checked
- Set "Git > Production Branch" to `main` (assuming you want commits to `main` to go into production)
- Set "Git > Ignored Build Step" to `npx turbo-ignore`. This causes commits to `main` which _don't_ affect your site to not trigger a new production deployment.

That's it! For more information, see the Vercel [Monorepo](https://vercel.com/docs/concepts/monorepos)
and the [Ignored Build Step](https://vercel.com/docs/concepts/projects/overview#ignored-build-step) documentation.

## Running non-node binaries

Consider the scenario where a project wishes to run Foundry tests in CI.

```json
{
  "scripts": {
    "test:ci": "forge test -vvv"
  }
}
```

The CI machine will have `forge` installed, so the test will run as expected.

Locally, developers would need `forge` installed to successfully run the
`test:ci` turbo pipeline, and this presents a problem. As the number of binaries
not installed by `yarn` increases, the developer would need to install more
and more binaries which they may not even need for the workspaces they work on.

The solution requires two steps:

1. The root `package.json` script to run each pipeline first runs `turbo-prerun.sh` (e.g. `"build": ". ./turbo-prerun.sh && turbo run build"`)
2. When a workspace `package.json` script requires an "external" binary, it is preceded
   with `turbo-bin.sh` (e.g. `"build": "./../../turbo-bin.sh forge build"`)

In the first step, the `turbo-prerun.sh` runs the `--version` command
on the binaries specified at the bottom of `turbo-prerun.sh`.
It stores the output of `<bin> --version` as the environment variable `TURBO_VERSION_<bin>`,
if the binary is present.
This variable gets specified as part of the Turbo workspace hash, which ensures that
if the local version of the binary differs from the version in CI there won't be
a false cache hit.

In the second step, `turbo-bin.sh` looks for the env variable
`TURBO_VERSION_<bin>`. If it is present, the script continues to run as normal.
If the env variable is not present, the script exits with a code `0`.

This solution allows developers not working in specialized workspaces
to still be able to run and remote cache turbo pipelines, while
the complete pipeline runs in CI and locally if the necessary binaries
are installed.

### Setup

1. Create script in workspace `package.json`
2. Add binary to `turbo-prerun.sh`
3. Create [specific workspace-task](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks#specific-workspace-tasks) with the appropriate environment variables
4. Add the binary to the CI setup

As an example, we'll add scripts requiring `forge` to a `foundry-demo` workspace:

(1) First we create a `package.json` file to name the workspace and specify the
scripts. Unfortunately, this is the only way to expose the scripts to turbo,
even if it isn't idiomatic for the language of the workspace.

Example package.json:

```json
{
  "name": "foundry-demo",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "../../turbo-bin.sh forge build",
    "test:ci": "../../turbo-bin.sh forge test"
  }
}
```

(2) Next, we add a line to the bottom of `turbo-prerun.sh` to have it
check for `forge`:

```bash
########################################
# ADD MORE BINARIES BELOW AS NECESSARY #
########################################

set_binary_version forge
```

(3) In `turbo.json`, we create workspace specific tasks which include
the environment variable for the `forge` binary. See the
[Turborepo docs: Altering Caching Based on Environment Variables](https://turbo.build/repo/docs/core-concepts/caching#altering-caching-based-on-environment-variables)
to learn more about how environment variables affect the pipeline.

```json
{
  "pipeline": {
    "foundry-demo#build": {
      "dependsOn": ["^build"],
      "outputs": ["out/**"],
      "env": ["TURBO_VERSION_FORGE"]
    },
    "foundry-demo#test:ci": {
      "dependsOn": ["build"],
      "env": ["TURBO_VERSION_FORGE"]
    }
  }
}
```

(4) In `.github/workflows/ci.yml` `build_and_test` job, ensure the binary is installed:

```yaml
- name: Add foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    version: nightly
```

# Migrating existing repositories

See the [notes in Notion](https://www.notion.so/zeroex/Repository-consolidation-d5214657110841758e49d0aa5e032e0d?pvs=4#71e18cb0c3434e40a70cd336de3b25b4).

# Troubleshooting

## End of line sequences (CLRF, LF)

While we're on the verge of creating machines who surpass humans in intelligence,
we still haven't decided upon a single method to represent the end of a line in text files.

If you're having issues running commands, or `git status` lists file changes not staged
for commit which then go away when you `git add` them to stage, then you likely have files
with line endings which don't match your OS.

For example, this output of `yarn build` indicates the incorrect line ending
in `turbo-prerun.sh`:

```bash
$ . ./turbo-prerun.sh && turbo run build
: command not foundline 2:
: command not foundline 62:
'/turbo-prerun.sh: line 63: syntax error near unexpected token `{
'/turbo-prerun.sh: line 63: `set_binary_version() {
error Command failed with exit code 1.
```

These errors also show up in the logs as `^M` at the end of lines.

To understand the problem and how to configure `git` to avoid it,
see
["CRLF vs. LF: Normalizing Line Endings in Git"](https://www.aleksandrhovhannisyan.com/blog/crlf-vs-lf-normalizing-line-endings-in-git/).

To quickly fix individual files in VSCode, run "Change End of Line Sequence" in
the command pallet.

To bulk fix files, consider [`dos2unix`](https://stackoverflow.com/a/61030524/5840249).

## Caching issues

If you suspect a problem with Turborepo caching, you can disable it with the
[`--force` flag](https://turbo.build/repo/docs/reference/command-line-reference#--force):

```bash
yarn build --force
```

# Repo maintenance

## Remote caching

Accessing the Vercel remote cache in GitHub Actions requires the secrets
`TURBO_TEAM` and `TURBO_TOKEN` to be set in GitHub. Unfortunately, the
token is tied to specific user's account. If that person leaves the Vercel "0x-eng"
organization, a new token must be generated.

See the [Turborepo GitHub Actions CI Recipe for more](https://turbo.build/repo/docs/ci/github-actions#remote-caching).
