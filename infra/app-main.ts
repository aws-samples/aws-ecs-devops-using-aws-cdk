#!/usr/bin/env node
import 'source-map-support/register';

import { AppContext } from '../lib/template/app-context';
import { VpcInfraStack } from './common-infra/vpc-infra-stack';
import { EcsAlbStack } from './ecs-service/ecs-alb-stack';
import { EcsTaskStack } from './ecs-service/ecs-task-stack';


const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    new VpcInfraStack(appContext, appContext.appConfig.Stack.VpcInfra);

    new EcsAlbStack(appContext, appContext.appConfig.Stack.EcsAlb);
    new EcsAlbStack(appContext, appContext.appConfig.Stack.EcsFrontend);

    new EcsTaskStack(appContext, appContext.appConfig.Stack.EcsTask);
}
