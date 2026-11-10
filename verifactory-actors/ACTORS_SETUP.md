# VeriFactory local actor simulation

This is a runnable local baseline for the current Anvil + IPFS Compose stack. It adds four role workers (facility owner, relayer, gateway, inspector) and an initialization job. It uses Anvil's unlocked, funded development accounts; it never writes private keys to disk.

## Install into the project

Copy these files into the project root, preserving the `simulation/` directory:

- `docker-compose.actors.yml`
- `simulation_config.yaml`
- `simulation/actors.py`

The existing `simulation/Dockerfile` is reused. It already installs PyYAML.

## Start everything

From the project root:

```bash
docker compose -f docker-compose.yml -f docker-compose.actors.yml up -d --build
```

This starts Anvil with 500 funded development accounts, IPFS, generates the actor manifest, then starts the four role workers.

## Inspect

```bash
docker compose -f docker-compose.yml -f docker-compose.actors.yml ps
docker compose -f docker-compose.yml -f docker-compose.actors.yml logs -f gateway
```

The generated files are in the named Docker volume `actor_data`. To inspect them without installing extra tools:

```bash
docker compose -f docker-compose.yml -f docker-compose.actors.yml run --rm --no-deps --entrypoint sh gateway -c 'cat /actor-data/actors.json'
docker compose -f docker-compose.yml -f docker-compose.actors.yml run --rm --no-deps --entrypoint sh gateway -c 'tail -n 20 /actor-data/events.jsonl'
```

## Stop

```bash
docker compose -f docker-compose.yml -f docker-compose.actors.yml down
```

Do not add `-v` unless you intentionally want to delete the actor-data and IPFS volumes.

## What this baseline does

- Creates 10 facilities and the configured random ranges of owners, relayers, gateways, inspectors, and committee members.
- Assigns each gateway to one relayer in its facility.
- Allocates a unique funded Anvil address to each actor.
- Gateway workers upload synthetic measurement JSON to IPFS and log the returned CID.
- Inspector workers upload synthetic inspection reports to IPFS and log the returned CID.
- Facility-owner and relayer workers emit periodic demo activity records.
- Writes `actors.json` and append-only `events.jsonl` to the persistent `actor_data` volume.

## Important boundary

This is a local demo actor harness, not a completed contract/HCS integration. Events in `events.jsonl` are explicitly marked `simulation_only: true`. The relayer worker records simulated rotation cycles; it does not call a key-rotation contract method. Facility-owner records are heartbeats, not facility deployments or role grants. Inspector reports are stored on IPFS, not submitted to a contract. Anvil does not provide Hedera Consensus Service (HCS).

The existing `contracts_config.json` Hedera-style `0.0.x` placeholders are not consumed by this harness. After the deployment script runs against Anvil, its real `0x...` addresses should be written to a deployment manifest, and the actor workers can then be wired to the actual ABIs and methods. No Solidity edits are required for this first orchestration milestone.
