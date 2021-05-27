import * as ec2 from '@aws-cdk/aws-ec2';

import * as base from '../base/base-stack';
import { AppContext } from '../../app-context';
import { VpcConstruct } from './vpc-construct'

export interface VpcNewCreateProps {
  vpcMaxAzs: number;
  vpcCidr: string;
  natGateways?: number;
  subnetConf?: ec2.SubnetConfiguration[];
}

export interface VpcLegacyLookupProps {
  vpcIdLegacy: string;
}

export abstract class VpcBaseStack extends base.BaseStack {
    protected baseVpc: ec2.IVpc | undefined;

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);
    }

    protected createNewVPC(props: VpcNewCreateProps): ec2.IVpc {
        this.baseVpc = new VpcConstruct(this, 'BaseVpc', {
            vpcUseLegacy: false,
            vpcMaxAzs: props.vpcMaxAzs,
            vpcCidr: props.vpcCidr,
            natGateways: props.natGateways,
            subnetConf: props.subnetConf
        }).baseVpc;

        return this.baseVpc;
    }

    protected importLegacyVPC(props: VpcLegacyLookupProps): ec2.IVpc {
        this.baseVpc = new VpcConstruct(this, 'BaseVpc', {
            vpcUseLegacy: true,
            vpcIdLegacy: props.vpcIdLegacy,
        }).baseVpc;

        return this.baseVpc;
    }
}
