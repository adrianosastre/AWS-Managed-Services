import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy } from '@aws-cdk/core';

export class EventsDdbStack extends cdk.Stack {
    readonly table: dynamodb.Table;

    constructor(scope: cdk.Construct, id: string,  props?: cdk.StackProps) {
        super(scope, id, props);

        this.table = new dynamodb.Table(this, 'EventsDdb', {
            tableName: 'events',
            removalPolicy: RemovalPolicy.DESTROY, // o que vai acontecer com o recurso se apagar a stack? padrão do dyn = manter
            partitionKey: {
                name: 'pk', // nome mais genérico
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'sk', // nome mais genérico
                type: dynamodb.AttributeType.STRING,
            },
            timeToLiveAttribute: 'ttl', // cada registro pode ter um time to live diferente!
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // modo de cobrança sob demanda ou provisionado
            //readCapacity: 5, // capacidade de leitura e escrita inicial, unidade = operações de 400kb por segundo + requisições
            //writeCapacity: 5,
        });

        this.table.addGlobalSecondaryIndex({
            indexName: 'usernameIdx',
            partitionKey: {
                name: 'username',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'pk',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL, // INCLUDE = select specific attributes, KEY_ONLY = somente a chave
        });

        /*const readScaling = this.table.autoScaleReadCapacity({
            maxCapacity: 40,
            minCapacity: 1,
        });
        readScaling.scaleOnUtilization({
            targetUtilizationPercent: 50, // a partir de quantos % de utilização começa a reagir
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        const writeScaling = this.table.autoScaleWriteCapacity({
            maxCapacity: 40,
            minCapacity: 1,
        });
        writeScaling.scaleOnUtilization({
            targetUtilizationPercent: 50, // a partir de quantos % de utilização começa a reagir
            scaleInCooldown: cdk.Duration.seconds(60), // tempo que espera para subir uma unidade de capacidade
            scaleOutCooldown: cdk.Duration.seconds(60),
        });*/
    }
}