import { configureBroker } from './system.spec.js';

describe('account', () => {

  before(async () => {
    await configureBroker();
  });

  it('getAccounts', async () => {
    const res = await testApi.users.getAccounts({});
    assert.equal(res.accounts[ 0 ].id, '0000000000');
  });

  it('getPortfolio', async () => {
    const res = await testApi.operations.getPortfolio({ accountId: 'x' });
    assert.deepEqual(res.positions, []);
    assert.deepEqual(res.totalAmountCurrencies, { units: 100_000, nano: 0, currency: 'rub' });
    assert.deepEqual(res.expectedYield, { units: 0, nano: 0 });
  });

   it('getPositions', async () => {
    const positions = await testApi.operations.getPositions({ accountId: '' });
    assert.deepEqual(positions, {
      money: [ { units: 100000, nano: 0, currency: 'rub' } ],
      securities: [],
      blocked: [],
      futures: [],
      limitsLoadingInProgress: false,
    });
  });

});
