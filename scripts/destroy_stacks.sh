#!/bin/sh

# Configuration File Path
APP_CONFIG=$1

PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $APP_CONFIG
echo $PROFILE_NAME
echo .
echo .

echo ==--------SetAwsProfileEnv---------==
if [ -z "$PROFILE_NAME" ]; then
    echo "Project.Profile is empty, default AWS Profile is used"
else
    if [ -z "$ON_PIPELINE" ]; then
        echo "$PROFILE_NAME AWS Profile is used"
        export AWS_PROFILE=$PROFILE_NAME
    else
        echo "Now on CodePipeline, default AWS Profile is used"
    fi
fi
echo .
echo .

echo ==--------CDKVersionCheck---------==
alias cdk-local="./node_modules/.bin/cdk"
# npm install -g aws-cdk
cdk --version
cdk-local --version
echo .
echo .

echo ==--------ListStacks---------==
cdk-local list
echo .
echo .

echo ==--------DestroyStacksStepByStep---------==
cdk-local destroy *-LoadTesterScriptStack --force
cdk-local destroy *-SampleFrontendFlaskStack --force
cdk-local destroy *-SampleBackendFastapiStack --force
cdk-local destroy *-VpcInfraStack --force
echo .
echo .
