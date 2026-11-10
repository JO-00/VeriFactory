#!/usr/bin/env python3
"""
Generate 200 ECDSA private keys (secp256k1 curve).
Requires: pip install ecdsa
"""

from ecdsa import SigningKey, SECP256k1
from time import sleep
from uuid import uuid4
import json
import yaml,os,random,math
from pydantic import TypeAdapter
from Simulation.Workflow.Init.data_structs import *


def generate_private_keys(count=1000):
    keys = []
    for i in range(count):
        # Generate cryptographically secure random private key
        sk = SigningKey.generate(curve=SECP256k1)
        private_key_hex = sk.to_string().hex()
        public_key_hex = sk.get_verifying_key().to_string().hex()
        keys.append({
            "index": i,
            "private_key": private_key_hex,
            "public_key": public_key_hex,
        })
    return keys



def generate_matrix(n_lines: int, n_columns: int) -> list[list[int]]:
    return [[random.randint(0, 1) for _ in range(n_columns)] for _ in range(n_lines)]


def assign_private_keys(
    keys: set[str],
    yaml_config_file_path: str = "Simulation/simulation_config.yaml",
) -> list[FacilityEntry]:
    facilities: list[FacilityEntry] = []

    if not os.path.exists(yaml_config_file_path):
        raise ValueError(f"invalid path = {yaml_config_file_path}")

    with open(yaml_config_file_path, "r", encoding="utf-8") as f:
        config_file = yaml.safe_load(f)["simulation"]

    n_facilities = config_file["facilities"]
    if n_facilities > len(facility_examples):
        raise ValueError(
            f"config asks for {n_facilities} facilities but only "
            f"{len(facility_examples)} examples exist"
        )

    relayer_min = config_file["per_facility"]["relayers"]["min"]
    relayer_max = config_file["per_facility"]["relayers"]["max"]
    gateway_min = config_file["per_facility"]["gateways"]["min"]
    gateway_max = config_file["per_facility"]["gateways"]["max"]

    # Single pool of available keys. Each draw removes from it, so no key
    # can be used twice within the same facility (Bug 3 fix). It also keeps
    # shrinking across facilities, matching the original `keys -=` intent.
    pool: list[str] = list(keys)

    def draw(n: int) -> list[str]:
        if n > len(pool):
            raise ValueError(
                f"not enough keys left: need {n}, only {len(pool)} available"
            )
        chosen = random.sample(pool, n)
        chosen_set = set(chosen)
        pool[:] = [k for k in pool if k not in chosen_set]
        return chosen

    for i in range(n_facilities):
        facility_info = facility_examples[i]

        owner_privkey = draw(1)[0]
        relayer_privkeys = draw(random.randint(relayer_min, relayer_max))
        gateway_privkeys = draw(random.randint(gateway_min, gateway_max))
        dao_members = draw(random.randint(0, 3))

        relayer_gateway_matrix = generate_matrix(
            len(relayer_privkeys), len(gateway_privkeys)
        )

        actors = Actors(
            Owner=owner_privkey,
            Gateways=gateway_privkeys,
            Relayers=relayer_privkeys,
            DAOMembers=dao_members,
            RelayersGatewaysBinaryMatrix=relayer_gateway_matrix,
            GatewayPolicies={
                gateway: GatewayPolicy(
                    ExpectedInterval=facility_info.min_response_interval,
                    GracePeriod=math.ceil(facility_info.min_response_interval * 1.5),
                )
                for gateway in gateway_privkeys
            },
        )

        facility = FacilityEntry(
            Name=facility_info.Name,
            Location=facility_info.Location,
            SectorType=facility_info.SectorType,
            ContractsSigned=[
                contracts_in_order[j]
                for j in range(5)
                if facility_info.ContractsSigned[j]
            ],
            Logo=facility_info.Logo_IPFS,
            actors=actors,          # lowercase — matches the field name
        )
        facilities.append(facility)

    return facilities                # was missing before

    



if __name__ == "__main__":
    keys = generate_private_keys(1000)

    facilities = assign_private_keys(set(
        key["private_key"] for key in keys
        ))
    adapter = TypeAdapter(list[FacilityEntry])

    with open("Simulation/Workflow/Init/facilities.json", "w", encoding="utf-8") as f:
        f.write(adapter.dump_json(facilities, indent=2).decode("utf-8"))


    with open("Simulation/Workflow/Init/ecdsa_keys.csv", "w") as f:
        for k in keys:
            f.write(f"{k['index']:03d},{k['private_key']},{k['public_key']}\n")

    print(f"\nGenerated {len(keys)} keys -> ecdsa_keys.txt")


