#!/usr/bin/env python3
"""Local VeriFactory actor simulator. Uses Anvil accounts and IPFS; no real keys."""
import json
import os
import random
import sys
import time
import urllib.request
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml

DATA = Path(os.getenv("ACTOR_DATA", "./actor-data"))
MANIFEST = DATA / "actors.json"
EVENTS = DATA / "events.jsonl"
RPC = os.getenv("RPC_URL", "http://127.0.0.1:8545")
IPFS_API = os.getenv("IPFS_API", "http://127.0.0.1:5001/api/v0/add")


def rpc(method, params=None):
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []}).encode()
    req = urllib.request.Request(RPC, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as response:
        result = json.loads(response.read())
    if "error" in result:
        raise RuntimeError(result["error"])
    return result["result"]


def emit(event_type, actor, **details):
    DATA.mkdir(parents=True, exist_ok=True)
    record = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor_id": actor["id"],
        "actor_type": actor["type"],
        "wallet": actor["wallet"],
        "facility_id": actor.get("facility_id"),
        "simulation_only": True,
        **details,
    }
    # One append per JSON line; each record is short and independently parseable.
    with EVENTS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, separators=(",", ":")) + "\n")


def upload_ipfs(document):
    boundary = "----vf" + uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"payload.json\"\r\n"
            "Content-Type: application/json\r\n\r\n").encode() + json.dumps(document).encode() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(IPFS_API, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=20) as response:
        result = json.loads(response.read())
    return result["Hash"]


def make_manifest():
    config_path = Path(os.getenv("SIM_CONFIG", "/workspace/simulation_config.yaml"))
    cfg = yaml.safe_load(config_path.read_text())["simulation"]
    rng = random.Random(int(os.getenv("RANDOM_SEED", "42")))
    accounts = rpc("eth_accounts")
    cursor = 0

    def new_actor(kind, **attrs):
        nonlocal cursor
        if cursor >= len(accounts):
            raise RuntimeError(f"Not enough Anvil accounts: need more than {cursor}; got {len(accounts)}")
        actor = {"id": f"{kind}-{cursor:04d}", "type": kind, "wallet": accounts[cursor], **attrs}
        cursor += 1
        return actor

    platform_owner = new_actor("platform_owner")
    facilities = []
    all_actors = [platform_owner]
    for i in range(int(cfg["facilities"])):
        fid = f"facility-{i+1:03d}"
        owner_count = int(cfg["per_facility"].get("owners", 1))
        owners = [new_actor("facility_owner", facility_id=fid) for _ in range(owner_count)]
        relayer_cfg = cfg["per_facility"]["relayers"]
        gateway_cfg = cfg["per_facility"]["gateways"]
        relayers = [new_actor("relayer", facility_id=fid, assigned_gateways=[]) for _ in range(rng.randint(int(relayer_cfg["min"]), int(relayer_cfg["max"])))]
        gateways = [new_actor("gateway", facility_id=fid, relayer_id=None) for _ in range(rng.randint(int(gateway_cfg["min"]), int(gateway_cfg["max"])))]
        # Each gateway has one managing relayer in this runnable baseline.
        for j, gateway in enumerate(gateways):
            relayer = relayers[j % len(relayers)]
            gateway["relayer_id"] = relayer["id"]
            relayer["assigned_gateways"].append(gateway["id"])
        facilities.append({"id": fid, "owners": owners, "relayers": relayers, "gateways": gateways})
        all_actors.extend(owners + relayers + gateways)

    inspector_cfg = cfg["inspectors"]
    inspectors = [new_actor("inspector") for _ in range(rng.randint(int(inspector_cfg["min"]), int(inspector_cfg["max"])))]
    committee_cfg = cfg["committee"]
    committee = [new_actor("committee_member") for _ in range(rng.randint(int(committee_cfg["min"]), int(committee_cfg["max"])))]
    all_actors.extend(inspectors + committee)

    manifest = {
        "network": {"name": "anvil-local", "chain_id": 31337, "rpc_url": RPC},
        "platform_owner": platform_owner,
        "facilities": facilities,
        "inspectors": inspectors,
        "committee": committee,
        "actors": all_actors,
        "actor_count": len(all_actors),
        "notes": [
            "Wallet addresses are unlocked, pre-funded Anvil development accounts.",
            "No private keys are written to this manifest.",
            "Actor events produced by this baseline are simulation records, not contract transactions or Hedera HCS messages."
        ]
    }
    DATA.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Generated {len(all_actors)} actors across {len(facilities)} facilities using {cursor} Anvil accounts.")
    print(f"Manifest: {MANIFEST}; event log: {EVENTS}")


def run_role(role):
    while not MANIFEST.exists():
        print("Waiting for actor manifest...", flush=True)
        time.sleep(2)
    manifest = json.loads(MANIFEST.read_text())
    if role == "facility_owner":
        actors = [a for a in manifest["actors"] if a["type"] == role]
    elif role == "relayer":
        actors = [a for a in manifest["actors"] if a["type"] == role]
    elif role == "gateway":
        actors = [a for a in manifest["actors"] if a["type"] == role]
    elif role == "inspector":
        actors = manifest["inspectors"]
    else:
        raise ValueError(f"Unknown role: {role}")
    interval = max(5, int(os.getenv("ACTOR_INTERVAL", "30")))
    print(f"Started {role} worker for {len(actors)} actors; interval={interval}s", flush=True)
    while True:
        for actor in actors:
            try:
                if role == "facility_owner":
                    emit("facility.owner.heartbeat", actor, action="facility_actor_active")
                elif role == "relayer":
                    emit("gateway.key_rotation.simulated", actor, managed_gateways=actor.get("assigned_gateways", []), action="rotation_cycle_recorded")
                elif role == "gateway":
                    payload = {
                        "schema": "verifactory.measurement.v1",
                        "facility_id": actor["facility_id"],
                        "gateway_id": actor["id"],
                        "observed_at": datetime.now(timezone.utc).isoformat(),
                        "measurements": {"temperature_c": round(random.uniform(18, 32), 2), "humidity_pct": round(random.uniform(25, 85), 2)},
                    }
                    cid = upload_ipfs(payload)
                    emit("measurement.recorded", actor, cid=cid, payload_schema=payload["schema"])
                elif role == "inspector":
                    report = {"schema": "verifactory.inspection.v1", "inspector_id": actor["id"], "created_at": datetime.now(timezone.utc).isoformat(), "status": "simulated", "summary": "Synthetic inspection report for local demo."}
                    cid = upload_ipfs(report)
                    emit("inspection.submitted", actor, cid=cid, report_status="simulated")
            except Exception as exc:
                print(f"{actor['id']}: {type(exc).__name__}: {exc}", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in {"init", "run"}:
        raise SystemExit("Usage: actors.py init | run <facility_owner|relayer|gateway|inspector>")
    if sys.argv[1] == "init":
        make_manifest()
    else:
        if len(sys.argv) != 3:
            raise SystemExit("Usage: actors.py run <role>")
        run_role(sys.argv[2])
