import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export class ProductsFunctionCdkStack extends cdk.Stack {
  readonly handler: lambdaNodeJS.NodejsFunction;

  constructor(
    scope: cdk.Construct,
    id: string,
    productsDdb:
    dynamodb.Table,
    props?: cdk.StackProps) {
    super(scope, id, props);

    const awsRegion = new cdk.CfnParameter(this, 'awsRegion', {
      type: 'String',
      description: 'The AWS Region',
    });

    this.handler = new lambdaNodeJS.NodejsFunction(this, 'ProductsFunction', {
      functionName: 'ProductsFunction',
      entry: 'lambda/productsFunction.js',
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
        REGION: awsRegion.valueAsString,
      },
    });

    productsDdb.grantReadWriteData(this.handler);
  }
}
