#!/bin/bash

# This script runs before each turbo pipeline, e.g.:
# "scripts": {
#   "build": ". ./turbo-prerun.sh && turbo run build",
# }
#
# For each binary specified at the bottom of this file,
# this script runs the `--version` command on the binary.
# If the binary is present, the output of `--version`
# is written to an environment variable.
#
# For example, if `forge` is present and the output of
# `forge --version` is `forge 0.2.0 (6157d4a 2023-02-03T00:05:03.034611Z)`,
# then the script runs
# `export `TURBO_VERSION_FORGE="forge 0.2.0 (6157d4a 2023-02-03T00:05:03.034611Z)"`.
#
# This environment variable can then be used by `turbo-bin.sh`

set_binary_version() {
    # Get the first argument as the command
    command=$1

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
        unset "TURBO_VERSION_${command_uppercase}"
        echo "No version found for ${command}"
    fi
}

# Loop through the array of binaries and call the run_binary function for each binary

########################################
# ADD MORE BINARIES BELOW AS NECESSARY #
########################################

set_binary_version forge
# set_binary_version my-other-bin
