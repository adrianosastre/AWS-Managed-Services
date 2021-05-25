const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const uuid = require('uuid');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const productsDdb = process.env.PRODUCTS_DDB;
const awsRegion = process.env.REGION;

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo

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
            const data = await getAllProducts();
            console.log('GET data:', data);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
        else if (method === 'POST') {
            const product = JSON.parse(event.body);
            product.id = uuid.v4();
            await createProduct(product);
            console.log(`POST data:`, product);
            return{
                statusCode: 201,
                body: JSON.stringify(product),
            };
        }
    }
    else if (event.resource === '/products/{id}') {
        const productId = event.pathParameters.id;
        console.log('productId:', productId);

        if (method === 'GET') {
            const data = await getProductById(productId);
            console.log(`GET/{id} ${productId} data:`, data);
            if (data && data.Item) {
                return {
                    body: JSON.stringify(data.Item),
                }
            } else {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Product with id ${productId} not found`),
                }
            }
        }
        else if (method === 'PUT') {
            console.log(`PUT/{id} ${productId}`);
            const data = await getProductById(productId);
            if (data && data.Item) {
                const product = JSON.parse(event.body);
                const data = await updateProduct(productId, product);
                console.log(`PUT/{id} data`, data);
                return {
                    statusCode: 200,
                    body: JSON.stringify(product),
                }
            } else {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Product with id ${productId} not found`),
                }
            }
        }
        else if (method === 'DELETE') {
            console.log(`DELETE/{id} ${productId}`);
            const data = await getProductById(productId);
            if (data && data.Item) {
                await deleteProduct(productId);
                return {
                    statusCode: 200,
                    body: JSON.stringify(`Product with id ${productId} was deleted`),
                }
            } else {
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

