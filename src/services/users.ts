/**
 * Эмуляция users.
 * See: https://tinkoff.github.io/investAPI/head-users/
 */
import {
  AccessLevel,
  Account,
  AccountStatus,
  AccountType,
  GetAccountsRequest,
  GetInfoRequest,
  GetMarginAttributesRequest,
  GetUserTariffRequest,
  UsersServiceServiceImplementation,
} from 'tinkoff-invest-api/dist/generated/users.js';
import { Broker } from '../broker.js';

export class Users implements UsersServiceServiceImplementation {
  private account: Account = {
    id: '0000000000',
    type: AccountType.ACCOUNT_TYPE_TINKOFF,
    name: 'Local broker account',
    status: AccountStatus.ACCOUNT_STATUS_OPEN,
    accessLevel: AccessLevel.ACCOUNT_ACCESS_LEVEL_FULL_ACCESS,
    openedDate: new Date(),
  };

  constructor(private broker: Broker) { }

  async getAccounts(_: GetAccountsRequest) {
    return {
      accounts: [ this.account ],
    };
  }

  async getInfo(_: GetInfoRequest) {
    return {
      premStatus: false,
      qualStatus: false,
      qualifiedForWorkWith: [],
      tariff: 'investor',
    };
  }

  async getMarginAttributes(_: GetMarginAttributesRequest) {
    return {};
  }

  async getUserTariff(_: GetUserTariffRequest) {
    return {
      unaryLimits: [],
      streamLimits: [],
    };
  }
}
