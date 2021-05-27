const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const { create } = require('ts-node');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const awsRegion = process.env.AWS_REGION; // padrão do AWS
const productEventsDdb = process.env.EVENTS_DDB; // vem do stack

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.log("event: ", event);

    const promises = [];

    event.Records.forEach(record => {
        console.log(`Message Id: ${record.messageId}`);
        const body = JSON.parse(record.body);
        console.log(`Message Body:`, body);

        promises.push(createEvent(body, record.messageId));
    });

    await Promise.all(promises); // aguarda todos os eventos serem concluídos

    return {};
};

function createEvent(body, messageId) {
    const timestamp = Date.now();
    const ttl = ~~(timestamp / 1000 + 5 * 60); // 5 minutes ahead

    try {
        return ddbClient.put({
            TableName: productEventsDdb,
            Item: {
                pk: `#product_${body.productCode}`,
                sk: `${body.eventType}_${timestamp}`,
                ttl: ttl, // valor em segundos a partir de quando o registro foi criado, para ser apagado no futuro
                requestId: body.requesId,
                eventType: body.eventType,
                productId: body.productId,
                username: body.username,
                createdAt: timestamp,
                messageId: messageId,
            },
        }).promise();
    }
    catch(err) {
        console.error(err);
    }
}
