/**
 * Простейший робот, который создает заявку, если цена повысилась.
 */

import { Helpers, TinkoffInvestApi } from 'tinkoff-invest-api';
import { CandleInterval } from 'tinkoff-invest-api/dist/generated/marketdata.js';
import { OrderDirection, OrderType } from 'tinkoff-invest-api/dist/generated/orders.js';

const figi = 'BBG004730N88';
export const interval = CandleInterval.CANDLE_INTERVAL_5_MIN

export async function runRobot(api: TinkoffInvestApi) {
  // загружаем свечи за 5 минут
  const { candles } = await api.marketdata.getCandles({ figi, interval, ...Helpers.fromTo('-15m') });

  const [ prevCandle, curCandle ] = candles.slice(-2);
  const prevPrice = Helpers.toNumber(prevCandle.close!);
  const curPrice = Helpers.toNumber(curCandle.close!);

  // если цена повысилась, создаем заявку на покупку
  if (curPrice > prevPrice) {
    const order = await api.orders.postOrder({
      accountId: process.env.ACCOUNT_ID!,
      figi,
      quantity: 1,
      direction: OrderDirection.ORDER_DIRECTION_BUY,
      orderType: OrderType.ORDER_TYPE_MARKET,
      orderId: Math.random().toString(),
    });
    console.log(`Cоздана заявка: ${order.orderId} ${Helpers.toMoneyString(order.initialOrderPrice)}`);
  }
}
