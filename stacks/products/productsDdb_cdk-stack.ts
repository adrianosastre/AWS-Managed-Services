import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy } from '@aws-cdk/core';

export class ProductsDdbStack extends cdk.Stack {
    readonly table: dynamodb.Table;

    constructor(scope: cdk.Construct, id: string,  props?: cdk.StackProps) {
        super(scope, id, props);

        this.table = new dynamodb.Table(this, 'ProductsDdb', {
            tableName: 'products',
            removalPolicy: RemovalPolicy.DESTROY, // o que vai acontecer com o recurso se apagar a stack? padrão do dyn = manter
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // modo de cobrança sob demanda ou provisionado
        });
    }
}