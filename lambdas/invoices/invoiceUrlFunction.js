const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const uuid = require('uuid');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const awsRegion = process.env.AWS_REGION;
const bucketName = process.env.BUCKET_NAME;

AWS.config.update({
    region: awsRegion,
});

const s3Client = new AWS.S3({
    region: awsRegion,
});


// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.debug('event', event); // evento vindo de um api gateway
    console.debug('context', context);
    const method = event.httpMethod;

    const apiGwRequestId = event.requestContext.requestId; // request id da api gtw (chamou o lambda)
    const lambdaRequestId = context.awsRequestId; // request id do lambda

    console.debug(`API Gateway Request Id: ${apiGwRequestId} , Lambda Request Id: ${lambdaRequestId}`);

    if (method == 'POST') {
        const key = uuid.v4();
        const params = {
            Bucket: bucketName,
            Key: key, // file name in s3
            Expires: 300, // time in seconds
        };

        const signedUrl = await s3Client.getSignedUrl('putObject', params);
        console.info('signedUrl:', signedUrl);

        return {
            statusCode: 200,
            body: JSON.stringify({
                url: signedUrl,
                expires: 300,
            }),
        };
    }

    return {
        statusCode: 400,
        headers: {},
        body: JSON.stringify('Bad request'),
    };
}