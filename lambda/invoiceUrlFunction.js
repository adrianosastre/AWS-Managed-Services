const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

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
    console.debug(event);
    console.debug(context);

    return {};
}