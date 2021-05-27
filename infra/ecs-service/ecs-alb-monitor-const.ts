import * as cdk from '@aws-cdk/core';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as loadBalancer from '@aws-cdk/aws-elasticloadbalancingv2';

export interface EcsAlbMonitorProps {
    stackName: string;
    dashboardName: string;
    alb: loadBalancer.ApplicationLoadBalancer;
    ecsSrevice: ecs.FargateService;
    table: ddb.Table;
}

export class EcsAlbMonitorConstrunct extends cdk.Construct {
    private dashboard: cloudwatch.Dashboard;
    
    constructor(scope: cdk.Construct, id: string, props: EcsAlbMonitorProps) {
        super(scope, id);

        this.dashboard = new cloudwatch.Dashboard(this, props.dashboardName, {
            dashboardName: `${props.stackName}-${props.dashboardName}`,
        });

        this.addWidgets(
            this.createWidget('ALB-Requests', [props.alb.metricRequestCount()], 12),
            this.createWidget('ALB-Response', [props.alb.metricTargetResponseTime()], 12),
        )

        this.addWidgets(
            this.createWidget('ECS-CPU', [props.ecsSrevice.metricCpuUtilization()], 12),
            this.createWidget('ECS-Memory', [props.ecsSrevice.metricMemoryUtilization()], 12),
        )

        this.addWidgets(
            this.createWidget('DDB-Read', [props.table.metricConsumedReadCapacityUnits()], 8),
            this.createWidget('DDB-Write', [props.table.metricConsumedWriteCapacityUnits()], 8),
            this.createWidget('DDB-Requests', [props.table.metricThrottledRequests()], 8),
        )
    }

    private addWidgets(...widgets: cloudwatch.IWidget[]): void {
        this.dashboard.addWidgets(...widgets);
    }

    private createWidget(name: string, metrics: cloudwatch.IMetric[], width?: number): cloudwatch.GraphWidget {
        const widget = new cloudwatch.GraphWidget({
            title: name,
            left: metrics,
            width: width
        });
        return widget;
    }
}