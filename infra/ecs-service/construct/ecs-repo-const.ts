import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as codecommit from '@aws-cdk/aws-codecommit';

import * as base from '../../../lib/template/construct/base/base-construct'


export interface EcsRepoProps extends base.ConstructProps {
    stackName: string;
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
        this.exportOutput('CodeCommitName', this.gitRepo.repositoryName);

        this.ecrRepo = new ecr.Repository(this, `${props.stackName}EcrRepository`, {
            repositoryName: `${props.stackName}-${repoSuffix}`.toLowerCase()
        });
        this.exportOutput('ECRName', this.ecrRepo.repositoryName);
    }
}