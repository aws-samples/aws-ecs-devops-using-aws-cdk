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
import * as ecr from '@aws-cdk/aws-ecr';
import * as codecommit from '@aws-cdk/aws-codecommit';

import * as base from '../../../lib/template/construct/base/base-construct'


export interface EcsRepoProps extends base.ConstructCommonProps {
    shortStackName: string;
}

export class EcsRepoConstrunct extends base.BaseConstruct {
    public gitRepo: codecommit.Repository;
    public ecrRepo: ecr.Repository;

    constructor(scope: cdk.Construct, id: string, props: EcsRepoProps) {
        super(scope, id, props);

        const repoSuffix = 'repo';

        this.gitRepo = new codecommit.Repository(this, `${props.stackName}Repository`, {
            repositoryName: `${props.stackName}-${repoSuffix}`.toLowerCase(),
            description: props.stackName,
        });
        this.exportOutput(`${props.shortStackName}CodeCommitName`, this.gitRepo.repositoryName);

        this.ecrRepo = new ecr.Repository(this, `${props.stackName}EcrRepository`, {
            repositoryName: `${props.stackName}-${repoSuffix}`.toLowerCase()
        });
        this.exportOutput(`${props.shortStackName}ECRName`, this.ecrRepo.repositoryName);
    }
}