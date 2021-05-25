#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProductsFunctionCdkStack } from '../lib/productsFunction_cdk-stack';
import { ProductsApiStack } from '../lib/productsApi_cdk-stack';
import { ProductsDdbStack } from '../lib/productsDdb_cdk-stack';

const app = new cdk.App();

const productsDdbStack = new ProductsDdbStack(app, 'ProductsDdbStack');

const productsFunctionStack = new ProductsFunctionCdkStack(app, 'ProductsFunctionStack', productsDdbStack.table);
productsFunctionStack.addDependency(productsDdbStack);

const productsApiStack = new ProductsApiStack(app, 'ProductsApiStack', productsFunctionStack.handler);
productsFunctionStack.addDependency(productsFunctionStack);
