const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const uuid = require('uuid');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const productsDdb = process.env.PRODUCTS_DDB;
const awsRegion = process.env.AWS_REGION;
const productEventsQueueUrl = process.env.PRODUCT_EVENTS_QUEUE_URL;

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo
const sqsClient = new AWS.SQS({apiVersion: "2012-11-05"}); // cliente que se conecta ao sqs

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.log('event:', event);
    console.log('context:', context);
    const method = event.httpMethod;

    const apiGwRequestId = event.requestContext.requestId; // request id da api gtw (chamou o lambda)
    const lambdaRequestId = context.awsRequestId; // request id do lambda

    console.log(`API Gateway Request Id: ${apiGwRequestId} , Lambda Request Id: ${lambdaRequestId}`);

    if (event.resource === '/products') {
        if (method === 'GET') {
            console.debug(`GET ...`);
            const data = await getAllProducts();
            console.debug(`GET data:`, data);

            console.log(`GET will return 200 OK with ${data.Count} products:`, data.Items);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
        else if (method === 'POST') {
            console.debug(`POST ...`);
            const product = JSON.parse(event.body);
            product.id = uuid.v4();

            const createProductPromise = createProduct(product);

            const messageSentPromise = sendMessage(product, "PRODUCT_CREATED", "adrianosastre", lambdaRequestId);

            const results = await Promise.all([createProductPromise, messageSentPromise]);

            console.log(`POST sent PRODUCT_CREATED message with id: ${results[1].MessageId}`);
            console.log(`POST will return 201 CREATED for product:`, product);

            return{
                statusCode: 201,
                body: JSON.stringify(product),
            };
        }
    }
    else if (event.resource === '/products/{id}') {
        const productId = event.pathParameters.id;

        if (method === 'GET') {
            console.debug(`GET/${productId} ...`);
            const data = await getProductById(productId);
            console.debug(`GET/${productId} data:`, data);

            if (data && data.Item) {
                console.log(`GET/${productId} will return 200 OK for product:`, data.Item);

                return {
                    body: JSON.stringify(data.Item),
                }
            } else {
                console.log(`GET/${productId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Product with id ${productId} not found`),
                }
            }
        }
        else if (method === 'PUT') {
            console.debug(`PUT/${productId} ...`);
            const data = await getProductById(productId);

            if (data && data.Item) {
                const product = JSON.parse(event.body);
                product.id = productId;

                const updateProductPromise = updateProduct(productId, product);

                const messageSentPromise = sendMessage(product, "PRODUCT_UPDATED", "gira", lambdaRequestId);

                const results = await Promise.all([updateProductPromise, messageSentPromise]);
                console.debug(`PUT/${productId} data:`, results[0]);

                console.log(`PUT/${productId} sent PRODUCT_UPDATED message with id: ${results[1].MessageId}`);
                console.log(`PUT/${productId} will return 200 OK for product:`, product);

                return {
                    statusCode: 200,
                    body: JSON.stringify(product),
                }
            } else {
                console.warn(`PUT/${productId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Product with id ${productId} not found`),
                }
            }
        }
        else if (method === 'DELETE') {
            console.debug(`DELETE/${productId} ...`);
            const data = await getProductById(productId);

            if (data && data.Item) {
                await deleteProduct(productId);
                console.debug(`DELETE/${productId} data:`, data);

                const product = data.Item;
                const messageSent = await sendMessage(product, "PRODUCT_DELETED", "JM", lambdaRequestId);

                console.log(`DELETE/${productId} sent PRODUCT_DELETED message with id: ${messageSent.MessageId}`);
                console.log(`DELETE/${productId} will return 200 OK`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(`Product with id ${productId} was deleted`),
                }
            } else {
                console.warn(`DELETE/${productId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Product with id ${productId} not found`),
                }
            }
        }
    }

    return {
        statusCode: 400,
        headers: {},
        body: JSON.stringify('Bad Request!'),
    };
};

function sendMessage(product, event, username, lambdaRequestId) {
    let params = {
        MessageBody: JSON.stringify({
            requestId: lambdaRequestId,
            eventType: event,
            productId: product.id,
            productCode: product.code,
            username: username,
        }),
        QueueUrl: productEventsQueueUrl
    };

    return sqsClient.sendMessage(params).promise();
}

function getAllProducts() {
    try {
        return ddbClient.scan({
            TableName: productsDdb,
        })
        .promise();
    } catch (err) {
        return err;
    }
}

function getProductById(productId) {
    try {
        return ddbClient.get({
            TableName: productsDdb,
            Key: {
                id: productId
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function createProduct(product) {
    try {
        return ddbClient.put({
            TableName: productsDdb,
            Item: {
                id: product.id,
                productName: product.productName,
                code: product.code,
                price: product.price,
                model: product.model,
            },
        }).promise();
    } catch (err) {
        return err;
    }
}

function updateProduct(productId, product) {
    try {
        return ddbClient.update({
            TableName: productsDdb,
            Key: {
                id: productId,
            },
            UpdateExpression: "set productName = :n, code = :c, price = :p, model= :m",
            ExpressionAttributeValues: {
                ":n": product.productName,
                ":c": product.code,
                ":p": product.price,
                ":m": product.model,
            },
            ReturnValues: "UPDATED_NEW",
        }).promise();
    } catch (err) {
        return err;
    }
}

function deleteProduct(productId) {
    try {
        return ddbClient.delete({
            TableName: productsDdb,
            Key: {
                id: productId,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

