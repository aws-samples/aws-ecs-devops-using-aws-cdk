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
import * as cdk from '@aws-cdk/core';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as ecs from '@aws-cdk/aws-ecs';
import * as sns from '@aws-cdk/aws-sns';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as cw_actions from '@aws-cdk/aws-cloudwatch-actions';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as lb2 from '@aws-cdk/aws-elasticloadbalancingv2';

import * as base from '../../../lib/template/construct/base/base-construct'

const REFRESH_PERIOD_IN_MIN: number = 1;
const METRIC_PERIOD_IN_SEC: number = 60;

export interface EcsMonitorProps extends base.ConstructCommonProps {
    alb: lb2.ApplicationLoadBalancer;
    ecsSrevice: ecs.FargateService;
    table?: ddb.Table;
    alarmThreshold: number;
    subscriptionEmails: string[];
}

export class EcsAlbMonitorConstrunct extends base.BaseConstruct {
    private dashboard: cloudwatch.Dashboard;
    private props: EcsMonitorProps;
    
    constructor(scope: cdk.Construct, id: string, props: EcsMonitorProps) {
        super(scope, id, props);

        this.props = props;

        const dashboardName = 'Dashboard';
        this.dashboard = new cloudwatch.Dashboard(this, dashboardName, {
            dashboardName: `${props.stackName}-${dashboardName}`,
        });

        const metricOptions: cloudwatch.MetricOptions = {
            period: cdk.Duration.seconds(METRIC_PERIOD_IN_SEC)
        };

        this.addWidgets(new cloudwatch.SingleValueWidget({
            title: `ALB-Request-Monitor`,
            metrics: [
                props.alb.metricRequestCount(metricOptions), 
                props.alb.metricHttpCodeTarget(lb2.HttpCodeTarget.TARGET_2XX_COUNT, metricOptions),
                props.alb.metricHttpCodeTarget(lb2.HttpCodeTarget.TARGET_3XX_COUNT, metricOptions),
                props.alb.metricHttpCodeTarget(lb2.HttpCodeTarget.TARGET_4XX_COUNT, metricOptions),
                props.alb.metricHttpCodeTarget(lb2.HttpCodeTarget.TARGET_5XX_COUNT, metricOptions),
            ],
            width: 24,
            height: 3
        }));

        const baseName = 'ALB-Request';
        const alarm = this.createMetricAlarm(baseName, props.alb.metricRequestCount(metricOptions))
        this.addWidgets(new cloudwatch.AlarmWidget({
            title: baseName,
            alarm: alarm,
            width: 24,
            height: 6
        }));

        this.addWidgets(
            this.createWidget('ALB-Response', [props.alb.metricTargetResponseTime(metricOptions)], 24),
        )

        this.addWidgets(
            this.createWidget('ECS-CPU', [props.ecsSrevice.metricCpuUtilization(metricOptions)], 12),
            this.createWidget('ECS-Memory', [props.ecsSrevice.metricMemoryUtilization(metricOptions)], 12),
        )

        if (props.table != undefined) {
            this.addWidgets(
                this.createWidget('DDB-Read', [props.table.metricConsumedReadCapacityUnits(metricOptions)], 12),
                this.createWidget('DDB-Write', [props.table.metricConsumedWriteCapacityUnits(metricOptions)], 12),
                this.createWidget('DDB-Latency', [props.table.metricSuccessfulRequestLatency({period: cdk.Duration.seconds(METRIC_PERIOD_IN_SEC), dimensionsMap: {Operation: 'Scan'}}), 
                                                    props.table.metricSuccessfulRequestLatency({period: cdk.Duration.seconds(METRIC_PERIOD_IN_SEC), dimensionsMap: {Operation: 'PutItem'}})], 12),
                this.createWidget('DDB-Throttled', [props.table.metric('WriteThrottleEvents', {period: cdk.Duration.seconds(METRIC_PERIOD_IN_SEC), statistic: 'Sum', unit: cloudwatch.Unit.COUNT}),
                                                    props.table.metric('ReadThrottleEvents', {period: cdk.Duration.seconds(METRIC_PERIOD_IN_SEC), statistic: 'Sum', unit: cloudwatch.Unit.COUNT})], 12),
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

    private createMetricAlarm(baseName: string, metric: cloudwatch.Metric): cloudwatch.Alarm {
        const alarmTopic = new sns.Topic(this, `${baseName}-Alarm-Topic`, {
            displayName: `${this.props.stackName}-${baseName}-Alarm-Topic`,
            topicName: `${this.props.stackName}-${baseName}-Alarm-Topic`
        });

        const emailList: string[] = this.props.subscriptionEmails;
        emailList.forEach(email => alarmTopic.addSubscription(new subscriptions.EmailSubscription(email)));

        const period = 3;
        const alarm = metric.createAlarm(this, 'RequestCountAlarm', {
            alarmName: `${this.props.stackName}-${baseName}-Alarm`,
            threshold: this.props.alarmThreshold,
            evaluationPeriods: period,
            actionsEnabled: true,
            alarmDescription: `This alarm occurs when request-count is over ${this.props.alarmThreshold} for ${period} minutes.`
        })
        alarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));

        return alarm;
    }
}