import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface VpcConstructProps {
  vpcUseLegacy: boolean;
  
  vpcIdLegacy?: string;

  vpcMaxAzs?: number;
  vpcCidr?: string;

  natGateways?: number;
  subnetConf?: ec2.SubnetConfiguration[];
}

export class VpcConstruct extends cdk.Construct {
  public readonly baseVpc: ec2.IVpc;

  constructor(scope: cdk.Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    if (props.vpcUseLegacy) {
      this.baseVpc = this.importLegacyVpc(props.vpcIdLegacy!);
    } else {
      this.baseVpc = this.createVpc(props.vpcMaxAzs!, props.vpcCidr!, props.natGateways, props.subnetConf);
    }
  }
  
  private importLegacyVpc(vpcIdLegacy: string): ec2.IVpc {
    var vpc: ec2.IVpc;

    if (vpcIdLegacy.length > 0) {
      // Case1 : Bring your legacy VPC
      vpc = ec2.Vpc.fromLookup(this, `VPC`, { 
        vpcId: vpcIdLegacy
      });
    } else {
      // Error
      console.error('please check the options: VPCEnable, VPCUseLegacy, VPCIDLegacy');
      process.exit(1)
    }

    return vpc;
  }

  private createVpc(vpcMaxAzs: number, vpcCidr: string, natGateways?: number, subnetConf?:ec2.SubnetConfiguration[] ) {
    var vpc: ec2.IVpc;

    if (vpcMaxAzs > 0 && vpcCidr.length > 0) {
      // Case2 : Create the new VPC
      vpc = new ec2.Vpc(this, `CommonVPC`,
        {
          maxAzs: vpcMaxAzs,
          cidr: vpcCidr,
          natGateways: natGateways,
          subnetConfiguration: subnetConf
        });
    } else {
      // Error
      console.error('please check the options: VPCEnable, VPCMaxAzs, VPCCIDR');
      process.exit(1)
    }

    return vpc;
  }
}
