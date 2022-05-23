/**
 * Эмуляция orders.
 * See: https://tinkoff.github.io/investAPI/head-orders/
 */
import Debug from 'debug';
import { CallContext } from 'nice-grpc';
import {
  CancelOrderRequest,
  GetOrdersRequest,
  GetOrderStateRequest,
  OrderDirection,
  OrderExecutionReportStatus,
  OrdersServiceServiceImplementation,
  OrderState,
  PostOrderRequest,
  PostOrderResponse,
} from 'tinkoff-invest-api/dist/generated/orders.js';
import { Helpers } from 'tinkoff-invest-api';
import { Broker } from '../broker.js';

const debug = Debug('tinkoff-local-broker:orders');

export class Orders implements OrdersServiceServiceImplementation {
  private orders: OrderState[] = [];

  constructor(private broker: Broker) { }

  reset() {
    this.orders = [];
  }

  async getOrders(_: GetOrdersRequest) {
    const statuses = [
      OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
      OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_PARTIALLYFILL,
    ];
    const orders = this.orders.filter(order => statuses.includes(order.executionReportStatus));
    return { orders };
  }

  async postOrder(req: PostOrderRequest, ctx: CallContext): Promise<PostOrderResponse> {
    const systemOrder = await this.handleSystemOrder(req, ctx);
    if (systemOrder) return systemOrder;
    const order = this.getExistingOrder(req.orderId) || await this.createOrder(req);
    return {
      orderId: order.orderId,
      executionReportStatus: order.executionReportStatus,
      lotsRequested: order.lotsRequested,
      lotsExecuted: order.lotsExecuted,
      initialOrderPrice: order.initialOrderPrice,
      initialSecurityPrice: order.initialSecurityPrice,
      initialCommission: order.initialCommission,
      totalOrderAmount: order.totalOrderAmount,
      figi: order.figi,
      direction: order.direction,
      orderType: order.orderType,
      message: '',
    };
  }

  async cancelOrder({ orderId }: CancelOrderRequest) {
    const order = this.getExistingOrder(orderId);
    if (order) {
      order.executionReportStatus = OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_CANCELLED;
      await this.broker.unblockBalance(order);
    } else {
      throw new Error(`Order not found: ${orderId}`);
    }
    return { time: this.broker.currentDate };
  }

  async getOrderState({ orderId }: GetOrderStateRequest) {
    const order = this.getExistingOrder(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    return order;
  }

  private getExistingOrder(orderId: string) {
    return this.orders.find(o => o.orderId === orderId);
  }

  private async createOrder(req: PostOrderRequest) {
    const order = await this.broker.createOrder(req);
    this.orders.push(order);
    logOrderCreated(order);
    return order;
  }

  // eslint-disable-next-line max-statements
  private async handleSystemOrder(req: PostOrderRequest, ctx: CallContext) {
    if (req.accountId === 'config') {
      const config = JSON.parse(req.figi);
      config.from = new Date(config.from);
      config.to = new Date(config.to);
      config.token = ctx.metadata.get('Authorization')?.replace('Bearer ', '') || '';
      this.broker.configure(config);
      return createSystemOrderResponse(req);
    }
    if (req.accountId === 'tick') {
      const success = await this.broker.tick();
      const order = createSystemOrderResponse(req);
      order.message = success ? this.broker.marketdata.currentDate.toISOString() : '';
      return order;
    }
  }
}

export function orderDirectionToString(direction: OrderDirection) {
  return OrderDirection[direction].replace('ORDER_DIRECTION_', '').toLowerCase();
}

function logOrderCreated({ figi, direction, lotsRequested, initialOrderPrice }: OrderState) {
  debug([
    `Заявка создана:`,
    orderDirectionToString(direction),
    figi,
    `${lotsRequested} lot(s)`,
    Helpers.toMoneyString(initialOrderPrice),
  ].join(' '));
}

function createSystemOrderResponse(req: PostOrderRequest) {
  return {
    orderId: '',
    executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
    lotsRequested: 0,
    lotsExecuted: 0,
    figi: '',
    direction: req.direction,
    orderType: req.orderType,
    message: ''
  };
}
