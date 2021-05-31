import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';

export class InvoiceImportFunctionStack extends cdk.Stack {
    readonly urlHandler: lambdaNodeJS.NodejsFunction;
    readonly importHandler: lambdaNodeJS.NodejsFunction;

    constructor(
        scope: cdk.Construct,
        id: string,
        invoicesDdb: dynamodb.Table,
        props?: cdk.StackProps) {
        super(scope, id, props);

        // create the bucket first:
        const bucket = new s3.Bucket(this, 'InvoiceBucket', {
            bucketName: 'sastre-invoices', // esse nome tem que ser único na região aws em qualquer conta
            removalPolicy: cdk.RemovalPolicy.DESTROY, // só destroi se o bucket estiver vazio
        });

        // create a function to handle import:
        this.importHandler = new lambdaNodeJS.NodejsFunction(this, 'InvoiceImportFunction', {
            functionName: 'InvoiceImportFunction',
            entry: 'lambda/invoiceImportFunction.js',
            handler: 'handler',
            bundling: {
              minify: false,
              sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 256,
            timeout: cdk.Duration.seconds(30),
            environment: {
              INVOICES_DDB: invoicesDdb.tableName,
            },
        });

        invoicesDdb.grantReadWriteData(this.importHandler); // dá permissão de escrita/leitura ao lambda à tabela

        // s3 to invoke the lambda:
        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED_PUT,
            new s3n.LambdaDestination(this.importHandler)); // gerar eventos quando arquivo for criado

        // permite ao lambda ler e apagar o arquivo:
        bucket.grantRead(this.importHandler);
        bucket.grantDelete(this.importHandler);

        // create function to generate url to import files:
        this.urlHandler = new lambdaNodeJS.NodejsFunction(this, 'InvoiceUrlFunction', {
            functionName: 'InvoiceUrlFunction',
            entry: 'lambda/invoiceUrlFunction.js',
            handler: 'handler',
            bundling: {
              minify: false,
              sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            memorySize: 128,
            timeout: cdk.Duration.seconds(30),
            environment: {
              BUCKET_NAME: bucket.bucketName,
            },
        });

        // permite ao segundo lambda ler e escrever no bucket:
        bucket.grantReadWrite(this.urlHandler);
    }
}