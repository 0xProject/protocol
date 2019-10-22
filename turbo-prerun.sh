#!/bin/bash

# This script is used to run binaries in the repo that aren't installed by
# the node package manager such as `forge` or `cargo`.
#
# For folks not working in the projects requiring those binaries,
# Turbo workflows like `build` and `test:ci` should be able to pass
# without requiring the person to install the binary.
# However, we still need these scripts to pass in CI, and if the person
# is working on a workspace with these binaries, the top-level scripts should
# run in the Turbo workflows.
#
# This script attempts to accomplish both goals:
#
# If the person does not have the binary installed, the script successfully
# exits and all other workspaces are built and tested normally.
#
# If the person does have the binary installed, then the script runs as part
# of the Turbo workflow and will succeed or fail appropriately.
#
# To determine if the binary is installed, the script runs the `--version` command
# on the binary specified in the first argument. Additionally,
# it stores the output of `<bin> --version` as the environment variable TURBO_VERSION_<bin>.
# This variable is part of the Turbo workspace hash, which ensures that
# if the local version of the binary differs from the version in CI and being
# deployed the workspace will be rebuilt and tested.
#
# Usage:
#
# Using requires a `package.json` file to name the workspace and specify the
# scripts. Unfortunately, this is the only way to expose the scripts to Turbo
# even if it isn't idomatic for the language of the workspace.
#
# Example package.json:
# {
#   "name": "foundry-demo",
#   "version": "0.0.0",
#   "private": true,
#   "scripts": {
#     "build": "../../turbo-bin.sh forge build",
#     "test:ci": "../../turbo-bin.sh forge test"
#   }
# }
#
# Additionally, the environment variable of the applicable
# binaries' versions must be specified in `turbo.json`. See the
# [Turborepo docs: Altering Caching Based on Environment Variables]
# (https://turbo.build/repo/docs/core-concepts/caching#altering-caching-based-on-environment-variables)
# {
#     ...
#   "pipeline": {
#     ...
#     "foundry-demo#build": {
#       "dependsOn": ["^build"],
#       "outputs": [
#         "out/**"
#       ],
#       "env": ["TURBO_VERSION_FORGE"]
#     },
#   }
# }

# The binaries used monorepo scripts which aren't installed
# via the package manager.
binaries=(forge)

set_binary_version() {
    # Get the first argument as the command
    command=$1

    # Get the rest of the arguments as additional arguments to the command
    args=("$@")

    # Remove the first argument (the command) from the list of arguments
    unset args[0]

    # Try to run the --version command
    version=$($command --version 2>/dev/null)
    binary_exists=$?

    # If the command succeeded, write the version output to an ENV variable and run the command
    if [ $binary_exists -eq 0 ]; then
        # Use the name of the command in uppercase as the name of the environment variable
        command_uppercase=$(echo $command | tr '[:lower:]' '[:upper:]')
        export TURBO_VERSION_${command_uppercase}="$version"
        echo "Version for ${command} was $version"
    else
        unset TURBO_VERSION_${command_uppercase}
        echo "No version found for ${command}"
    fi
}

# Loop through the array of binaries and call the run_binary function for each binary
for binary in "${binaries[@]}"; do
    set_binary_version $binary
done
