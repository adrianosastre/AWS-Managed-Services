import * as cdk from '@aws-cdk/core';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cognito from '@aws-cdk/aws-cognito';

export class CognitoAndTriggerFunctionsStack extends cdk.Stack {
    readonly cognitoUserPool: cognito.UserPool;
    readonly getCurrentUserHandler: lambdaNodeJS.NodejsFunction;

    constructor(
        scope: cdk.Construct,
        id: string,
        props?: cdk.StackProps) {
        super(scope, id, props);

        // lambda triggers for pool:
        const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(this, 'PostConfirmationFunction', {
            functionName: 'PostConfirmationFunction',
            entry: 'lambdas/cognito/postConfirmationFunction.js',
            handler: 'handler',
            bundling: {
                minify: false,
                sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 128,
        });
        const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(this, 'PreAuthenticationFunction', {
            functionName: 'PreAuthenticationFunction',
            entry: 'lambdas/cognito/preAuthenticationFunction.js',
            handler: 'handler',
            bundling: {
                minify: false,
                sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 128,
        });

        // Cognito user pool:
        this.cognitoUserPool = new cognito.UserPool(this, 'AwsManagedServicesUserPool', {
            userPoolName: 'AwsManagedServicesUserPool',
            removalPolicy: cdk.RemovalPolicy.RETAIN, // RETAIN = mantém o user pool se a stack for removida
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: 'Verify your e-mail for the AwsManagedServices service!', // ideal = usar junto com o SES
                emailBody: 'Thanks for signing up to AwsManagedServices service! Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE, // CODE or link
            },
            signInAliases: {
                username: false,
                email: true
            },
            autoVerify: {
                email: true,
                phone: false,
            },
            standardAttributes: {
                fullname: {
                    required: true,
                    mutable: false,
                },
                address: {
                    required: false,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: cdk.Duration.days(3),
            },
            customAttributes: {
                'matriculaERP': new cognito.StringAttribute({ minLen: 5, maxLen: 5, mutable: false })
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            lambdaTriggers: {
                postConfirmation: postConfirmationHandler,
                preAuthentication: preAuthenticationHandler,
            },
        });

        this.cognitoUserPool.addDomain('AwsManagedServicesDomain', {
            cognitoDomain: {
                domainPrefix: 'sastre-ams-service',
            },
        });

        // escopos de acesso:
        const readOnlyScope = new cognito.ResourceServerScope({
            scopeName: 'read',
            scopeDescription: 'Read only access',
        });
        const fullAccessScope = new cognito.ResourceServerScope({
            scopeName: '*',
            scopeDescription: 'Full access',
        });

        // servidor de recursos, agrupa os escopos:
        const amsResourceServer = this.cognitoUserPool.addResourceServer('AwsManagedServicesResourceServer', {
            identifier: 'AwsManagedServices',
            userPoolResourceServerName: 'AwsManagedServicesResourceServer',
            scopes: [readOnlyScope, fullAccessScope],
        });

        const readOnlyClient = this.cognitoUserPool.addClient('read-only-client', {
            userPoolClientName: 'AwsManagedServicesReadOnly',
            authFlows: {
                userPassword: true,
            },
            accessTokenValidity: cdk.Duration.minutes(60),
            refreshTokenValidity: cdk.Duration.days(7),
            oAuth: {
                scopes: [
                    cognito.OAuthScope.resourceServer(amsResourceServer, readOnlyScope),
                ],
            },
        });

        const fullAccessClient = this.cognitoUserPool.addClient('full-access-client', {
            userPoolClientName: 'AwsManagedServicesFullAccess',
            authFlows: {
                userPassword: true,
            },
            accessTokenValidity: cdk.Duration.minutes(60),
            refreshTokenValidity: cdk.Duration.days(7),
            oAuth: {
                scopes: [
                    cognito.OAuthScope.resourceServer(amsResourceServer, fullAccessScope),
                ],
            },
        });

        // create a function to handle import:
        this.getCurrentUserHandler = new lambdaNodeJS.NodejsFunction(this, 'GetCurrentUserFunction', {
            functionName: 'GetCurrentUserFunction',
            entry: 'lambdas/cognito/getCurrentUserFunction.js',
            handler: 'handler',
            bundling: {
              minify: false,
              sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 128,
            timeout: cdk.Duration.seconds(10),
            environment: {
                COGNITO_USER_POOL_ID: this.cognitoUserPool.userPoolId,
            },
        });

    }
}