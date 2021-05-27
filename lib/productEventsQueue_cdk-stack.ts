import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';

export class ProductEventsQueueStack extends cdk.Stack {
    // outras stacks vão precisar dessa stack da fila:
    readonly productEventsQueue: sqs.Queue;

    constructor(scope: cdk.Construct, id: string,  props?: cdk.StackProps) {
        super(scope, id, props);

        const productEventsDlq = new sqs.Queue(this, "ProductEventsDlq", {
            queueName: "productEvents-dlq",
        });

        this.productEventsQueue = new sqs.Queue(this, "ProductEventsQueue", {
            queueName: "productEvents",
            deadLetterQueue: {
                queue: productEventsDlq,
                maxReceiveCount: 3, // quantas vezes a mensagem falha antes de ir para DLQ
            },
        });

    }
}