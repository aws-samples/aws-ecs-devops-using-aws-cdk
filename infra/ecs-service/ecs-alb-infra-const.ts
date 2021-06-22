import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as loadBalancer from '@aws-cdk/aws-elasticloadbalancingv2';

export interface EcsAlbInfraProps {
    stackName: string;
    vpc: ec2.IVpc;
    cluster: ecs.ICluster;
    infraVersion: string;
    containerPort: number;
    internetFacing: boolean;
    dockerPath: string;
}

export class EcsAlbInfraConstrunct extends cdk.Construct {
    table: ddb.Table;
    containerName: string;
    service: ecs.FargateService;
    alb: loadBalancer.ApplicationLoadBalancer;

    
    constructor(scope: cdk.Construct, id: string, props: EcsAlbInfraProps) {
        super(scope, id);

        this.table = new ddb.Table(this, 'table', {
            tableName: `${props.stackName}-DataTable`,
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY // not recommended for Prod
        });

        const alb = new loadBalancer.ApplicationLoadBalancer(this, `alb`, {
            // loadBalancerName: `${this.stackName}`.substr(0, 32),
            vpc: props.vpc,
            // securityGroup: albSG,
            internetFacing: props.internetFacing
        });

        const baseName = props.stackName;
        this.containerName = `${baseName}Container`
        const albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
            cluster: props.cluster,
            loadBalancer: alb,
            memoryLimitMiB: 1024,
            
            cpu: 512,
            desiredCount: 2,
            taskImageOptions: {
                // image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
                image: ecs.ContainerImage.fromAsset(props.dockerPath),
                containerName: this.containerName,
                environment: {
                    APP_NAME: props.stackName,
                    INFRA_VERSION: props.infraVersion,
                    CONTAINER_SERVICE: 'AWS ECS',
                    DDB_TABLE: this.table.tableName,
                    PORT_IN: `${props.containerPort}`
                },
                logDriver: new ecs.AwsLogDriver({
                    streamPrefix: `${baseName}Log`
                }),
                enableLogging: true,
                taskRole: this.createTaskRole(baseName),
                // executionRole: this.createExecutionRole(baseName),
                containerPort: props.containerPort
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
                // "ecr:GetAuthorizationToken",
                // "ecr:BatchCheckLayerAvailability",
                // "ecr:GetDownloadUrlForLayer",
                // "ecr:BatchGetImage",
                // "logs:CreateLogStream",
                // "logs:PutLogEvents",
                "dynamodb:*"
            ]
        }));

        return role;
    }
}