import * as cdk from '@aws-cdk/core';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cwlogs from '@aws-cdk/aws-logs';
import * as cognito from '@aws-cdk/aws-cognito';

export class ApiStack extends cdk.Stack {

    constructor(
        scope: cdk.Construct,
        id: string,
        cognitoUserPool: cognito.UserPool,
        productsHandler: lambdaNodeJS.NodejsFunction,
        invoiceUrlHandler: lambdaNodeJS.NodejsFunction,
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

        const amsAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'AwsManagedServicesAuthorizer', {
            cognitoUserPools: [cognitoUserPool],
            authorizerName: 'AwsManagedServicesAuthorizer',
        });

        const fullAccessParams = {
            authorizer: amsAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizationScopes: [
                'AwsManagedServices/*', // identificação do servidor / nome do escopo
            ],
        };
        const fullAndReadAccessParams = {
            authorizer: amsAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizationScopes: [
                'AwsManagedServices/read', // identificação do servidor / nome do escopo
                'AwsManagedServices/*', // identificação do servidor / nome do escopo
            ],
        };

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
        const invoiceUrlFunctionIntegration = new apigateway.LambdaIntegration(invoiceUrlHandler, {
            requestTemplates: {
                'application/json': '{"statusCode: 200"}',
            }
        });

        const invoicesResource = api.root.addResource('invoices');
        invoicesResource.addMethod('POST', invoiceUrlFunctionIntegration);
    }
}