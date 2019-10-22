#!/bin/bash



# Get the first argument as the command
command=$1

# Get the rest of the arguments as additional arguments to the command
args=("$@")

# Remove the first argument (the command) from the list of arguments
unset args[0]

# Use the name of the command in uppercase as the name of the environment variable
command_uppercase=$(echo $command | tr '[:lower:]' '[:upper:]')

# If the command succeeded, write the version output to an ENV variable and run the command
if [ -v $"TURBO_VERSION_${command_uppercase}" ]; then
    echo "Version for ${command} is ${TURBO_VERSION_${command_uppercase}}"
    echo "Running ${command} ${args[@]}"
    $command "${args[@]}"
else
    echo "⚠️ No version found for ${command}"
    echo "⚠️ Skipping ${command} ${args[@]}"
    exit 0
fi
