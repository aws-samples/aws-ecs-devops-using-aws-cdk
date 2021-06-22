import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

import * as base from '../../lib/template/stack/base/base-stack';
import { AppContext } from '../../lib/template/app-context';


export class EcsCommonServiceStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const ecsClusterStackName = this.commonProps.appConfig.Stack.VpcInfra.Name;
        const vpc = this.loadVpc(this.commonProps.appConfig.Stack.VpcInfra);
        const cloudMapNamespace = this.loadCloudMapNamespace(ecsClusterStackName);
        const ecsCluster = this.loadEcsCluster(ecsClusterStackName, vpc, cloudMapNamespace);

        const ecsService = this.createEcsServiceTask(ecsCluster, 256, 512);
    }

    private createEcsServiceTask(cluster: ecs.ICluster, cpu: number, memory: number): ecs.FargateService {
        const baseName = this.stackName;
        const targetServiceStackName = this.commonProps.appConfig.Stack[this.stackConfig.TargetStack].Name;

        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            cpu: cpu,
            memoryLimitMiB: memory,
        });

        const container = taskDefinition.addContainer("Container", {
            containerName: `${baseName}Container`,
            image: ecs.ContainerImage.fromAsset(this.stackConfig.AppPath),
            logging: new ecs.AwsLogDriver({
                streamPrefix: `${baseName}Log`
            }),
            environment: {
                Namespace: `${this.projectPrefix}-NS`,
                TargetServiceName: targetServiceStackName,
                AlbDnsName: this.getParameter(targetServiceStackName, 'AlbDnsName')
            }
        });

        const service = new ecs.FargateService(this, 'Service', {
            serviceName: `${baseName}Service`,
            cluster,
            taskDefinition,
            desiredCount: this.stackConfig.DesiredTasks,
            cloudMapOptions: {
                name: this.stackName,
            }
        });

        const serviceSecurityGroup = service.connections.securityGroups[0];
        const targetSecurityGroupId = this.getParameter(targetServiceStackName, 'ServiceSecurityGroupId')
        const targetSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'target-security-group', targetSecurityGroupId);
        targetSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(this.commonProps.appConfig.Stack[this.stackConfig.TargetStack].PortNumber));

        return service;
    }
}
