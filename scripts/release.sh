#!/bin/sh

# Exit on any error
set -euo pipefail

TAG=$1

npm run lint
npm t
npm run build:ts
docker buildx build --push --platform linux/amd64,linux/arm64 -t vitalets/tinkoff-local-broker:$TAG .
