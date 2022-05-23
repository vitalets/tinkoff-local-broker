/**
 * npx ts-node-esm src/backtest/server.ts
 */
import { createServer } from 'nice-grpc';
import { InstrumentsServiceDefinition } from 'tinkoff-invest-api/dist/generated/instruments.js';
import {
  MarketDataServiceDefinition,
  MarketDataStreamServiceDefinition
} from 'tinkoff-invest-api/dist/generated/marketdata.js';
import { OperationsServiceDefinition } from 'tinkoff-invest-api/dist/generated/operations.js';
import { OrdersServiceDefinition } from 'tinkoff-invest-api/dist/generated/orders.js';
import { SandboxServiceDefinition } from 'tinkoff-invest-api/dist/generated/sandbox.js';
import { StopOrdersServiceDefinition } from 'tinkoff-invest-api/dist/generated/stoporders.js';
import { UsersServiceDefinition } from 'tinkoff-invest-api/dist/generated/users.js';
import { Broker } from '../broker.js';
import { errorHandlingMiddleware } from './errors.js';

const broker = new Broker();
export const server = createServer().use(errorHandlingMiddleware);

server.add(UsersServiceDefinition, broker.users);
server.add(OrdersServiceDefinition, broker.orders);
server.add(OperationsServiceDefinition, broker.operations);
server.add(MarketDataServiceDefinition, broker.marketdata);
server.add(MarketDataStreamServiceDefinition, broker.marketdataStream);
server.add(InstrumentsServiceDefinition, broker.instruments);
server.add(SandboxServiceDefinition, broker.sandbox);
server.add(StopOrdersServiceDefinition, broker.stoporders);

