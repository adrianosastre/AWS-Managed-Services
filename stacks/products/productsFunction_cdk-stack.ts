import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sqs from '@aws-cdk/aws-sqs';

export class ProductsFunctionCdkStack extends cdk.Stack {
  readonly handler: lambdaNodeJS.NodejsFunction;

  constructor(
    scope: cdk.Construct,
    id: string,
    getCurrentUserHandler: lambdaNodeJS.NodejsFunction,
    productsDdb: dynamodb.Table,
    productsEventsQueue: sqs.Queue,
    props?: cdk.StackProps) {
    super(scope, id, props);

    this.handler = new lambdaNodeJS.NodejsFunction(this, 'ProductsFunction', {
      functionName: 'ProductsFunction',
      entry: 'lambdas/products/productsFunction.js',
      handler: 'handler',
      bundling: {
        minify: false,
        sourceMap: false,
      },
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        PRODUCTS_DDB: productsDdb.tableName,
        PRODUCT_EVENTS_QUEUE_URL: productsEventsQueue.queueUrl,
        GET_CURRENT_USER_FUNCTION_NAME: getCurrentUserHandler.functionName,
      },
    });

    productsDdb.grantReadWriteData(this.handler); // dar permissão ao lambda para ler/escrever na tabela
    productsEventsQueue.grantSendMessages(this.handler); // dar permissão ao lambda escrever nessa fila
    getCurrentUserHandler.grantInvoke(this.handler); // permite a esse lambda invocar o outro

  }
}
