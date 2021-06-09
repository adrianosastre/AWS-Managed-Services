import * as cdk from '@aws-cdk/core';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cwlogs from '@aws-cdk/aws-logs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cognito from '@aws-cdk/aws-cognito';

export class ApiCognitoAndTriggerFunctionsStack extends cdk.Stack {

    constructor(
        scope: cdk.Construct,
        id: string,
        productsHandler: lambdaNodeJS.NodejsFunction,
        invoiceImportHandler: lambdaNodeJS.NodejsFunction,
        productEventsFetchHandler: lambdaNodeJS.NodejsFunction,
        props?: cdk.StackProps) {
        super(scope, id, props);

        const logGroup = new cwlogs.LogGroup(this, 'ApiLog');

        const api = new apigateway.RestApi(this, 'api', {
        restApiName: 'My API Service',
        description: 'This is my API service',
        deployOptions: {
            accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
            accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
            caller: true,
            httpMethod: true,
            ip: true,
            protocol: true,
            requestTime: true,
            resourcePath: true,
            responseLength: true,
            status: true,
            user: true,
            }),
        },
        });

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
        const productsUserPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'ProductsUserPool',
            removalPolicy: cdk.RemovalPolicy.DESTROY, // não faria isso em produção
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: 'Verify your e-mail for the Products service!', // ideal = usar junto com o SES
                emailBody: 'Thanks for signing up to Products service! Your verification code is {####}',
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
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            lambdaTriggers: {
                postConfirmation: postConfirmationHandler,
                preAuthentication: preAuthenticationHandler,
            },
        });

        productsUserPool.addDomain('ProductDomain', {
            cognitoDomain: {
                domainPrefix: 'sastre-products-service',
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
        const productsServer = productsUserPool.addResourceServer('ProductsResourceServer', {
            identifier: 'products',
            userPoolResourceServerName: 'ProductsResourceServer',
            scopes: [readOnlyScope, fullAccessScope],
        });

        // define como a autenticação vai acontecer:
        const readOnlyClient = productsUserPool.addClient('read-only-client', {
            userPoolClientName: 'productsReadOnly',
            authFlows: {
                userPassword: true,
            },
            accessTokenValidity: cdk.Duration.minutes(60),
            refreshTokenValidity: cdk.Duration.days(7),
            oAuth: {
                scopes: [
                    cognito.OAuthScope.resourceServer(productsServer, readOnlyScope),
                ],
            },
        });

        const fullAccessClient = productsUserPool.addClient('full-access-client', {
            userPoolClientName: 'productsFullAccess',
            authFlows: {
                userPassword: true,
            },
            accessTokenValidity: cdk.Duration.minutes(60),
            refreshTokenValidity: cdk.Duration.days(7),
            oAuth: {
                scopes: [
                    cognito.OAuthScope.resourceServer(productsServer, fullAccessScope),
                ],
            },
        });

        // 
        const productsAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ProductsAuthorizer', {
            cognitoUserPools: [productsUserPool],
            authorizerName: 'ProductsAuthorizer',
        });

        // resource /products :
        // GET /products = fetch all
        // POST /products = create a product

        // resource /products/{id} :
        // GET /products/{id} = fetch product by id
        // PUT /products/{id} = update a product by id
        // DELETE /products/{id} = delete a product by id

        // criando integração api gateway - função lambda para encaminhar a função:
        const productsFunctionIntegration = new apigateway.LambdaIntegration(productsHandler, {
            requestTemplates: {
                'application/json': '{"statusCode: 200"}',
            }
        });

        const fullAccessParams = {
            authorizer: productsAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizationScopes: [
                'products/*', // identificação do servidor / nome do escopo
            ],
        };
        const fullAndReadAccessParams = {
            authorizer: productsAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizationScopes: [
                'products/read', // identificação do servidor / nome do escopo
                'products/*', // identificação do servidor / nome do escopo
            ],
        };

        const productsResource = api.root.addResource('products'); // add a resource in /
        productsResource.addMethod('GET', productsFunctionIntegration, fullAndReadAccessParams);
        productsResource.addMethod('POST', productsFunctionIntegration, fullAccessParams);

        const productResource = productsResource.addResource('{id}'); // add a resorce /products/{id}
        productResource.addMethod('GET', productsFunctionIntegration, fullAndReadAccessParams);
        productResource.addMethod('PUT', productsFunctionIntegration, fullAccessParams);
        productResource.addMethod('DELETE', productsFunctionIntegration, fullAccessParams);

        // resource /products/events :
        // GET /products/events/{code} -> fetch all product events by product code
        // GET /products/events/{code}/{event} -> fetch all product events by product code and event type

        // criando integração api gateway - função de eventos de produtos:
        const productsEventsFetchFunctionIntegration =
            new apigateway.LambdaIntegration(productEventsFetchHandler, {
                requestTemplates: {
                    'application/json': '{"statusCode: 200"}',
                },
        });

        const productEventsResource = productsResource.addResource('events');
        productEventsResource.addMethod('GET', productsEventsFetchFunctionIntegration);

        const productEventsByCodeResource = productEventsResource.addResource('{code}');
        productEventsByCodeResource.addMethod('GET', productsEventsFetchFunctionIntegration);
        const productEventsByCodeAndEventResource = productEventsByCodeResource.addResource('{event}');
        productEventsByCodeAndEventResource.addMethod('GET', productsEventsFetchFunctionIntegration);

        // resource "/invoices":
        // POST /invoices:

        // criando integração api gateway - função:
        const invoiceImportFunctionIntegration = new apigateway.LambdaIntegration(invoiceImportHandler, {
            requestTemplates: {
                'application/json': '{"statusCode: 200"}',
            }
        });

        const invoicesResource = api.root.addResource('invoices');
        invoicesResource.addMethod('POST', invoiceImportFunctionIntegration);
    }
}