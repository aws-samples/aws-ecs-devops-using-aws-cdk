/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';

import * as base from '../../../lib/template/construct/base/base-construct'


export interface EcsCicdProps extends base.ConstructCommonProps {
    service: ecs.IBaseService;
    containerName: string;
    repo: codecommit.IRepository;
    ecrRepo: ecr.IRepository;
    appPath?: string;
    dockerfileName?: string;
    buildCommands?: string[];
    enableKeyRotation?: boolean
}

export class EcsCicdConstrunct extends base.BaseConstruct {

    constructor(scope: Construct, id: string, props: EcsCicdProps) {
        super(scope, id, props);

        const sourceOutput = new codepipeline.Artifact();
        const sourceAction = new actions.CodeCommitSourceAction({
            actionName: 'CodeCommit_SourceMerge',
            repository: props.repo,
            output: sourceOutput,
            branch: 'master'
        })
        
        const buildOutput = new codepipeline.Artifact();
        const buildAction = new actions.CodeBuildAction({
            actionName: 'CodeBuild_DockerBuild',
            project: this.createBuildProject(props.ecrRepo, props),
            input: sourceOutput,
            outputs: [buildOutput],
        });

        const approvalAction = new actions.ManualApprovalAction({
            actionName: 'Manual_Approve',
        });

        const deployAction = new actions.EcsDeployAction({
            actionName: 'ECS_ContainerDeploy',
            service: props.service,
            imageFile: new codepipeline.ArtifactPath(buildOutput, ( props.appPath ? `${props.appPath}/imagedefinitions.json` : 'imagedefinitions.json')),
            deploymentTimeout: cdk.Duration.minutes(60)
        });

        new codepipeline.Pipeline(this, 'ECSServicePipeline', {
            pipelineName: `${props.stackName}-Pipeline`,
            enableKeyRotation: props.enableKeyRotation ? props.enableKeyRotation : true,
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build',
                    actions: [buildAction],
                },
                {
                    stageName: 'Approve',
                    actions: [approvalAction],
                },
                {
                    stageName: 'Deploy',
                    actions: [deployAction],
                }
            ]
        });
    }

    private createBuildProject(ecrRepo: ecr.IRepository, props: EcsCicdProps): codebuild.Project {
        const buildCommandsBefore = [
            'echo "In Build Phase"',
            'cd $APP_PATH',
            'ls -l',
        ];
        const buildCommandsAfter = [
            '$(aws ecr get-login --no-include-email)',
            `docker build -f ${props.dockerfileName ? props.dockerfileName : 'Dockerfile'} -t $ECR_REPO_URI:$TAG .`,
            'docker push $ECR_REPO_URI:$TAG'
        ];

        const appPath = props.appPath ? `${props.appPath}` : '.';

        const project = new codebuild.Project(this, 'DockerBuild', {
            projectName: `${props.stackName}DockerBuild`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
                computeType: codebuild.ComputeType.SMALL,
                privileged: true
            },
            environmentVariables: {
                'ECR_REPO_URI': {
                    value: `${ecrRepo.repositoryUri}`
                },
                'CONTAINER_NAME': {
                    value: `${props.containerName}`
                },
                'APP_PATH': {
                    value: appPath
                }
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    pre_build: {
                        commands: [
                            'echo "In Pre-Build Phase"',
                            'export TAG=latest',
                            'echo $TAG'
                        ]
                    },
                    build: {
                        commands: [
                            ...buildCommandsBefore,
                            ...(props.buildCommands ? props.buildCommands : []),
                            ...buildCommandsAfter
                        ]
                    },
                    post_build: {
                        commands: [
                            'echo "In Post-Build Phase"',
                            'pwd',
                            "printf '[{\"name\":\"%s\",\"imageUri\":\"%s\"}]' $CONTAINER_NAME $ECR_REPO_URI:$TAG > imagedefinitions.json",
                            "pwd; ls -al; cat imagedefinitions.json"
                        ]
                    }
                },
                artifacts: {
                    files: [
                        `${appPath}/imagedefinitions.json`
                    ]
                }
            }),
        });

        ecrRepo.grantPullPush(project.role!);
        this.appendEcrReadPolicy('build-policy', project.role!);

        return project;
    }

    private appendEcrReadPolicy(baseName: string, role: iam.IRole) {
        const statement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ]
        });

        const policy = new iam.Policy(this, baseName);
        policy.addStatements(statement);

        role.attachInlinePolicy(policy);
    }
}