import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as loadBalancer from '@aws-cdk/aws-elasticloadbalancingv2';

import * as base from '../../../lib/template/construct/base/base-construct'

export interface EcsAlbInfraProps extends base.ConstructProps  {
    stackName: string;
    infraVersion: string;
    vpc: ec2.IVpc;
    cluster: ecs.ICluster;
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

export class EcsAlbInfraConstrunct extends base.BaseConstruct {
    table: ddb.Table;
    containerName: string;
    service: ecs.FargateService;
    alb: loadBalancer.ApplicationLoadBalancer;

    constructor(scope: cdk.Construct, id: string, props: EcsAlbInfraProps) {
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
                image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
                containerName: this.containerName,
                environment: {
                    APP_NAME: props.stackName,
                    INFRA_VERSION: props.infraVersion,
                    CONTAINER_SERVICE: 'AWS ECS',
                    Namespace: `${props.projectPrefix}-NS`,
                    TargetServiceName: targetServiceStackName != undefined ? targetServiceStackName : 'not-defined',
                    DDB_TABLE: props.tableName != undefined ? this.table.tableName : 'no-table',
                    PORT_IN: `${props.containerPort}`
                },
                logDriver: new ecs.AwsLogDriver({
                    streamPrefix: `${baseName}Log`
                }),
                enableLogging: true,
                containerPort: props.containerPort,
                taskRole: this.createTaskRole(baseName),
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
}