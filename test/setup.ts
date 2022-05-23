import 'dotenv/config';
import assert from 'assert';
import { TinkoffInvestApi } from 'tinkoff-invest-api';
import { server } from '../src/server/index.js';

type Assert = typeof assert.strict;

declare global {
  const assert: Assert;
  const testApi: TinkoffInvestApi;
}

before(async () => {
  const port = await server.listen(`localhost:0`);
  const testApi = new TinkoffInvestApi({
    token: process.env.TINKOFF_API_TOKEN_READONLY!,
    endpoint: `localhost:${port}`,
  });

  Object.assign(global, {
    assert: assert.strict,
    testApi,
  });
});

after(async () => {
  //await server.shutdown();
  server.forceShutdown();
});
