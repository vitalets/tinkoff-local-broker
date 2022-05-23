/**
 * Эмуляция sandbox.
 * See: https://tinkoff.github.io/investAPI/head-sandbox/
 */
import { Helpers } from 'tinkoff-invest-api';
import {
  CloseSandboxAccountRequest,
  OpenSandboxAccountRequest,
  SandboxPayInRequest,
  SandboxServiceServiceImplementation
} from 'tinkoff-invest-api/dist/generated/sandbox.js';
import { Broker } from '../broker.js';

export class Sandbox implements SandboxServiceServiceImplementation {
  constructor(private broker: Broker) { }

  async getSandboxAccounts(req: Parameters<SandboxServiceServiceImplementation['getSandboxAccounts']>[0]) {
    return this.broker.users.getAccounts(req);
  }

  async getSandboxPortfolio(req: Parameters<SandboxServiceServiceImplementation['getSandboxPortfolio']>[0]) {
    return this.broker.operations.getPortfolio(req);
  }

  async getSandboxOperations(req: Parameters<SandboxServiceServiceImplementation['getSandboxOperations']>[0]) {
    return this.broker.operations.getOperations(req);
  }

  async getSandboxPositions(req: Parameters<SandboxServiceServiceImplementation['getSandboxPositions']>[0]) {
    return this.broker.operations.getPositions(req);
  }

  async postSandboxOrder(...args: Parameters<SandboxServiceServiceImplementation['postSandboxOrder']>) {
    return this.broker.orders.postOrder(...args);
  }

  async cancelSandboxOrder(req: Parameters<SandboxServiceServiceImplementation['cancelSandboxOrder']>[0]) {
    return this.broker.orders.cancelOrder(req);
  }

  async getSandboxOrders(req: Parameters<SandboxServiceServiceImplementation['getSandboxOrders']>[0]) {
    return this.broker.orders.getOrders(req);
  }

  async getSandboxOrderState(req: Parameters<SandboxServiceServiceImplementation['getSandboxOrderState']>[0]) {
    return this.broker.orders.getOrderState(req);
  }

  async openSandboxAccount(_: OpenSandboxAccountRequest) {
    const { accounts } = await this.getSandboxAccounts({});
    return {
      accountId: accounts[0].id
    };
  }

  async closeSandboxAccount(_: CloseSandboxAccountRequest) {
    return {};
  }

  async sandboxPayIn(_: SandboxPayInRequest) {
    return {
      balance: Helpers.toMoneyValue(0, 'rub'),
    };
  }
}
