import * as base from '../../lib/template/stack/base/base-stack';
import { AppContext } from '../../lib/template/app-context';

import { EcsRepoConstrunct } from './construct/ecs-repo-const'
import { EcsInfraConstrunct } from './construct/ecs-infra-const'
import { EcsCicdConstrunct } from './construct/ecs-cicd-const'
import { EcsAlbMonitorConstrunct } from './construct/ecs-monitor-const'

export class EcsAlbServiceStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);

        const ecsClusterStackName = this.commonProps.appConfig.Stack.VpcInfra.Name;
        const vpc = this.loadVpc(this.commonProps.appConfig.Stack.VpcInfra);
        const cloudMapNamespace = this.loadCloudMapNamespace(ecsClusterStackName);
        const ecsCluster = this.loadEcsCluster(ecsClusterStackName, vpc, cloudMapNamespace);

        const repo = new EcsRepoConstrunct(this, 'EcsAlbRepoConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            stackConfig: this.stackConfig,
            appConfig: this.commonProps.appConfig
        });
        
        const infra = new EcsInfraConstrunct(this, 'EcsAlbInfraConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            stackConfig: this.stackConfig,
            appConfig: this.commonProps.appConfig,
            infraVersion: this.stackConfig.InfraVersion,
            dockerImageType: this.stackConfig.DockerImageType,
            vpc: vpc,
            cluster: ecsCluster,
            ecrRepo: repo.ecrRepo,
            internetFacing: this.stackConfig.InternetFacing,
            containerPort: this.stackConfig.PortNumber,
            dockerPath: this.stackConfig.AppPath,
            cpu: this.stackConfig.Cpu,
            memory: this.stackConfig.Memory,
            desiredTasks: this.stackConfig.DesiredTasks,
            autoscaling: this.stackConfig.AutoScalingEnable,
            minTasks: this.stackConfig.AutoScalingMinCapacity,
            maxTasks: this.stackConfig.AutoScalingMaxCapacity,
            tableName: this.stackConfig.TableName,
        });

        new EcsCicdConstrunct(this, 'EcsAlbCicdConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            stackConfig: this.stackConfig,
            appConfig: this.commonProps.appConfig,
            vpc: vpc,
            cluster: ecsCluster,
            service: infra.service,
            containerName: infra.containerName,
            appPath: this.stackConfig.AppPath,
            repo: repo.gitRepo,
            ecrRepo: repo.ecrRepo
        });

        new EcsAlbMonitorConstrunct(this, 'EcsAlbMonitorConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            stackConfig: this.stackConfig,
            appConfig: this.commonProps.appConfig,
            alb: infra.alb,
            ecsSrevice: infra.service,
            alarmThreshold: this.stackConfig.AlarmThreshold,
            subscriptionEmails: this.stackConfig.SubscriptionEmails,
            table: infra.table,
        });
    }
}
