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

const fs = require('fs');
const env = require('env-var');
import * as cdk from '@aws-cdk/core';

import { StackCommonProps } from './stack/base/base-stack';

export interface AppContextProps {
    appConfigEnvName: string;
    projectPrefix?: string;
    contextArgs?: string[];
}

export class AppContext {
    public readonly cdkApp: cdk.App;
    public readonly appConfig: any | undefined;
    public readonly stackCommonProps: StackCommonProps | undefined;

    private projectPrefix: string|undefined;
    private infraConfigPath: string|undefined;

    constructor(props: AppContextProps) {
        this.cdkApp = new cdk.App();

        this.projectPrefix = props.projectPrefix;

        this.appConfig = this.loadConfig(this.cdkApp, props.appConfigEnvName, props.contextArgs);

        if (this.appConfig != undefined) {
            this.stackCommonProps = this.createStackProps();
        }
    }

    private createStackProps(): StackCommonProps {
        const stackProps: StackCommonProps = {
            projectPrefix: this.projectPrefix!,
            appConfig: this.appConfig,
            appConfigPath: this.infraConfigPath!,
            env: {
                account: this.appConfig.Project.Account,
                region: this.appConfig.Project.Region
            },
            variable: {}
        }

        return stackProps;
    }

    // must contain infra/config/xxxx.json
    private loadConfig(cdkApp: cdk.App, key: string, contextArgs?: string[]): any {
        var fromType = 'Input-Parameter';
        var configFilePath = cdkApp.node.tryGetContext(key); //'APP_CONFIG'

        if (configFilePath == undefined) {
            configFilePath = env.get(key).asString();

            if (configFilePath != undefined && configFilePath.length > 0) {
                fromType = 'Environment-Variable';
            } else {
                configFilePath = undefined;
            }
        }

        if (configFilePath == undefined) {
            console.error(`==> CDK App-Config File is empty, 
        please check your environment variable(Usage: export ${key}=config/app-config-xxx.json) 
                        or input parameter(--context=${key}=config/app-config-xxx.json)`);
            return false;
        } else {
            console.info(`==> CDK App-Config File is ${configFilePath}, which is from ${fromType}.`);
            return this.loadConfigFromFile(configFilePath, cdkApp, contextArgs);
        }
    }

    private loadConfigFromFile(filePath: string, app?: cdk.App, contextArgs?: string[]): any {
        this.infraConfigPath = filePath;
        let config: any = JSON.parse(fs.readFileSync(filePath).toString());
        
        if (contextArgs != undefined) {
            this.updateContextArgs(config, app!, contextArgs);
        }
        
        this.addPrefixIntoStackName(config);

        return config;
    }
    
    private updateContextArgs(config: any, app: cdk.App, contextArgs: string[]) {
        for (var key of contextArgs) {
            const jsonKeys = key.split('.');
            let oldValue = '';
            const newValue: string = app?.node.tryGetContext(key);

            if (jsonKeys.length == 1) {
                oldValue = config[jsonKeys[0]];
                config[jsonKeys[0]] = newValue;
            } else if (jsonKeys.length == 2) {
                oldValue = config[jsonKeys[0]][jsonKeys[1]]
                config[jsonKeys[0]][jsonKeys[1]] = newValue;
            } else if (jsonKeys.length == 3) {
                oldValue = config[jsonKeys[0]][jsonKeys[1]][jsonKeys[2]];
                config[jsonKeys[0]][jsonKeys[1]][jsonKeys[2]] = newValue;
            } else if (jsonKeys.length == 4) {
                oldValue = config[jsonKeys[0]][jsonKeys[1]][jsonKeys[2]][jsonKeys[3]];
                config[jsonKeys[0]][jsonKeys[1]][jsonKeys[2]][jsonKeys[3]] = newValue;
            } else if (jsonKeys.length == 5) {
                oldValue = config[jsonKeys[0]][jsonKeys[1]][jsonKeys[2]][jsonKeys[3]][jsonKeys[4]];
                config[jsonKeys[0]][jsonKeys[1]][jsonKeys[2]][jsonKeys[3]][jsonKeys[4]] = newValue;
            }

            console.error(`updateContextArgs: ${key} = ${oldValue}-->${newValue}`);
        }
    }

    private addPrefixIntoStackName(config: any) {
        const projectPrefix = this.projectPrefix == undefined ? `${config.Project.Name}${config.Project.Stage}` : this.projectPrefix;
        this.projectPrefix = projectPrefix;

        for (const key in config.Stack) {
            config.Stack[key].Name = `${projectPrefix}-${config.Stack[key].Name}`;
        }
    }
}
