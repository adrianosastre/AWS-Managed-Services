import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as sqs from '@aws-cdk/aws-sqs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export class InvoiceEventsFunctionStack extends cdk.Stack {
    readonly handler: lambdaNodeJS.NodejsFunction;

    constructor(
        scope: cdk.Construct,
        id: string,
        invoiceEventsDdb: dynamodb.Table,
        props?: cdk.StackProps) {
        super(scope, id, props);

        const dlq = new sqs.Queue(this, "InvoiceEventsDlq", {
            queueName: 'InvoiceEvents-dlq',
        });

        this.handler = new lambdaNodeJS.NodejsFunction(this, 'InvoiceEventsFunction', {
            functionName: 'InvoiceEventsFunction',
            entry: 'lambda/invoiceEventsFunction.js',
            handler: 'handler',
            bundling: {
              minify: false,
              sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 256,
            timeout: cdk.Duration.seconds(30),
            environment: {
              INVOICE_EVENTS_DDB: invoiceEventsDdb.tableName,
            },
            deadLetterQueueEnabled: true,
            deadLetterQueue: dlq,
        });

        invoiceEventsDdb.grantWriteData(this.handler); // lambda só escreve na tabela
    }
}
