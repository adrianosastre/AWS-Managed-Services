import * as cdk from '@aws-cdk/core';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cwlogs from '@aws-cdk/aws-logs';

export class ProductsApiStack extends cdk.Stack {

    constructor(
        scope: cdk.Construct,
        id: string,
        productsHandler: lambdaNodeJS.NodejsFunction,
        invoiceImportHandler: lambdaNodeJS.NodejsFunction,
        // productEventsFetchHandler: lambdaNodeJS.NodejsFunction,
        props?: cdk.StackProps) {
        super(scope, id, props);

        const logGroup = new cwlogs.LogGroup(this, 'ProductsApiLog');

        const api = new apigateway.RestApi(this, 'products-api', {
        restApiName: 'Products Service',
        description: 'This is the Products service',
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
        productsResource.addMethod('GET', productsFunctionIntegration);
        productsResource.addMethod('POST', productsFunctionIntegration);

        const productResource = productsResource.addResource('{id}'); // add a resorce /products/{id}
        productResource.addMethod('GET', productsFunctionIntegration);
        productResource.addMethod('PUT', productsFunctionIntegration);
        productResource.addMethod('DELETE', productsFunctionIntegration);

        // resource /products/events :
        // GET /products/events/{code} -> fetch all product events by product code
        // GET /products/events/{code}/{event} -> fetch all product events by product code and event type

        // criando integração api gateway - função de eventos de produtos:
        /*const productsEventsFetchFunctionIntegration =
            new apigateway.LambdaIntegration(productEventsFetchHandler, {
                requestTemplates: {
                    'application/json': '{"statusCode: 200"}',
                }
        });

        const productEventsResource = productResource.addResource('events');
        const productEventsByCodeResource = productEventsResource.addResource('{code}');
        productEventsByCodeResource.addMethod('GET', productsEventsFetchFunctionIntegration);
        const productEventsByCodeAndEventResource = productEventsByCodeResource.addResource('{event}');
        productEventsByCodeAndEventResource.addMethod('GET', productsEventsFetchFunctionIntegration);*/

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