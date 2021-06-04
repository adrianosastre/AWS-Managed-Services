import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export class ProductEventsFetchFunctionStack extends cdk.Stack {
    readonly handler: lambdaNodeJS.NodejsFunction;

    constructor(
        scope: cdk.Construct,
        id: string,
        productEventsDdb: dynamodb.Table,
        props?: cdk.StackProps
    ) {
        super(scope, id, props);

        this.handler = new lambdaNodeJS.NodejsFunction(this, 'ProductEventsFetchFunction', {
            functionName: 'ProductEventsFetchFunction',
            entry: 'lambdas/products/productEventsFetchFunction.js',
            handler: 'handler',
            bundling: {
              minify: false,
              sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE, // Ativar X-Ray
            memorySize: 256,
            timeout: cdk.Duration.seconds(30),
            environment: {
              PRODUCT_EVENTS_TABLE_NAME: productEventsDdb.tableName,
            }
        });

        productEventsDdb.grantReadData(this.handler);
    }
}