const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.debug('event:', event);
    context.done(null, event); // se retornar erro no lugar de null, está negando a authorização
};