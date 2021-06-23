#!/usr/bin/env node
import 'source-map-support/register';

import { AppContext } from '../lib/template/app-context';



const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    
}
