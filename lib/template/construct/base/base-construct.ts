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
import * as ssm from '@aws-cdk/aws-ssm'


export interface ConstructProps {
    projectPrefix: string;
    stackName: string;
    stackConfig: any;
    appConfig: any;
}

export class BaseConstruct extends cdk.Construct {
    protected stackName: string;
    protected stackConfig: any;
    protected appConfig: any;

    constructor(scope: cdk.Construct, id: string, props: ConstructProps) {
        super(scope, id);

        this.stackName = props.stackName;
        
        this.stackConfig = props.stackConfig;
        this.appConfig = props.appConfig;
    }

    protected exportOutput(key: string, value: string) {
        new cdk.CfnOutput(this, `Output-${key}`, {
            exportName: `${this.stackName}-${key}`,
            value: value
        });
    }

    protected putParameter(paramKey: string, paramValue: string): string {
        const paramKeyWithPrefix = `${this.stackName}-${paramKey}`;

        new ssm.StringParameter(this, paramKey, {
            parameterName: paramKeyWithPrefix,
            stringValue: paramValue,
        });

        return paramKey;
    }

    protected getParameter(stackName: string, paramKey: string): string {
        const paramKeyWithPrefix = `${stackName}-${paramKey}`;
        
        return ssm.StringParameter.valueForStringParameter(
            this,
            paramKeyWithPrefix
        );
    }
} 