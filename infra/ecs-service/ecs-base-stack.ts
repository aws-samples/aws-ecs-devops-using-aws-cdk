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
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sd from 'aws-cdk-lib/aws-servicediscovery'

import * as base from '../../lib/template/stack/vpc/vpc-base-stack';
import { AppContext } from '../../lib/template/app-context';
import { Override } from '../../lib/template/stack/base/base-stack';


export abstract class EcsBaseStack extends base.VpcBaseStack {
    private commonVpc: ec2.IVpc;
    private ecsCluster: ecs.ICluster;
    private cloudMapNamespace: sd.IPrivateDnsNamespace;

    abstract onEcsPostConstructor(vpc: ec2.IVpc, cluster: ecs.ICluster, ns: sd.IPrivateDnsNamespace): void;

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);
    }

    @Override
    onLookupLegacyVpc(): base.VpcLegacyLookupProps | undefined {
        return {
            vpcNameLegacy: this.getVariable('VpcName')
        };
    }

    @Override
    onPostConstructor(baseVpc?: ec2.IVpc) {
        const ecsClusterName = this.getParameter('ECSClusterName');
        
        this.commonVpc = baseVpc!;
        this.cloudMapNamespace = this.loadCloudMapNamespace();
        this.ecsCluster = this.loadEcsCluster(ecsClusterName, this.commonVpc, this.cloudMapNamespace);

        this.onEcsPostConstructor(this.commonVpc, this.ecsCluster, this.cloudMapNamespace);
    }

    protected getVpc(): ec2.IVpc {
        return this.commonVpc;
    }

    protected getCluster(): ecs.ICluster {
        return this.ecsCluster;
    }

    protected getNamespace(): sd.IPrivateDnsNamespace {
        return this.cloudMapNamespace;
    }

    private loadCloudMapNamespace(): sd.IPrivateDnsNamespace {
        const ns = sd.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(this, 'cloud-map', {
                namespaceName: this.getParameter('CloudMapNamespaceName'),
                namespaceArn: this.getParameter('CloudMapNamespaceArn'),
                namespaceId: this.getParameter('CloudMapNamespaceId'),
            });

        return ns;
    }

    private loadEcsCluster(clusterName: string, vpc: ec2.IVpc, cloudMapNamespace?: sd.INamespace): ecs.ICluster {
        if (this.ecsCluster == undefined) {
            this.ecsCluster = ecs.Cluster.fromClusterAttributes(this, 'ecs-cluster', {
                vpc,
                clusterName,
                securityGroups: [],
                defaultCloudMapNamespace: cloudMapNamespace
            });
        }

        return this.ecsCluster;
    }
}
