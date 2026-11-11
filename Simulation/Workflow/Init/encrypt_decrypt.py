#!/usr/bin/env python3
"""
AES-256-GCM encryption/decryption for JSON files.
Usage:
    python encrypt_decrypt.py encrypt full_config.json full_config.enc
    python encrypt_decrypt.py decrypt full_config.enc full_config.json
"""
import sys
import os
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

SALT_SIZE = 16
NONCE_SIZE = 12
KDF_ITERATIONS = 200_000


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=KDF_ITERATIONS,
    )
    return kdf.derive(password.encode())


def encrypt_file(in_path: str, out_path: str, password: str) -> None:
    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    plaintext = json.dumps(data).encode("utf-8")

    salt = os.urandom(SALT_SIZE)
    nonce = os.urandom(NONCE_SIZE)
    key = derive_key(password, salt)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)

    # Format: salt || nonce || ciphertext (all raw bytes)
    with open(out_path, "wb") as f:
        f.write(salt + nonce + ciphertext)
    print(f"Encrypted -> {out_path}")


def decrypt_file(in_path: str, out_path: str, password: str) -> None:
    with open(in_path, "rb") as f:
        blob = f.read()

    salt = blob[:SALT_SIZE]
    nonce = blob[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
    ciphertext = blob[SALT_SIZE + NONCE_SIZE:]

    key = derive_key(password, salt)
    plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    data = json.loads(plaintext.decode("utf-8"))

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Decrypted -> {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("encrypt", "decrypt"):
        print(__doc__)
        sys.exit(1)

    mode, inp, outp = sys.argv[1], sys.argv[2], sys.argv[3]
    password = os.environ.get("AES_PASSWORD") or input("Password: ")

    if mode == "encrypt":
        encrypt_file(inp, outp, password)
    else:
        decrypt_file(inp, outp, password)