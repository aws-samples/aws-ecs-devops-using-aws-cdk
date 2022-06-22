import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';

import * as base from '../../../lib/template/construct/base/base-construct'


export interface EcsRepoProps extends base.ConstructCommonProps {
    shortStackName: string;
}

export class EcsRepoConstrunct extends base.BaseConstruct {
    public gitRepo: codecommit.Repository;
    public ecrRepo: ecr.Repository;

    constructor(scope: Construct, id: string, props: EcsRepoProps) {
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