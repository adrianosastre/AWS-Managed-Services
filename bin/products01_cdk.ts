#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProductsFunctionCdkStack } from '../lib/productsFunction_cdk-stack';
import { ProductsApiStack } from '../lib/productsApi_cdk-stack';
import { ProductsDdbStack } from '../lib/productsDdb_cdk-stack';
import { ProductEventsQueueStack } from './../lib/productEventsQueue_cdk-stack';
import { ProductEventsFunctionStack } from './../lib/productEventsFunction_cdk-stack';
import { EventsDdbStack } from './../lib/eventsDdb_cdk-stack';

const app = new cdk.App();

const productsDdbStack = new ProductsDdbStack(app, 'ProductsDdbStack');

const productEventsQueueStack = new ProductEventsQueueStack(
    app,
    "ProductEventsQueueStack"
);

const productsFunctionStack = new ProductsFunctionCdkStack(
    app,
    'ProductsFunctionStack',
    productsDdbStack.table,
    productEventsQueueStack.productEventsQueue);

productsFunctionStack.addDependency(productsDdbStack);
productsFunctionStack.addDependency(productEventsQueueStack);

const eventsDdbStack = new EventsDdbStack(app, "EventsDdbStack");

const productEventsFunctionStack = new ProductEventsFunctionStack(app,
    "ProductEventsFunctionStack",
    productEventsQueueStack.productEventsQueue,
    eventsDdbStack.table);
productEventsFunctionStack.addDependency(productEventsQueueStack);
productEventsFunctionStack.addDependency(eventsDdbStack);

const productsApiStack = new ProductsApiStack(app, 'ProductsApiStack', productsFunctionStack.handler);
productsFunctionStack.addDependency(productsFunctionStack);
