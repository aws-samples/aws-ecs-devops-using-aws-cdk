#!/bin/sh

# Configuration File Path
APP_CONFIG=$1

PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $APP_CONFIG
echo $PROFILE_NAME
echo .
echo .

echo ==--------ListStacks---------==
cdk list
echo .
echo .

echo ==--------DestroyStacksStepByStep---------==
cdk destroy *-EcsTaskStack --force --profile $PROFILE_NAME
cdk destroy *-EcsAlbStack --force --profile $PROFILE_NAME
cdk destroy *-VpcInfraStack --force --profile $PROFILE_NAME
echo .
echo .
