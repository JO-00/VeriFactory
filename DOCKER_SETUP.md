# VeriFactory Docker setup

This setup provides:
- Anvil on http://127.0.0.1:8545 (chain ID 31337)
- IPFS API on http://127.0.0.1:5001
- IPFS gateway on http://127.0.0.1:8080
- An optional one-shot Python simulation-data generator

## Install prerequisites

Install Docker Engine and the Docker Compose plugin, then verify:

```bash
docker --version
docker compose version
```

## Start Anvil and IPFS

Run these commands from the VeriFactory repository root (the directory containing
`hashgraph/`, `Simulation/`, and `contracts_deployment/`):

```bash
docker compose up -d
docker compose ps
```

Wait for Anvil to become healthy. Verify it:

```bash
cast chain-id --rpc-url http://127.0.0.1:8545
```

Expected result:

```text
31337
```

If `cast` is not installed on the host, run it inside the Anvil container:

```bash
docker exec verifactory-anvil cast chain-id --rpc-url http://127.0.0.1:8545
```

Check IPFS:

```bash
curl -X POST http://127.0.0.1:5001/api/v0/id
```

The IPFS API and gateway are bound to localhost, not exposed to your LAN.

## Run the Python simulation generator (optional)

From the repository root:

```bash
docker compose --profile tools build simulation-generator
docker compose --profile tools run --rm simulation-generator
```

The generator writes:

- `Simulation/Workflow/Init/facilities.json`
- `Simulation/Workflow/Init/ecdsa_keys.csv`

These files contain generated development identities/private keys. Keep them local,
do not commit them, and do not reuse these keys outside the local simulation.

## Connect the TypeScript deployment scripts

The deployment scripts in `contracts_deployment/local_test/` currently connect to:

```text
http://127.0.0.1:8545
```

That is correct when you run the TypeScript scripts directly on the host.

Create the local environment file:

```bash
cp contracts_deployment/.env.example contracts_deployment/.env
```

Set `ANVIL_PRIVATE_KEY` to a local Anvil development account key in that file.
Do not use a real wallet key. Do not commit `.env`.

Install the TypeScript dependencies:

```bash
cd contracts_deployment
npm ci
cd ..
```

Build the Solidity project before running deployment scripts:

```bash
cd hashgraph
forge build
cd ..
```

Note: inspect the deployment scripts and generated artifacts before deployment.
The local deployment script contains a hard-coded FacilityRegistry implementation
address and expects the Factory/facet architecture in this repository. Deploy the
implementation first on a fresh Anvil chain and verify the address matches the
script's configured implementation address. Do not assume old deployment addresses
remain valid after restarting Anvil.

## Useful commands

```bash
docker compose logs -f anvil
docker compose logs -f ipfs
docker compose down
```

`docker compose down` preserves the named IPFS volumes. To delete IPFS data as well,
use `docker compose down -v`.

Anvil state is intentionally ephemeral in this starter setup. Restarting/recreating
the Anvil container resets its chain and deployed contracts.
