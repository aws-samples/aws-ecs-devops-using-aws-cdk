#!/bin/sh

# Configuration File Path
CONFIG_INFRA=$1

echo ==--------CheckDedendencies---------==
# npm install -g aws-cdk
aws --version
npm --version
cdk --version
jq --version

ACCOUNT=$(cat $CONFIG_INFRA | jq -r '.Project.Account') #ex> 123456789123
REGION=$(cat $CONFIG_INFRA | jq -r '.Project.Region') #ex> us-east-1
PROFILE_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $ACCOUNT
echo $REGION
echo $PROFILE_NAME
echo .
echo .

echo ==--------InstallCDKDependencies---------==
npm install
echo .
echo .

echo ==--------BootstrapCDKEnvironment---------==
cdk bootstrap aws://$ACCOUNT/$REGION --profile $PROFILE_NAME
echo .
echo .

