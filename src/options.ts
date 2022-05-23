import { CandleInterval } from 'tinkoff-invest-api/dist/generated/marketdata.js';

export interface BrokerOptions {
  /** Токен Тинькофф API. Используется для разовой загрузки данных. Можно readonly. */
  token: string;
  /** Стартовая дата бэктестинга */
  from: Date;
  /** Конечная дата бэктестинга */
  to: Date;
  /** Интервал свечей */
  candleInterval: CandleInterval,
  /** Начальный капитал */
  initialCapital?: number;
  /** Комиссия брокера, % от суммы сделки */
  brokerFee?: number;
  /** Директория для кеширования данных */
  cacheDir?: string,
}

export const defaults: Required<Pick<BrokerOptions, 'initialCapital' | 'brokerFee' | 'cacheDir'>> = {
  initialCapital: 100_000,
  brokerFee: 0.3,
  cacheDir: '.cache',
};
