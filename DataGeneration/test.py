import json
import hashlib
import os
from eth_account import Account
from eth_account.messages import encode_defunct


SOURCE = "cloudy.json"
OUT_ROOT = "Solar"
OUT_FILENAME = "file4.json"

PRIVATE_KEYS = [
"..."
]

UNITS = {
    "irradiance": "W/m²",
    "cell_temperature": "°C",
    "dc_combiner_voltage": "V",
    "dc_combiner_current": "A",
    "power": "W",
    "ac_power": "W",
}

MD = {
    "irradiance": "Solar irradiance incident on the PV array.",
    "cell_temperature": "PV cell temperature during the simulation window.",
    "dc_combiner_voltage": "DC bus-bar voltage at the combiner output.",
    "dc_combiner_current": "DC bus-bar current at the combiner output.",
    "power": "DC power at the combiner bus-bar (voltage × current).",
    "ac_power": "AC power produced by the inverter.",
}

GATEWAYS = {
    1: ["irradiance"],
    2: ["cell_temperature"],
    3: ["dc_combiner_voltage", "dc_combiner_current"],
    4: ["dc_combiner_voltage", "dc_combiner_current"],
    5: ["power"],
    6: ["ac_power"],
    7: ["irradiance", "cell_temperature"],
}


def sign_data(data: dict, private_key_hex: str) -> tuple:
    canonical = json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    key_hex = private_key_hex.strip()
    if key_hex.startswith(("0x", "0X")):
        key_hex = key_hex[2:]
    if len(key_hex) != 64:
        raise ValueError("Expected a 32-byte private key.")

    acct = Account.from_key(bytes.fromhex(key_hex))
    signed = acct.sign_message(encode_defunct(text=f"sha256:{digest}"))

    output = dict(data)
    output["signature"] = signed.signature.hex()
    return output, digest


with open(SOURCE, "r", encoding="utf-8") as f:
    src = json.load(f)

src_vars = src["variables"]

assert len(PRIVATE_KEYS) == 7

for gateway_id, keys in GATEWAYS.items():
    payload = {
        "variables": {k: src_vars[k] for k in keys},
        "Unit": {k: UNITS[k] for k in keys},
        "md": {
            "global": f"Solar PV gateway {gateway_id} report — very cloudy scenario.",
            **{k: MD[k] for k in keys},
        },
    }

    signed, digest = sign_data(payload, PRIVATE_KEYS[gateway_id - 1])

    out_path = os.path.join(OUT_ROOT, f"Gateway{gateway_id}", OUT_FILENAME)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(signed, f, indent=4, ensure_ascii=False)

    print(f"Gateway{gateway_id} -> {out_path}")
    print(f"  vars: {keys}")
    print(f"  SHA-256: {digest}")
    print(f"  signature: {signed['signature'][:20]}...")