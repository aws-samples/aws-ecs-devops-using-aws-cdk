#!/bin/sh

# command: sh [scripts/create_base_image_in_ecr.sh] [APP_CONFIG] [REPO_NAME] [BASE_IMAGE]
# command: sh scripts/create_base_image_in_ecr.sh config/app-config-demo.json backend-base-image-repo tiangolo/uvicorn-gunicorn-fastapi:python3.7
# command: sh scripts/create_base_image_in_ecr.sh config/app-config-demo.json frontend-base-image-repo alpine:3.10

export APP_CONFIG=$1 # Configuration File Path: config/app-config-demo.json
export REPO_NAME=$2  # ECR Repo Name: base-image-xxxx-repo
export BASE_IMAGE=$3 # Base Docker Image: tiangolo/uvicorn-gunicorn-fastapi:python3.7 or alpine:3.10 or others

ACCOUNT=$(cat $APP_CONFIG | jq -r '.Project.Account') #ex> 123456789123
REGION=$(cat $APP_CONFIG | jq -r '.Project.Region') #ex> us-east-1
PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------SetAwsProfileEnv---------==
if [ -z "$PROFILE_NAME" ]; then
    echo "Project.Profile is empty, default AWS Profile is used"
else
    echo "$PROFILE_NAME AWS Profile is used"
    export AWS_PROFILE=$PROFILE_NAME
fi
echo .
echo .


echo ==--------CreateEcrRepo---------==
# Please run it only once and comment it out.
aws ecr create-repository --repository-name $REPO_NAME
echo .
echo .

echo ==--------LoginEcrRepo---------==
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com
echo .
echo .

echo ==--------PushBaseImageToEcr---------==
docker pull ${BASE_IMAGE}
docker tag ${BASE_IMAGE} ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest
docker push ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest
echo .
echo .
echo Completed
