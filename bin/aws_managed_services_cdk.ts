#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ApiCognitoAndTriggerFunctionsStack } from '../stacks/api/apiCognitoAndTriggerFunctions_cdk-stack';
import { ProductsFunctionCdkStack } from '../stacks/products/productsFunction_cdk-stack';
import { ProductsDdbStack } from '../stacks/products/productsDdb_cdk-stack';
import { ProductEventsQueueStack } from '../stacks/events/productEventsQueue_cdk-stack';
import { ProductEventsFunctionStack } from '../stacks/events/productEventsFunction_cdk-stack';
import { EventsDdbStack } from '../stacks/events/eventsDdb_cdk-stack';
import { InvoicesDdbStack } from '../stacks/invoices/invoicesDdb_cdk-stack';
import { InvoiceImportS3AndFunctionsStack } from '../stacks/invoices/invoiceImportS3AndFunctions_cdk-stack';
import { InvoiceEventsFunctionStack } from '../stacks/events/invoiceEventsFunction_cdk-stack';
import { ProductEventsFetchFunctionStack } from '../stacks/products/productEventsFetchFunction_cdk-stack';

const app = new cdk.App();

// Stack da tabela de produtos:
const productsDdbStack = new ProductsDdbStack(
    app,
    'ProductsDdbStack'
);

// Stack da fila de eventos de produtos:
const productEventsQueueStack = new ProductEventsQueueStack(
    app,
    'ProductEventsQueueStack'
);

// Stack da função lambda de produtos:
const productsFunctionStack = new ProductsFunctionCdkStack(
    app,
    'ProductsFunctionStack',
    productsDdbStack.table,
    productEventsQueueStack.productEventsQueue
);
productsFunctionStack.addDependency(productsDdbStack);
productsFunctionStack.addDependency(productEventsQueueStack);

// Stack da tabela de eventos:
const eventsDdbStack = new EventsDdbStack(
    app,
    'EventsDdbStack'
);

// Stack da função lambda de eventos de produtos:
const productEventsFunctionStack = new ProductEventsFunctionStack(
    app,
    'ProductEventsFunctionStack',
    productEventsQueueStack.productEventsQueue,
    eventsDdbStack.table
);
productEventsFunctionStack.addDependency(productEventsQueueStack);
productEventsFunctionStack.addDependency(eventsDdbStack);

// Stack da tabela de pedidos:
const invoicesDdbStack = new InvoicesDdbStack(
    app,
    'InvoicesDdbStack'
);

// Stack da função lambda de eventos de invoices:
const invoiceEventsFunctionStack = new InvoiceEventsFunctionStack(
    app,
    'InvoiceEventsFunctionStack',
    eventsDdbStack.table
);
invoiceEventsFunctionStack.addDependency(eventsDdbStack);

// Stack do S3 e das funções lambda de importação de pedidos:
const invoiceImportS3AndFunctionsStack = new InvoiceImportS3AndFunctionsStack(
    app,
    'InvoiceImportS3AndFunctionsStack',
    invoicesDdbStack.table,
    invoiceEventsFunctionStack.handler,
);
invoiceImportS3AndFunctionsStack.addDependency(invoicesDdbStack);
invoiceImportS3AndFunctionsStack.addDependency(invoiceEventsFunctionStack);

const productEventsFetchFunctionStack = new ProductEventsFetchFunctionStack(
    app,
    'ProductEventsFetchFunctionStack',
    eventsDdbStack.table
);

// Stack da API Gateway:
const apiStack = new ApiCognitoAndTriggerFunctionsStack(
    app,
    'ApiCognitoAndTriggerFunctionsStack',
    productsFunctionStack.handler,
    invoiceImportS3AndFunctionsStack.urlHandler,
    productEventsFetchFunctionStack.handler
);
apiStack.addDependency(productsFunctionStack);
apiStack.addDependency(invoiceImportS3AndFunctionsStack);
apiStack.addDependency(productEventsFetchFunctionStack);

