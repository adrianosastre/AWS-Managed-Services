import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as sqs from '@aws-cdk/aws-sqs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';

export class ProductEventsFunctionStack extends cdk.Stack {
  readonly handler: lambdaNodeJS.NodejsFunction;
  readonly table: dynamodb.Table;

  constructor(
    scope: cdk.Construct,
    id: string,
    productsEventsQueue: sqs.Queue,
    table: dynamodb.Table,
    props?: cdk.StackProps) {
    super(scope, id, props);

    this.handler = new lambdaNodeJS.NodejsFunction(this, 'ProductEventsFunction', {
      functionName: 'ProductEventsFunction',
      entry: 'lambdas/productEventsFunction.js',
      handler: 'handler',
      bundling: {
        minify: false,
        sourceMap: false,
      },
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        EVENTS_DDB: table.tableName,
      }
    });

    this.handler.addEventSource(new SqsEventSource(productsEventsQueue)); // fila trigger do lambda

    productsEventsQueue.grantConsumeMessages(this.handler); // dar permissão ao lambda consumir dessa fila
    table.grantWriteData(this.handler); // esse lambda somente escreve na tabela
  }
}
