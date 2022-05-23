/**
 * Эмуляция работы брокера через Tinkoff Invest API.
 * - все операции с одним счетом
 * - рыночные заявки исполняются по цене закрытия
 * - лимитные заявки исполняются, если цена закрытия пересекает лимит
 */

/* eslint-disable max-lines */

import Debug from 'debug';
import { TinkoffInvestApi, Helpers } from 'tinkoff-invest-api';
import { Instrument, InstrumentIdType } from 'tinkoff-invest-api/dist/generated/instruments.js';
import {
  Operation,
  OperationState,
  OperationType,
  PortfolioPosition
} from 'tinkoff-invest-api/dist/generated/operations.js';
import {
  OrderDirection,
  OrderExecutionReportStatus,
  OrderState,
  OrderType,
  PostOrderRequest
} from 'tinkoff-invest-api/dist/generated/orders.js';
import { orderDirectionToString, Orders } from './services/orders.js';
import { Users } from './services/users.js';
import { BrokerOptions, defaults } from './options.js';
import { MarketData } from './services/marketdata.js';
import { MarketDataStream } from './services/marketdata-stream.js';
import { Instruments } from './services/instruments.js';
import { OrdersStream } from './services/orders-stream.js';
import { StopOrders } from './services/stoporders.js';
import { Operations } from './services/operations.js';
import { Sandbox } from './services/sandbox.js';

const debug = Debug('tinkoff-local-broker:index');

export class Broker {
  private lazy: {
    options?: Required<BrokerOptions>
    realApi?: TinkoffInvestApi;
  } = {};

  marketdata: MarketData;
  marketdataStream: MarketDataStream;
  instruments: Instruments;
  users: Users;
  orders: Orders;
  ordersStream: OrdersStream;
  stoporders: StopOrders;
  operations: Operations;
  sandbox: Sandbox;

  // eslint-disable-next-line max-statements
  constructor() {
    this.marketdata = new MarketData(this);
    this.marketdataStream = new MarketDataStream(this);
    this.instruments = new Instruments(this);
    this.users = new Users(this);
    this.orders = new Orders(this);
    this.ordersStream = new OrdersStream(this);
    this.stoporders = new StopOrders(this);
    this.operations = new Operations(this);
    this.sandbox = new Sandbox(this);
  }

  get options() {
    if (!this.lazy.options) throw new Error(`Брокер не сконфигурирован.`);
    return this.lazy.options;
  }

  get realApi() {
    if (this.lazy.realApi) return this.lazy.realApi;
    if (!this.options.token) throw new Error(`Нет токена`);
    this.lazy.realApi = new TinkoffInvestApi({ token: this.options.token });
    return this.lazy.realApi;
  }

  get currentDate() {
    return this.marketdata.currentDate;
  }

  configure(options: BrokerOptions) {
    this.lazy.options = Object.assign({}, defaults, options);
    debug(`Конфигурация свечей:`, this.options.from, this.options.to);
    this.marketdataStream.reset();
    this.marketdata.reset();
    this.operations.reset();
    this.orders.reset();
  }

  /**
   * Переход к следующей исторической свече.
   */
  async tick() {
    const success = this.marketdata.tick();
    if (success) {
      await this.tryExecuteOrders();
      await this.marketdataStream.emitData();
    }
    return success;
  }

  async createOrder(req: PostOrderRequest): Promise<OrderState> {
    const currency = 'rub';
    const lotsRequested = req.quantity;
    const price = req.price
      ? Helpers.toNumber(req.price)
      : await this.marketdata.getCurrentPrice(req.figi);
    const { lot } = await this.getInstrumentByFigi(req.figi);
    const initialOrderPrice = price * lotsRequested * lot;
    const initialComission = initialOrderPrice * this.options.brokerFee / 100;
    const totalOrderAmount = initialOrderPrice + initialComission;
    const order: OrderState = {
      orderId: req.orderId,
      executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
      lotsRequested,
      lotsExecuted: 0,
      initialSecurityPrice: Helpers.toMoneyValue(price, currency),
      initialOrderPrice: Helpers.toMoneyValue(initialOrderPrice, currency),
      initialCommission: Helpers.toMoneyValue(initialComission, currency),
      totalOrderAmount: Helpers.toMoneyValue(totalOrderAmount, currency),
      figi: req.figi,
      direction: req.direction,
      orderType: req.orderType,
      stages: [],
      currency,
      orderDate: this.currentDate,
    };
    this.blockBalance(order, lot);
    return order;
  }

  async tryExecuteOrders() {
    const { orders } = await this.orders.getOrders({ accountId: '' });
    debug(`Пробуем исполнить заявки: ${orders.length}`);
    for (const order of orders) {
      const price = await this.isPriceReached(order);
      if (price) await this.executeOrder(order, price);
    }
  }

  private async executeOrder(order: OrderState, price: number) {
    const instrument = await this.getInstrumentByFigi(order.figi);
    this.setOrderExecuted(order, instrument, price);
    this.updateBalance(order, instrument.lot);
    const mainOperation = this.createOrderOperation(order, instrument);
    const comissionOperation = this.createComissionOperation(order, mainOperation);
    this.operations.pushOperations([ mainOperation, comissionOperation ]);
    const figiOperations = await this.getOperationsByFigi(mainOperation.figi);
    const position = this.createPosition(figiOperations, instrument, price);
    this.operations.replacePortfolioPosition(position);
  }

  /**
   * Заблокировать средства при создании заявки.
   */
  protected blockBalance(order: OrderState, lot: number) {
    if (order.direction === OrderDirection.ORDER_DIRECTION_BUY) {
      const totalOrderAmount = Helpers.toNumber(order.totalOrderAmount) || 0;
      this.operations.blockMoney(totalOrderAmount);
    } else {
      this.operations.blockFigi(order.figi, order.lotsRequested * lot);
    }
  }

  /**
   * Разблокировать средства при отмене заявки.
   */
  async unblockBalance(order: OrderState) {
    if (order.direction === OrderDirection.ORDER_DIRECTION_BUY) {
      const totalOrderAmount = Helpers.toNumber(order.totalOrderAmount) || 0;
      this.operations.blockMoney(-totalOrderAmount);
    } else {
      const { lot } = await this.getInstrumentByFigi(order.figi);
      this.operations.blockFigi(order.figi, -order.lotsRequested * lot);
    }
  }

  /**
   * Обновляем заблокированные ресурсы после успешного выполнения заявки.
   */
  protected updateBalance(order: OrderState, lot: number) {
    const qty = order.lotsExecuted * lot;
    if (order.direction === OrderDirection.ORDER_DIRECTION_BUY) {
      const totalOrderAmount = Helpers.toNumber(order.totalOrderAmount) || 0;
      this.operations.addToBalance(-totalOrderAmount, 'blocked');
      this.operations.addToFigi(order.figi, qty, 'balance');
    } else {
      const executedOrderPrice = Helpers.toNumber(order.executedOrderPrice) || 0;
      const executedCommission = Helpers.toNumber(order.executedCommission) || 0;
      this.operations.addToBalance(executedOrderPrice - executedCommission, 'money');
      this.operations.addToFigi(order.figi, -qty, 'blocked');
    }
  }

  /**
   * Достигнута ли цена, указанная в заявке.
   * (для рыночных всегда достигнута)
   */
  private async isPriceReached(order: OrderState) {
    const prevCandle = await this.marketdata.getCandle(order.figi, -1);
    if (!prevCandle) return false;
    const { low, high, close } = prevCandle;
    switch (order.orderType) {
      case OrderType.ORDER_TYPE_MARKET: return Helpers.toNumber(close);
      case OrderType.ORDER_TYPE_LIMIT: {
        const limitPrice = Helpers.toNumber(order.initialSecurityPrice!);
        const lowPrice = Helpers.toNumber(low!);
        const highPrice = Helpers.toNumber(high!);
        // See also: https://www.tradingview.com/pine-script-docs/en/v5/concepts/Strategies.html?highlight=backtesting#broker-emulator
        if (limitPrice >= lowPrice && limitPrice <= highPrice) return limitPrice;
      }
    }
  }

  private setOrderExecuted(order: OrderState, instrument: Instrument, price: number) {
    order.executionReportStatus = OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_FILL;
    order.lotsExecuted = order.lotsRequested;
    const executedOrderPrice = price * order.lotsExecuted * instrument.lot;
    const executedCommission = executedOrderPrice * this.options.brokerFee / 100;
    const totalOrderAmount = executedOrderPrice + executedCommission;
    order.executedOrderPrice = Helpers.toMoneyValue(executedOrderPrice, order.currency);
    order.executedCommission = Helpers.toMoneyValue(executedCommission, order.currency);
    order.totalOrderAmount = Helpers.toMoneyValue(totalOrderAmount, order.currency);
    order.averagePositionPrice = Helpers.toMoneyValue(price, order.currency);
    logOrderExecuted(order);
  }

  private createOrderOperation(order: OrderState, instrument: Instrument): Operation {
    const isBuy = order.direction === OrderDirection.ORDER_DIRECTION_BUY;
    const operationType = isBuy ? OperationType.OPERATION_TYPE_BUY : OperationType.OPERATION_TYPE_SELL;
    const executedOrderPrice = Helpers.toNumber(order.executedOrderPrice!);
    const payment = isBuy ? -executedOrderPrice : executedOrderPrice;
    return {
      id: order.orderId,
      parentOperationId: '',
      figi: order.figi,
      operationType,
      state: OperationState.OPERATION_STATE_EXECUTED,
      payment: Helpers.toMoneyValue(payment, order.currency),
      price: order.averagePositionPrice,
      currency: order.currency,
      quantity: order.lotsExecuted,
      quantityRest: 0,
      type: getOperationText(operationType),
      instrumentType: instrument.instrumentType,
      trades: [],
      date: this.currentDate,
    };
  }

  private createComissionOperation(order: OrderState, operation: Operation): Operation {
    const payment = -Helpers.toNumber(order.executedCommission!);
    const operationType = OperationType.OPERATION_TYPE_BROKER_FEE;
    return {
      id: `${operation.id}_fee`,
      parentOperationId: operation.id,
      instrumentType: operation.instrumentType,
      figi: order.figi,
      operationType,
      state: OperationState.OPERATION_STATE_EXECUTED,
      payment: Helpers.toMoneyValue(payment, order.currency),
      price: Helpers.toMoneyValue(0, order.currency),
      currency: order.currency,
      quantity: 0,
      quantityRest: 0,
      type: getOperationText(operationType),
      trades: [],
      date: operation.date,
    };
  }

  private createPosition(operations: Operation[], instrument: Instrument, price: number): PortfolioPosition {
    const qtyOperations = operations.filter(o => o.quantity > 0);
    const { sellLots, quantityLots } = calcPositionLots(qtyOperations);
    const quantity = quantityLots * instrument.lot;
    const totalAmountFilo = calcTotalAmount(qtyOperations, sellLots, 'filo');
    const totalAmountFifo = calcTotalAmount(qtyOperations, sellLots, 'fifo');
    const averagePriceFilo = quantity > 0 ? totalAmountFilo / quantity : 0;
    const averagePriceFifo = quantity > 0 ? totalAmountFifo / quantity : 0;
    return {
      figi: operations[ 0 ].figi,
      instrumentType: operations[ 0 ].instrumentType,
      quantityLots: Helpers.toQuotation(quantityLots),
      quantity: Helpers.toQuotation(quantity),
      currentPrice: Helpers.toMoneyValue(price, operations[ 0 ].currency),
      averagePositionPrice: Helpers.toMoneyValue(averagePriceFilo, operations[ 0 ].currency),
      averagePositionPriceFifo: Helpers.toMoneyValue(averagePriceFifo, operations[ 0 ].currency),
    };
  }

  private async getInstrumentByFigi(figi: string) {
    const { instrument } = await this.instruments.getInstrumentBy({
      idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
      classCode: '',
      id: figi,
    });
    if (!instrument) throw new Error(`Нет данных по инструменту: ${figi}`);
    return instrument;
  }

  private async getOperationsByFigi(figi: string) {
    const { operations } = await this.operations.getOperations({
      figi,
      accountId: '',
      state: OperationState.OPERATION_STATE_EXECUTED,
    });
    return operations;
  }
}

function calcPositionLots(operations: Operation[]) {
  const res = { sellLots: 0, buyLots: 0, quantityLots: 0 };
  operations.forEach(o => {
    if (o.operationType === OperationType.OPERATION_TYPE_SELL) {
      res.sellLots += o.quantity;
    } else {
      res.buyLots += o.quantity;
    }
  });
  res.quantityLots = res.buyLots - res.sellLots;
  return res;
}

/**
 * Расчет суммарной стоимости по операциям:
 * - fifo: первым продается то, что было куплено первым
 * - filo: первым продается то, что было куплено последним
 */
function calcTotalAmount(operations: Operation[], selledLots: number, type: 'fifo' | 'filo') {
  if (type === 'filo') operations = operations.reverse();
  return operations
    .filter(o => o.operationType === OperationType.OPERATION_TYPE_BUY)
    .reduce((acc, o) => {
      selledLots -= o.quantity;
      // todo: если была продана только часть заявки, то тут не очень верно
      return selledLots < 0 ? acc + Math.abs(Helpers.toNumber(o.payment!)) : acc;
    }, 0);
}

function getOperationText(operationType: OperationType) {
  switch (operationType) {
    case OperationType.OPERATION_TYPE_BUY: return 'Покупка ЦБ';
    case OperationType.OPERATION_TYPE_SELL: return 'Продажа ЦБ';
    case OperationType.OPERATION_TYPE_BROKER_FEE: return 'Удержание комиссии за операцию';
    default: return '';
  }
}

function logOrderExecuted({ figi, direction, lotsExecuted, executedOrderPrice }: OrderState) {
  debug([
    `Заявка исполнена:`,
    orderDirectionToString(direction),
    figi,
    `${lotsExecuted} lot(s)`,
    Helpers.toMoneyString(executedOrderPrice),
  ].join(' '));
}
