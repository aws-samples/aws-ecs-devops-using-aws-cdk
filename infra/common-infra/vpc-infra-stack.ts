import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as sd from '@aws-cdk/aws-servicediscovery';

import * as base from '../../lib/template/stack/base/base-stack';
import { AppContext } from '../../lib/template/app-context';


export class VpcInfraStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const vpc = this.createVpc(
            this.stackConfig.VPCName,
            this.stackConfig.VPCMaxAzs,
            this.stackConfig.VPCCIDR,
            this.stackConfig.NATGatewayCount);
        this.putVariable('VpcName', `${this.stackName}/${this.stackConfig.VPCName}`)

        const ecsCluster = this.createEcsCluster(
            this.stackConfig.ECSClusterName,
            vpc);
        this.putParameter('ECSClusterName', ecsCluster.clusterName);

        const cloudMapNamespacce = this.createCloudMapNamespace(ecsCluster);
        this.putParameter('CloudMapNamespaceName', cloudMapNamespacce.namespaceName);
        this.putParameter('CloudMapNamespaceArn', cloudMapNamespacce.namespaceArn);
        this.putParameter('CloudMapNamespaceId', cloudMapNamespacce.namespaceId);
    }

    private createVpc(baseName: string, vpcMaxAzs: number, vpcCidr: string, natGateways: number): ec2.IVpc {
        if (vpcMaxAzs > 0 && vpcCidr.length > 0) {
            const vpc = new ec2.Vpc(this, baseName,
                {
                    maxAzs: vpcMaxAzs,
                    cidr: vpcCidr,
                    natGateways: natGateways
                });
            return vpc;
        } else {
            console.error('please check the options: VPCMaxAzs, VPCCIDR, NATGateway');
            process.exit(1)
        }
    }

    private createEcsCluster(baeName: string, vpc: ec2.IVpc): ecs.Cluster {
        const cluster = new ecs.Cluster(this, baeName, {
            clusterName: `${this.projectPrefix}-${baeName}`,
            vpc: vpc,
            containerInsights: true
        });

        return cluster;
    }

    private createCloudMapNamespace(cluster: ecs.Cluster): sd.INamespace {
        const namespace = cluster.addDefaultCloudMapNamespace({
            name: `${this.projectPrefix}-NS`,
            type: sd.NamespaceType.DNS_PRIVATE
        });

        return namespace;
    }
}
