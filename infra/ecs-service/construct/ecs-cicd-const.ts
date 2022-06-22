import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';

import * as base from '../../../lib/template/construct/base/base-construct'


export interface EcsCicdProps extends base.ConstructCommonProps {
    vpc: ec2.IVpc;
    cluster: ecs.ICluster;
    service: ecs.IBaseService;
    appPath: string;
    containerName: string;
    repo: codecommit.Repository;
    ecrRepo: ecr.Repository;
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
            imageFile: new codepipeline.ArtifactPath(buildOutput, `${props.appPath}/imagedefinitions.json`),
            deploymentTimeout: cdk.Duration.minutes(60)
        });

        new codepipeline.Pipeline(this, 'ECSServicePipeline', {
            pipelineName: `${props.stackName}-Pipeline`,
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

    private createBuildProject(ecrRepo: ecr.Repository, props: EcsCicdProps): codebuild.Project {
        const project = new codebuild.Project(this, 'DockerBuild', {
            projectName: `${props.stackName}DockerBuild`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2,
                computeType: codebuild.ComputeType.LARGE,
                privileged: true
            },
            environmentVariables: {
                'CLUSTER_NAME': {
                    value: `${props.cluster.clusterName}`
                },
                'ECR_REPO_URI': {
                    value: `${ecrRepo.repositoryUri}`
                },
                'CONTAINER_NAME': {
                    value: `${props.containerName}`
                },
                'APP_PATH': {
                    value: `${props.appPath}`
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
                            'echo "In Build Phase"',
                            'cd $APP_PATH',
                            'ls -l',
                            `docker build -t $ECR_REPO_URI:$TAG .`,
                            '$(aws ecr get-login --no-include-email)',
                            'docker push $ECR_REPO_URI:$TAG'
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
                        `${props.appPath}/imagedefinitions.json`
                    ]
                }
            }),
        });

        ecrRepo.grantPullPush(project.role!);

        project.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                "ecs:DescribeCluster",
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer"
            ],
            resources: [props.cluster.clusterArn],
        }));

        return project;
    }
}