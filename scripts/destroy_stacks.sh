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
if [ -z "$PROFILE_NAME" ]; then
    cdk destroy *-LoadTesterScriptStack --force
    cdk destroy *-SampleFrontendFlaskStack --force
    cdk destroy *-SampleBackendFastapiStack --force
    cdk destroy *-VpcInfraStack --force
else
    cdk destroy *-LoadTesterScriptStack --force --profile $PROFILE_NAME
    cdk destroy *-SampleFrontendFlaskStack --force --profile $PROFILE_NAME
    cdk destroy *-SampleBackendFastapiStack --force --profile $PROFILE_NAME
    cdk destroy *-VpcInfraStack --force --profile $PROFILE_NAME
fi
echo .
echo .
