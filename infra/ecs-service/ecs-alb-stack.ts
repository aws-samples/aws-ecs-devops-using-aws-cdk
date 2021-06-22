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


        const vpc = this.loadVpc(this.commonProps.appConfig.Stack.VpcInfra);
        const cloudMapNamespace = this.loadCloudMapNamespace();
        const ecsCluster = this.loadEcsCluster(vpc, cloudMapNamespace);
        
        const infra = new EcsAlbInfraConstrunct(this, 'EcsAlbInfraConstrunct', {
            vpc: vpc,
            cluster: ecsCluster,
            stackName: this.stackName,
            infraVersion: this.stackConfig.InfraVersion,
            containerPort: this.stackConfig.PortNumber,
            dockerPath: this.stackConfig.AppPath,
            internetFacing: this.stackConfig.InternetFacing
        });

        new EcsAlbCicdConstrunct(this, 'EcsAlbCicdConstrunct', {
            vpc: vpc,
            cluster: ecsCluster,
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
