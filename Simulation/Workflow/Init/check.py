import json
import random
import os


def generate_report():
    paths = [
        "Simulation/Workflow/Init/full_config.json",
        "Workflow/Init/full_config.json",
        "Init/full_config.json",
        "full_config.json",
    ]

    json_path = next((p for p in paths if os.path.isfile(p)), None)
    if json_path is None:
        raise FileNotFoundError(f"full_config.json not found in any of: {paths}")

    with open(json_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    facilities = config["Facilities"]
    candidates = config["Candidates"]

    n_relayers = 0
    n_gateways = 0
    n_facility_owners = 0
    n_dao_members = 0
    n_candidates = len(candidates)
    n_valid_candidates = len(list(candidate  for candidate in candidates if candidate["IsCompliant"]))

    for facility in facilities:
        print("===")
        print(facility["Name"])

        relayers = facility["actors"]["Relayers"]
        gateways = facility["actors"]["Gateways"]
        n_facility_owners += 1
        n_relayers += len(relayers)
        n_gateways += len(gateways)
        n_dao_members += len(facility["actors"]["DAOMembers"])
        print(f"number of relayers = {len(relayers)}")
        print(f"number of gateways = {len(gateways)}")

        for k, relayer_gateways in enumerate(facility["actors"]["RelayersGatewaysBinaryMatrix"]):
            print(f"""relayer {k} is managing gateways {[i+1 for i, g in enumerate(relayer_gateways) if g]}""")

        if list(facility["actors"]["GatewayPolicies"].keys()):
            random_gateway = random.choice(list(facility["actors"]["GatewayPolicies"].keys()))
            print(f"expected interval for all gateways = {facility["actors"]["GatewayPolicies"][random_gateway]["ExpectedInterval"]}s")
            print(f"grace period for all gateways = {facility["actors"]["GatewayPolicies"][random_gateway]["GracePeriod"]}s")

    print("====")
    print("IN TOTAL")
    print("====")
    print(f"n_owners = {n_facility_owners}")
    print(f"n_relayers = {n_relayers}")
    print(f"n_candidates = {n_candidates} where {n_valid_candidates} are valid")
    print(f"n_gateways = {n_gateways}")
    print(f"n_dao_members = {n_dao_members}")
    print(f"total number = {n_facility_owners+ n_candidates + n_dao_members  + n_gateways +  n_relayers}")
    print(f"""
hedera account creation takes 0.75HBAR, so each actor requires a bare minimum of 1 HBAR (1 TEST USD $ = approximately 15 HBAR)
gateways will each receive 1 HBAR
candidates each receive 2 HBAR
relayers will receive 2 HBAR
DAO members will receive 2 HBAR
facility owners will receive each 5 HBAR

""")


if __name__ == "__main__":
    generate_report()