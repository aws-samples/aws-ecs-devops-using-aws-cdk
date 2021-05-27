import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

import * as base from '../../lib/template/stack/base/base-stack';
import { AppContext } from '../../lib/template/app-context';

import { EcsAlbInfraConstrunct } from './ecs-alb-infra-const'
import { EcsAlbCicdConstrunct } from './ecs-alb-cicd-const'
import { EcsAlbMonitorConstrunct } from './ecs-alb-monitor-const'

export class EcsAlbStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const vpcInfraStackConfig = this.commonProps.appConfig.Stack.VpcInfra;
        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: `${vpcInfraStackConfig.Name}/${vpcInfraStackConfig.VPCName}`
        });

        const cluster = ecs.Cluster.fromClusterAttributes(this, 'ecs-cluster', {
            vpc: vpc,
            clusterName: this.getParameter('ECSClusterName'),
            securityGroups: []
        });
        
        const infra = new EcsAlbInfraConstrunct(this, 'EcsAlbInfraConstrunct', {
            vpc: vpc,
            cluster: cluster,
            stackName: this.stackName,
            infraVersion: this.stackConfig.InfraVersion,
            containerPort: this.stackConfig.PortNumber
        });

        new EcsAlbCicdConstrunct(this, 'EcsAlbCicdConstrunct', {
            vpc: vpc,
            cluster: cluster,
            stackName: this.stackName,
            service: infra.service,
            containerName: infra.containerName,
            appPath: this.stackConfig.AppPath,
            repoName: this.stackConfig.RepoName
        });

        new EcsAlbMonitorConstrunct(this, 'EcsAlbMonitorConstrunct', {
            stackName: this.stackName,
            table: infra.table,
            alb: infra.alb,
            dashboardName: this.stackConfig.DashboardName,
            ecsSrevice: infra.service
        });
    }
}
