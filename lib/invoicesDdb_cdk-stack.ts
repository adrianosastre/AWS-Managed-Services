import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy } from '@aws-cdk/core';

export class InvoicesDdbStack extends cdk.Stack {
    readonly table: dynamodb.Table;

    constructor(scope: cdk.Construct, id: string,  props?: cdk.StackProps) {
        super(scope, id, props);

        this.table = new dynamodb.Table(this, 'InvoicesDdb', {
            tableName: 'invoices',
            removalPolicy: RemovalPolicy.DESTROY, // o que vai acontecer com o recurso se apagar a stack? padrão do dyn = manter
            partitionKey: {
                name: 'pk', // customer
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'sk', // invoice number
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PROVISIONED, // modo de cobrança sob demanda ou provisionado
            readCapacity: 1,
            writeCapacity: 1,
        });
    }
}