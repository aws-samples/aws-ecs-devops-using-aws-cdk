import * as cdk from '@aws-cdk/core';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as lb2 from '@aws-cdk/aws-elasticloadbalancingv2';

const REFRESH_PERIOD_IN_MIN: number = 1;

export interface EcsAlbMonitorProps {
    stackName: string;
    dashboardName: string;
    alb: lb2.ApplicationLoadBalancer;
    ecsSrevice: ecs.FargateService;
    table?: ddb.Table;
}

export class EcsAlbMonitorConstrunct extends cdk.Construct {
    private dashboard: cloudwatch.Dashboard;
    
    constructor(scope: cdk.Construct, id: string, props: EcsAlbMonitorProps) {
        super(scope, id);

        this.dashboard = new cloudwatch.Dashboard(this, props.dashboardName, {
            dashboardName: `${props.stackName}-${props.dashboardName}`,
        });

        this.addWidgets(
            this.createWidget('ALB-Requests', [props.alb.metricRequestCount(), props.alb.metricHttpCodeTarget(lb2.HttpCodeTarget.TARGET_2XX_COUNT)], 12),
            this.createWidget('ALB-Response', [props.alb.metricTargetResponseTime({unit: cloudwatch.Unit.MILLISECONDS})], 12),
        )

        this.addWidgets(
            this.createWidget('ECS-CPU', [props.ecsSrevice.metricCpuUtilization()], 12),
            this.createWidget('ECS-Memory', [props.ecsSrevice.metricMemoryUtilization()], 12),
        )

        if (props.table != undefined) {
            this.addWidgets(
                this.createWidget('DDB-Read', [props.table.metricConsumedReadCapacityUnits()], 12),
                this.createWidget('DDB-Write', [props.table.metricConsumedWriteCapacityUnits()], 12),
                this.createWidget('DDB-Latency', [props.table.metricSuccessfulRequestLatency({dimensions: {Operation: 'Scan'}}), 
                                                    props.table.metricSuccessfulRequestLatency({dimensions: {Operation: 'PutItem'}})], 12),
                this.createWidget('DDB-Throttled', [props.table.metricThrottledRequests()], 12),
            )
        }
    }

    private addWidgets(...widgets: cloudwatch.IWidget[]): void {
        this.dashboard.addWidgets(...widgets);
    }

    private createWidget(name: string, metrics: cloudwatch.IMetric[], width?: number): cloudwatch.GraphWidget {
        const widget = new cloudwatch.GraphWidget({
            title: name,
            left: metrics,
            width: width,
            period: cdk.Duration.minutes(REFRESH_PERIOD_IN_MIN),
        });
        return widget;
    }
}