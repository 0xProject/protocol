# Checks if an image with the tag $ECR_IMAGE_TAG exists in ECR
# and sets the output variable image-exists to true or false.

# https://stackoverflow.com/a/22010339/5840249
cmd="aws ecr describe-images --repository-name apps --image-ids imageTag=${ECR_IMAGE_TAG}"
$cmd
status=$?

if [ $status -eq 0 ]; then
    echo "image-exists=1" >>$GITHUB_OUTPUT
else
    echo "image-exists=0" >>$GITHUB_OUTPUT
fi
