# Checks if an image exists in ECR
# and sets the output variable image-exists to true or false

# https://stackoverflow.com/a/22010339/5840249
# {
#     aws ecr describe-images --repository-name apps --image-ids imageTag=${WORKSPACE_NAME}__${WORKSPACE_HASH} &&
#         echo "image-exists=true" >>$GITHUB_OUTPUT

# } || {
#     echo "image-exists=false" >>$GITHUB_OUTPUT
# }

cmd="aws ecr describe-images --repository-name apps --image-ids imageTag=${WORKSPACE_NAME}__${WORKSPACE_HASH}"
$cmd
status=$?

if [ $status -eq 0 ]; then
    echo "image-exists=1" >>$GITHUB_OUTPUT
else
    echo "image-exists=0" >>$GITHUB_OUTPUT
fi
