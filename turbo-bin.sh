#!/bin/bash

# Run this script at the start of a `package.json` script that
# uses a binary not installed via the package manager:
#   "scripts": {
#     "build": "./../../turbo-bin.sh forge build",
#   }
#
# If the binary is not installed on the machine, the script exits early
# with a 0 code. If the binary is installed, then the script runs as normal.
#
# Meant to be used with `turbo-prerun.sh`. 


# Get the first argument as the command
command=$1

# Get the rest of the arguments as additional arguments to the command
args=("$@")

# Remove the first argument (the command) from the list of arguments
unset args[0]

# Use the name of the command in uppercase as the name of the environment variable
command_uppercase=$(echo $command | tr '[:lower:]' '[:upper:]')
version=$(echo TURBO_VERSION_${command_uppercase})

# If the command succeeded, write the version output to an ENV variable and run the command
if [[ -z ${!version} ]]; then
    echo "⚠️ No version found for ${command}"
    echo "⚠️ Skipping ${command} ${args[@]}"
    exit 0
else
    echo "Version for ${command} is ${!version}"
    echo "Running ${command} ${args[@]}"
    pwd
    $command "${args[@]}"
    if [[ $? -ne 0 ]]; then
        exit 1
    fi
fi
