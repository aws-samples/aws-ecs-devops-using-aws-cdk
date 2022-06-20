/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as sd from '@aws-cdk/aws-servicediscovery'

import * as base from './ecs-base-stack';
import { AppContext } from '../../lib/template/app-context';
import { Override } from '../../lib/template/stack/base/base-stack';

import { EcsRepoConstrunct } from './construct/ecs-repo-const'
import { EcsInfraConstrunct } from './construct/ecs-infra-const'
import { EcsCicdConstrunct } from './construct/ecs-cicd-const'
import { EcsAlbMonitorConstrunct } from './construct/ecs-monitor-const'

export class EcsAlbServiceStack extends base.EcsBaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);
    }

    @Override
    onEcsPostConstructor(vpc: ec2.IVpc, cluster: ecs.ICluster, ns: sd.IPrivateDnsNamespace) {
        const repo = new EcsRepoConstrunct(this, 'EcsAlbRepoConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            env: this.commonProps.env!,
            stackConfig: this.stackConfig,
            variables: this.commonProps.variables,

            shortStackName: this.stackConfig.ShortStackName
        });
        
        const infra = new EcsInfraConstrunct(this, 'EcsAlbInfraConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            env: this.commonProps.env!,
            stackConfig: this.stackConfig,
            variables: this.commonProps.variables,

            shortStackName: this.stackConfig.ShortStackName,
            infraVersion: this.stackConfig.InfraVersion,
            dockerImageType: this.stackConfig.DockerImageType,
            vpc: vpc,
            cluster: cluster,
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
            env: this.commonProps.env!,
            stackConfig: this.stackConfig,
            variables: this.commonProps.variables,

            vpc: vpc,
            cluster: cluster,
            service: infra.service,
            containerName: infra.containerName,
            appPath: this.stackConfig.AppPath,
            repo: repo.gitRepo,
            ecrRepo: repo.ecrRepo
        });

        new EcsAlbMonitorConstrunct(this, 'EcsAlbMonitorConstrunct', {
            stackName: this.stackName,
            projectPrefix: this.projectPrefix,
            env: this.commonProps.env!,
            stackConfig: this.stackConfig,
            variables: this.commonProps.variables,
            
            alb: infra.alb,
            ecsSrevice: infra.service,
            alarmThreshold: this.stackConfig.AlarmThreshold,
            subscriptionEmails: this.stackConfig.SubscriptionEmails,
            table: infra.table,
        });
    }
}
