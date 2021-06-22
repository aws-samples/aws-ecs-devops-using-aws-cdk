#!/usr/bin/env node
import 'source-map-support/register';

import { AppContext } from '../lib/template/app-context';
import { VpcInfraStack } from './common-infra/vpc-infra-stack';
import { EcsAlbServiceStack } from './ecs-service/ecs-alb-service-stack';
import { EcsCommonServiceStack } from './ecs-service/ecs-common-service-stack';


const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    new VpcInfraStack(appContext, appContext.appConfig.Stack.VpcInfra);

    new EcsAlbServiceStack(appContext, appContext.appConfig.Stack.SampleBackendFastapi);
    new EcsAlbServiceStack(appContext, appContext.appConfig.Stack.SampleFrontendFlask);

    new EcsCommonServiceStack(appContext, appContext.appConfig.Stack.LoadTesterScript);
}
