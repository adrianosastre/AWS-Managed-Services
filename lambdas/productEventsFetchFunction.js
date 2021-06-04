const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const awsRegion = process.env.AWS_REGION;
const productEventsDdb = process.env.PRODUCT_EVENTS_TABLE_NAME;

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function (event, context) {
    console.log('event:', event);
    console.log('context:', context);

    const apiGwRequestId = event.requestContext.requestId; // request id da api gtw (chamou o lambda)
    const lambdaRequestId = context.awsRequestId; // request id do lambda

    console.log(`API Gateway Request Id: ${apiGwRequestId} , Lambda Request Id: ${lambdaRequestId}`);

    if (event.resource === '/products/events/{code}') {
        const data = await getEventsByCode(event.pathParameters.code);
        return {
            body: JSON.stringify(convertItemsToEvents(data.Items)),
        };
    } else if (event.resource === '/products/events/{code}/{event}') {
        const data = await getEventsByCodeAndEvent(event.pathParameters.code, event.pathParameters.event);
        return {
            body: JSON.stringify(convertItemsToEvents(data.Items)),
        };
    } else if (event.resource === '/products/events') {
        if (event.queryStringParameters && event.queryStringParameters.username) {
            const data = await getEventsByUsername(event.queryStringParameters.username);
            return {
                body: JSON.stringify(convertItemsToEvents(data.Items)),
            };
        }
    }

    return {
        statusCode: 400,
        headers: {},
        body: JSON.stringify('Bad Request!'),
    };
};

function convertItemsToEvents(items) { // DTO convertion
    return items.map((item) => {
        return {
            createdAt: item.createdAt,
            eventType: item.sk.split('#')[0],
            username: item.username,
            productId: item.productId,
            requestId: item.requestId,
            code: item.pk.split('_')[1],
        };
    });
}

function getEventsByCode(code) { // Pesquisa somente com a PK
    try {
        const params = {
            TableName: productEventsDdb,
            KeyConditionExpression: 'pk = :code',
            ExpressionAttributeValues: {
                ':code': `#product_${code}`,
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        console.error(err);
    }
}

function getEventsByCodeAndEvent(code, event) { // Pesquisa com PK e SK parcial
    try {
        const params = {
            TableName: productEventsDdb,
            KeyConditionExpression: 'pk = :code AND begins_with(sk, :event)',
            ExpressionAttributeValues: {
                ':code': `#product_${code}`,
                ':event': event
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        console.error(err);
    }
}

function getEventsByUsername(username) { // Se não tem índice, pesquisa por scan
    try {
        const params = {
            TableName: productEventsDdb,
            FilterExpression: 'username = :username AND begins_with(pk, :prefix)',
            ExpressionAttributeValues: {
                ':username': username,
                ':prefix': '#product_',
            },
        };
        return ddbClient.scan(params).promise();
    } catch (err) {
        console.error(err);
    }
}