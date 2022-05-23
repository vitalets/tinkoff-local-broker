/**
 * Эмуляция orders stream (пока заглушка).
 * See: https://tinkoff.github.io/investAPI/marketdata/#marketdatastreamservice
 */

import {
  OrdersStreamServiceServiceImplementation,
  TradesStreamRequest
} from 'tinkoff-invest-api/dist/generated/orders.js';
import { Broker } from '../broker.js';

export class OrdersStream implements OrdersStreamServiceServiceImplementation {
  constructor(private broker: Broker) { }

  async *tradesStream(_: TradesStreamRequest) {
    yield {
      orderTrades: undefined,
    };
  }
}
