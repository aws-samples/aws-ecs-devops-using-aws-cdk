import * as base from '../../lib/template/stack/base/base-stack';
import { AppContext } from '../../lib/template/app-context';

import { EcsAlbInfraConstrunct } from './construct/ecs-alb-infra-const'
import { EcsAlbCicdConstrunct } from './construct/ecs-alb-cicd-const'
import { EcsAlbMonitorConstrunct } from './construct/ecs-alb-monitor-const'

export class EcsAlbServiceStack extends base.BaseStack {

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
            internetFacing: this.stackConfig.InternetFacing,
            desiredTasks: this.stackConfig.DesiredTasks,
            autoscaling: this.stackConfig.AutoScalingEnable,
            minTasks: this.stackConfig.AutoScalingMinCapacity,
            maxTasks: this.stackConfig.AutoScalingMaxCapacity,
            tableName: this.stackConfig.TableName,
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
