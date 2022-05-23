/**
 * Эмуляция stoporders (пока заглушка).
 */
import { ServerError, Status } from 'nice-grpc';
import {
  CancelStopOrderResponse,
  GetStopOrdersResponse,
  PostStopOrderResponse,
  StopOrdersServiceServiceImplementation
} from 'tinkoff-invest-api/dist/generated/stoporders.js';
import { Broker } from '../broker.js';

export class StopOrders implements StopOrdersServiceServiceImplementation {
  constructor(private broker: Broker) { }

  async getStopOrders(): Promise<GetStopOrdersResponse> {
    throw new ServerError(Status.UNIMPLEMENTED, '');
  }

  async postStopOrder(): Promise<PostStopOrderResponse> {
    throw new ServerError(Status.UNIMPLEMENTED, '');
  }

  async cancelStopOrder(): Promise<CancelStopOrderResponse> {
    throw new ServerError(Status.UNIMPLEMENTED, '');
  }
}
