const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios').default;

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const awsRegion = process.env.AWS_REGION;
const cognitoPoolId = process.env.COGNITO_USER_POOL_ID;

AWS.config.update({
    region: awsRegion,
});

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.debug('event:', event);
    console.debug('cognitoPoolId:', cognitoPoolId);

    const token = event.token;
    console.debug(token);

    let errorMessage = null;

    const tokenSections = (token || '').split('.');
    if (tokenSections.length < 2) {
      errorMessage = 'Requested token is invalid';
    }
    else {
        const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
        const header = JSON.parse(headerJSON);

        const cognitoIssuer = `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoPoolId}`;

        const keys = await getCognitoPublicKeys(cognitoIssuer);

        const kid = keys[header.kid];
        if (kid === undefined) {
            errorMessage = 'Claim made for unknown kid';
        } else {

            const claim = jwt.verify(token, kid.pem);
            const currentSeconds = Math.floor( (new Date()).valueOf() / 1000);

            if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
                errorMessage = 'Claim is expired or invalid';
            }
            else if (claim.iss !== cognitoIssuer) {
                errorMessage = 'Claim issuer is invalid';
            }
            else if (claim.token_use !== 'access') {
                errorMessage = 'Claim use is not access';
            }

            if (!errorMessage) {
                console.debug(`Claim confirmed for Cognito username ${claim.username}: `, claim);
                console.info(`Returning cognito current user id: ${claim.username}: `);

                // dar uma resposta de sucesso a quem invocou esse lambda:

                context.succeed(claim.username);
            }
        }
    }

    if (errorMessage) {
        // dar uma resposta de erro a quem invocou esse lambda:
        console.error(`Error to return current user id: ${errorMessage}`);

        context.error();
    }

};

async function getCognitoPublicKeys (cognitoIssuer) {
    const url = `${cognitoIssuer}/.well-known/jwks.json`;
    console.debug(`will get url: ${url} ...`);

    const publicKeys = await axios.get(url);

    var cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
        const pem = jwkToPem(current);
        agg[current.kid] = {instance: current, pem};
        return agg;
    }, {} );

    return cacheKeys;
};