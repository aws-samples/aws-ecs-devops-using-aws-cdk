import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as loadBalancer from '@aws-cdk/aws-elasticloadbalancingv2';

import * as base from '../../../lib/template/construct/base/base-construct'

export interface EcsInfraProps extends base.ConstructProps  {
    stackName: string;
    infraVersion: string;
    vpc: ec2.IVpc;
    cluster: ecs.ICluster;
    dockerImageType: string;
    ecrRepo?: ecr.Repository;
    containerPort: number;
    internetFacing: boolean;
    dockerPath: string;
    memory: number;
    cpu: number
    desiredTasks: number;
    autoscaling: boolean;
    minTasks: number;
    maxTasks: number;
    tableName?: string;
}

export class EcsInfraConstrunct extends base.BaseConstruct {
    table: ddb.Table;
    containerName: string;
    service: ecs.FargateService;
    alb: loadBalancer.ApplicationLoadBalancer;

    constructor(scope: cdk.Construct, id: string, props: EcsInfraProps) {
        super(scope, id, props);

        if (props.tableName != undefined) {
            this.table = new ddb.Table(this, 'table', {
                tableName: `${props.stackName}-${props.tableName}`,
                partitionKey: {
                    name: 'id',
                    type: ddb.AttributeType.STRING
                },
                removalPolicy: cdk.RemovalPolicy.DESTROY // not recommended for Prod
            });
        }

        const alb = new loadBalancer.ApplicationLoadBalancer(this, `alb`, {
            loadBalancerName: `${props.stackName}`.substr(0, 32),
            vpc: props.vpc,
            internetFacing: props.internetFacing
        });

        let targetServiceStackName = undefined;
        if (this.stackConfig.TargetStack != undefined) {
            targetServiceStackName = props.appConfig.Stack[this.stackConfig.TargetStack].Name;
        }

        const baseName = props.stackName;
        this.containerName = `${baseName}Container`
        const albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
            loadBalancer: alb,
            cluster: props.cluster,

            desiredCount: props.desiredTasks,
            cpu: props.cpu,
            memoryLimitMiB: props.memory,
            taskImageOptions: {
                image: this.getContainerImage(props),
                containerName: this.containerName,
                environment: {
                    APP_NAME: props.stackName,
                    INFRA_VERSION: props.infraVersion,
                    CONTAINER_SERVICE: 'AWS ECS',
                    DDB_TABLE: props.tableName != undefined ? this.table.tableName : 'no-table',
                    PORT_IN: `${props.containerPort}`,
                    Namespace: `${props.projectPrefix}-NS`,
                    TargetServiceName: targetServiceStackName != undefined ? targetServiceStackName : 'not-defined'
                },
                logDriver: new ecs.AwsLogDriver({
                    streamPrefix: `${baseName}Log`
                }),
                enableLogging: true,
                containerPort: props.containerPort,
                taskRole: this.createTaskRole(baseName),
                executionRole: this.createExecutionRole(baseName)
            },
            cloudMapOptions: {
                name: props.stackName,
            },
            circuitBreaker: {
                rollback: true
            },
        });
        this.service = albFargateService.service;
        this.alb = albFargateService.loadBalancer;

        this.putParameter('AlbDnsName', albFargateService.loadBalancer.loadBalancerDnsName);
        this.putParameter('ServiceSecurityGroupId', this.service.connections.securityGroups[0].securityGroupId);

        if (targetServiceStackName != undefined) {
            const serviceSecurityGroup = this.service.connections.securityGroups[0];
            const targetSecurityGroupId = this.getParameter(targetServiceStackName, 'ServiceSecurityGroupId')
            const targetSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'target-security-group', targetSecurityGroupId);
            targetSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(props.appConfig.Stack[this.stackConfig.TargetStack].PortNumber));
        }
    }

    private getContainerImage(props: EcsInfraProps): ecs.ContainerImage {
        if (props.dockerImageType == 'HUB') {
            return ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample");
        } else if (props.dockerImageType == 'ECR') {
            return ecs.ContainerImage.fromEcrRepository(props.ecrRepo!);
        } else {
            return ecs.ContainerImage.fromAsset(props.dockerPath);
        }
    }

    private createTaskRole(baseName: string): iam.Role {
        const role = new iam.Role(this, `TaskRole`, {
            roleName: `${baseName}TaskRole`,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
                "dynamodb:Scan",
                "dynamodb:PutItem",
            ]
        }));

        return role;
    }

    private createExecutionRole(baseName: string): iam.Role {
        const role = new iam.Role(this, `ExecutionRole`, {
            roleName: `${baseName}ExecutionRole`,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ]
        }));
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ]
        }));

        return role;
    }
}