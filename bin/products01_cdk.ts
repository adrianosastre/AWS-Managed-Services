#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProductsFunctionCdkStack } from '../lib/productsFunction_cdk-stack';
import { ProductsApiStack } from '../lib/productsApi_cdk-stack';
import { ProductsDdbStack } from '../lib/productsDdb_cdk-stack';
import { ProductEventsQueueStack } from './../lib/productEventsQueue_cdk-stack';
import { ProductEventsFunctionStack } from './../lib/productEventsFunction_cdk-stack';
import { EventsDdbStack } from './../lib/eventsDdb_cdk-stack';
import { InvoicesDdbStack } from './../lib/invoicesDdb_cdk-stack';
import { InvoiceImportFunctionStack } from './../lib/invoiceImportFunction_cdk-stack';

const app = new cdk.App();

// Stack da tabela de produtos:
const productsDdbStack = new ProductsDdbStack(
    app,
    'ProductsDdbStack'
);

// Stack da fila de eventos de produtos:
const productEventsQueueStack = new ProductEventsQueueStack(
    app,
    "ProductEventsQueueStack"
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

// Stack do S3 e da função lambda de importação de pedidos:
const invoiceImportFunctionStack = new InvoiceImportFunctionStack(
    app,
    'InvoiceImportFunctionStack',
    invoicesDdbStack.table
);
invoiceImportFunctionStack.addDependency(invoicesDdbStack);

// Stack da API Gateway:
const productsApiStack = new ProductsApiStack(
    app,
    'ProductsApiStack',
    productsFunctionStack.handler,
    invoiceImportFunctionStack.urlHandler
);
productsFunctionStack.addDependency(productsFunctionStack);
productsFunctionStack.addDependency(invoiceImportFunctionStack);

