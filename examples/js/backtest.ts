/**
 * Скрипт для бэктеста робота.
 * npx ts-node-esm examples/js/backtest.ts
 *
 * Предварительно нужно запустить сервер tinkoff-local-broker!
 */

import 'dotenv/config';
import MockDate from 'mockdate';
import { Helpers, TinkoffInvestApi } from 'tinkoff-invest-api';
import { runRobot, interval } from './robot.js';

const api = new TinkoffInvestApi({
  endpoint: 'localhost:8080',
  token: process.env.TINKOFF_API_TOKEN!,
});

main();

async function main() {
  // конфигурируем брокер на диапазон дат
  await configureBroker({
    from: new Date('2022-04-29T12:00:00+03:00'),
    to: new Date('2022-04-29T15:00:00+03:00'),
    candleInterval: interval,
  });

  // итерируем по свечам
  while (await tick()) {
    await runRobot(api);
  }

  // рассчитываем прибыль
  await showExpectedYield();
}

async function showExpectedYield() {
  const { expectedYield } = await api.operations.getPortfolio({ accountId: '' });
  console.log(`Прибыль: ${Helpers.toNumber(expectedYield)}%`);
}

async function configureBroker(config: unknown) {
  await api.orders.postOrder({
    accountId: 'config',
    figi: JSON.stringify(config),
    quantity: 0,
    direction: 0,
    orderType: 0,
    orderId: '',
  });
}

async function tick() {
  const res = await api.orders.postOrder({
    accountId: 'tick',
    figi: '',
    quantity: 0,
    direction: 0,
    orderType: 0,
    orderId: '',
  });
  if (res.message) {
    // устанавливаем глобально текущую дату
    MockDate.set(new Date(res.message));
    return true;
  } else {
    return false;
  }
}
