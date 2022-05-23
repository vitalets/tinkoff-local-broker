import { CandleInterval } from 'tinkoff-invest-api/dist/generated/marketdata.js';
import { BrokerOptions } from '../../src/options.js';
import MockDate from 'mockdate';

export async function configureBroker(config: Partial<BrokerOptions> = {}) {
  config.from = config.from || new Date('2022-04-29T10:00:00+03:00');
  config.to = config.to || new Date('2022-04-29T19:00:00+03:00');
  config.candleInterval = config.candleInterval || CandleInterval.CANDLE_INTERVAL_1_MIN;
  await testApi.orders.postOrder({
    accountId: 'config',
    figi: JSON.stringify(config),
    quantity: 0,
    direction: 0,
    orderType: 0,
    orderId: '',
  });
  await tickBroker();
}

export async function tickBroker() {
  const res = await testApi.orders.postOrder({
    accountId: 'tick',
    figi: '',
    quantity: 0,
    direction: 0,
    orderType: 0,
    orderId: '',
  });
  if (res.message) {
    MockDate.set(new Date(res.message));
    return true;
  } else {
    return false;
  }
}

describe('system', () => {

  it('configure', async () => {
    // todo
  });

});
