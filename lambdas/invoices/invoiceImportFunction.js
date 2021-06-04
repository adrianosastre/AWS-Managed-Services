const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const invoiceDdb = process.env.INVOICES_DDB;
const awsRegion = process.env.AWS_REGION;
const invoiceEventsFunctionName = process.env.INVOICE_EVENTS_FUNCTION_NAME;

AWS.config.update({
    region: awsRegion,
});

const s3Client = new AWS.S3({
    region: awsRegion,
});

const lambdaClient = new AWS.Lambda();

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.debug('event:', event);
    console.debug('context:', context);

    console.debug('event.Records[0].s3', event.Records[0].s3);

    const params = {
        Bucket: event.Records[0].s3.bucket.name,
        Key: event.Records[0].s3.object.key,
    };

    // download file:
    const object = await s3Client.getObject(params).promise();
    const invoice = JSON.parse(object.Body.toString('utf-8')); // conteúdo do arquivo
    console.debug('invoice contents:', invoice);

    // guardar na tabela e apagar o arquivo:
    const createInvoicePromise = createInvoice(invoice, params.Key);
    const deleteInvoicePromise = s3Client.deleteObject(params).promise();
    const createInvoiceEventPromise = createInvoiceEvent(invoice, params.Key);
    const results = await Promise.all([
        createInvoicePromise,
        deleteInvoicePromise,
        createInvoiceEventPromise
    ]);

    console.log('createInvoiceEvent function response:', results[2]);

    return {};
}

function createInvoiceEvent(invoice, key) {
    const params = {
        FunctionName: invoiceEventsFunctionName,
        InvocationType: 'RequestResponse', // RequestResponse = invocação síncrona
        Payload: JSON.stringify({
            invoice: invoice,
            key: key,
        }),
    };
    console.log(`invoke lambda ${invoiceEventsFunctionName} with params: `, params);
    return lambdaClient.invoke(params).promise();
}

function createInvoice(invoice, key) {
    try {
        return ddbClient.put({
            TableName: invoiceDdb,
            Item: {
                pk: invoice.customerName,
                sk: invoice.invoiceNumber,
                totalValue: invoice.totalValue,
                productId: invoice.productId,
                quantity: invoice.quantity,
                key: key,
            },
        }).promise();
    } catch(err) {
        console.error(err);
    }
}