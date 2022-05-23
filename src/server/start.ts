import Debug from 'debug';
import { server } from './index.js';

const debug = Debug('tinkoff-local-broker:server');

main();

async function main() {
  const address = `localhost:${process.env.PORT || '8080'}`;
  await server.listen(address);
  debug(`Running: ${address}`);
}
