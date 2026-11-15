import {
  AccountId,
  Client,
  LocalProvider,
  PrivateKey,
  Wallet,
  type Signer,
} from "@hiero-ledger/sdk";
import {ethers} from "ethers"
export function EVMAddressFromPrivateKey(keyStr : string) : string {
  return PrivateKey.fromStringECDSA(keyStr).publicKey.toEvmAddress();
}

function parsePrivateKey(keyStr: string): PrivateKey {
  const clean = keyStr.trim();
  // DER-encoded (starts with 302e for ED25519 or 3030 for ECDSA)
  if (clean.startsWith("302e") || clean.startsWith("3030")) {
    return PrivateKey.fromStringDer(clean);
  }
  // Raw hex (64 chars, optional 0x prefix) -> defaults to ECDSA for EVM compatibility
  return PrivateKey.fromStringECDSA(clean.replace(/^0x/i, ""));
}

export async function createSignerFromPrivateKey(
  privateKeyStr: string
): Promise<Signer> {
  const privateKey = parsePrivateKey(privateKeyStr);
  const publicKey = privateKey.publicKey;

  const mirrorBase = "https://testnet.mirrornode.hedera.com";

  let accountIdStr: string | undefined;

  // 1. Try resolving via EVM address (works for ECDSA accounts with an EVM alias)
  try {
    const evmAddress = `0x${publicKey.toEvmAddress()}`;
    const res = await fetch(`${mirrorBase}/api/v1/accounts/${evmAddress}`);
    if (res.ok) {
      const data = await res.json();
      accountIdStr = data.account;
    }
  } catch {
    // Fall through to public key query if toEvmAddress() fails (e.g., ED25519 key)
  }

  // 2. Fallback: query Mirror Node by raw public key
  if (!accountIdStr) {
    const res = await fetch(
      `${mirrorBase}/api/v1/accounts?account.publickey=${publicKey.toStringRaw()}`
    );
    if (!res.ok) {
      throw new Error(`Mirror node lookup failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    accountIdStr = data.accounts?.[0]?.account;
  }

  if (!accountIdStr) {
    throw new Error("No Hedera account found on mirror node for this private key.");
  }

  const accountId = AccountId.fromString(accountIdStr);
  const client = Client.forName("testnet");
  client.setOperator(accountId, privateKey);

  const provider = new LocalProvider({ client });

  return new Wallet(accountId, privateKey, provider);
}


export function generateHederaSignature(
  privateKey: string,
  documentCid: string,
  facilityAddress: string
) {
  // 1. bytes32 messageHash = keccak256(abi.encodePacked(DocumentCID, facility_contract));
  const messageHash = ethers.solidityPackedKeccak256(
    ["string", "address"],
    [documentCid, facilityAddress]
  );

  // 2. _toHexString(messageHash) -> "0x" + 64 hex chars = 66 characters long.
  // messageHash is already a 0x-prefixed hex string from ethers, so its length is 66.
  
  // 3. prefix = "\x19Hedera Signed Message:\n66"
  const prefix = "\x19Hedera Signed Message:\n66";

  // 4. hederaSignedHash = keccak256(abi.encodePacked(prefix, hexString));
  // We use ethers.concat to join the string bytes and the utf8 bytes of the hex string
  const hederaSignedHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes(prefix),
      ethers.toUtf8Bytes(messageHash) // Treats it as the literal string "0x1234..."
    ])
  );

  // 5. Sign the final hash
  const wallet = new ethers.Wallet(privateKey);
  // Ethers expects the digest to be signed.
  const signature = wallet.signingKey.sign(hederaSignedHash);

  // 6. Return v, r, s
  return {
    v: signature.v,
    r: signature.r,
    s: signature.s,
  };
}


export function signInspectorMessage(
  privateKeyHex: string,
  inspectorCid: string
): { v: number; r: string; s: string } {
  // 1. messageHash = keccak256(abi.encodePacked(inspector_cid))
  const messageHash = ethers.solidityPackedKeccak256(["string"], [inspectorCid]);

  // 2. MUST pass ethers.getBytes(messageHash) so ethers hashes 32 raw bytes (\n32), NOT 66 UTF-8 chars (\n66)
  const ethSignedHash = ethers.hashMessage(ethers.getBytes(messageHash));

  // 3. Create a standard EVM Wallet from the private key
  const cleanPk = privateKeyHex.replace(/^0x/i, "");
  const wallet = new ethers.Wallet(cleanPk);

  // 4. Sign the 32-byte digest directly
  const sig = wallet.signingKey.sign(ethSignedHash);

  // 5. Verify recovered address matches wallet.address
  const recovered = ethers.recoverAddress(ethSignedHash, sig);
  if (recovered.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`Signature mismatch: expected ${wallet.address}, got ${recovered}`);
  }

  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
  };
}