import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as target from '../infra/ecs-service/ecs-common-service-stack';
import { AppContext } from '../lib/template/app-context';

test('Empty Stack', () => {
    const appContext = new AppContext({
        appConfigFileKey: 'APP_CONFIG',
    });

    // WHEN
    const stack = new target.EcsCommonServiceStack(appContext, {
        "Name": "LoadTesterScriptStack",

        "TargetStack": "SampleBackendFastapiStack",

        "AppPath": "codes/load-tester-script",
        "DesiredTasks": 1
    });

    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
