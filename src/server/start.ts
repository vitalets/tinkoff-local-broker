import { server } from './index.js';

main();

async function main() {
  const address = `0.0.0.0:${process.env.PORT || '8080'}`;
  await server.listen(address);
  console.log(`Running: ${address}`); // eslint-disable-line no-console
}
