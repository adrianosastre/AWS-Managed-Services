const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const awsRegion = process.env.AWS_REGION; // padrão do AWS
const invoiceEventsDdb = process.env.INVOICE_EVENTS_DDB; // vem do stack

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.debug('event: ', event);

    await createEvent(event.invoice, event.key);

    // dar uma resposta a quem invocou esse lambda:
    context.succeed(JSON.stringify({
        invoiceEventCreated: true,
        message: 'OK',
    }));
}

function createEvent(invoice, key) {
    const timestamp = Date.now();
    const ttl = ~~(timestamp / 1000 + 60 * 60 * 24 * 7); // 1 semana
    try {
        return ddbClient.put({
            TableName: invoiceEventsDdb,
            Item: {
                pk: `#invoice_${invoice.customerName}`, // futuramente pesquisar por customer
                sk: invoice.invoiceNumber,
                ttl: ttl,
                username: invoice.customerName,
                createdAt: timestamp,
                key: key,
            },
        }).promise();
    } catch (err) {
        console.error(err);
    }
}