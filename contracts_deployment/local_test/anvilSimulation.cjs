/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const {
  Contract,
  Interface,
  ContractFactory,
  HDNodeWallet,
  JsonRpcProvider,
  NonceManager,
  Wallet,
  getAddress,
  getBytes,
  keccak256,
  toUtf8Bytes,
} = require('ethers');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'hashgraph', 'out');
const ACTOR_DATA = process.env.ACTOR_DATA || '/actor-data';
const ACTORS_FILE = path.join(ACTOR_DATA, 'actors.json');
const EVENTS_FILE = path.join(ACTOR_DATA, 'events.jsonl');
const DEPLOYMENT_FILE = process.env.DEPLOYMENT_FILE || path.join(ROOT, 'Simulation', 'deployment.json');
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const IPFS_API = process.env.IPFS_API || 'http://127.0.0.1:5001/api/v0/add';
const MNEMONIC = process.env.ANVIL_MNEMONIC || 'test test test test test test test test test test test junk';
const PRNG_ADDRESS = '0x0000000000000000000000000000000000000169';

const FACILITY_DOCS = [
  { cid: 'bafkreib4z6m55m7h43baf6vrpre6wbobmmkv4joqgvwou22dui6sdbtdji', docType: 'Facility Contract', title: 'Measurement Disclosure Agreement' },
  { cid: 'bafkreiebyahgas7fcbkn5l5btbyy4diegstg6vymn7rkdoqwkljvywegcy', docType: 'Facility Contract', title: 'Gateway Key Management Agreement' },
  { cid: 'bafkreiazoh3pzxb7xkpfpahx2homftykipjwsnyxy6fojlixycwxmexc6e', docType: 'Facility Contract', title: 'Facility Inspection And Cooperation Agreement' },
  { cid: 'bafkreieh2xx3cvhg7wdntzifj53tzgdhdommsgogasbsrvuwaj272ompj4', docType: 'Facility Contract', title: 'Incident Disclosure Agreement' },
  { cid: 'bafkreidglsdrujbietvdp4hjxcsecwn7rxfidlm5f7l42uyudiapeadzhy', docType: 'Facility Contract', title: 'Assessment Disclosure Agreement' },
];
const INSPECTOR_DOC = {
  cid: 'bafkreih6vihdkwrurh4h5lksitxzqgn4stpxqadxujxkulfppilmw3xqf4',
  docType: 'Inspector Contract',
  title: 'Inspector Independence and Conduct Agreement',
};

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function logEvent(event) {
  ensureDir(ACTOR_DATA);
  fs.appendFileSync(EVENTS_FILE, `${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`);
}
function artifactPath(name, hint = '') {
  if (!fs.existsSync(OUT)) throw new Error(`Foundry output directory missing: ${OUT}. Run 'cd hashgraph && forge build' first.`);
  const matches = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === `${name}.json`) matches.push(full);
    }
  };
  walk(OUT);
  if (matches.length === 0) throw new Error(`Foundry artifact not found: ${name}. Run 'forge build'.`);
  if (hint) {
    const hinted = matches.find((p) => {
      const candidate = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (candidate.sourceName && candidate.sourceName.includes(hint)) return true;
      if (p.includes(hint)) return true;
      try {
        const metadata = typeof candidate.metadata === 'string' ? JSON.parse(candidate.metadata) : candidate.metadata;
        return Object.keys((metadata && metadata.sources) || {}).some((source) => source.includes(hint));
      } catch { return false; }
    });
    if (!hinted) throw new Error(`Artifact ${name} was found, but none matched source hint ${hint}`);
    return JSON.parse(fs.readFileSync(hinted, 'utf8'));
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous artifact ${name}: ${matches.join(', ')}. Supply a path hint.`);
  }
  return JSON.parse(fs.readFileSync(matches[0], 'utf8'));
}
function getBytecode(artifact) {
  const raw = artifact.bytecode && artifact.bytecode.object;
  if (!raw || raw === '0x') throw new Error(`Artifact ${artifact.contractName} has no deployment bytecode.`);
  return raw.startsWith('0x') ? raw : `0x${raw}`;
}
function readConfig() {
  const candidates = [
    process.env.SIMULATION_CONFIG,
    path.join(ROOT, 'Simulation', 'localAnvilSimulation', 'simulation_config.yaml'),
    path.join(ROOT, 'Simulation', 'simulation_config.yaml'),
  ].filter(Boolean);
  const configPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!configPath) {
    throw new Error(`Simulation config not found. Checked: ${candidates.join(', ')}`);
  }
  console.log(`Using simulation config: ${configPath}`);
  const y = fs.readFileSync(configPath, 'utf8');
  const one = (re, fallback) => { const m = y.match(re); return m ? Number(m[1]) : fallback; };
  const range = (name, minFallback, maxFallback) => ({
    min: one(new RegExp(`${name}:\\s*\\n\\s*min:\\s*(\\d+)`), minFallback),
    max: one(new RegExp(`${name}:\\s*\\n\\s*min:\\s*\\d+\\s*\\n\\s*max:\\s*(\\d+)`), maxFallback),
  });
  return {
    facilities: one(/facilities:\s*(\d+)/, 10),
    ownersPerFacility: one(/per_facility:\s*\n\s*owners:\s*(\d+)/, 1),
    relayers: range('relayers', 5, 15),
    gateways: range('gateways', 10, 25),
    inspectors: range('inspectors', 3, 10),
    committee: range('committee', 3, 7),
  };
}
function seededRandom(seed) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6D2B79F5) >>> 0;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
let HD_ROOT;
function actorWallet(index, provider) {
  if (!HD_ROOT) HD_ROOT = HDNodeWallet.fromPhrase(MNEMONIC, undefined, "m/44'/60'/0'/0");
  return new Wallet(HD_ROOT.deriveChild(index).privateKey, provider);
}

// Keep one nonce manager per signing account for the lifetime of this process.
// Recreating Wallet instances for the same address can cause stale nonce reads
// when several sequential transactions are sent by that account.
const NONCE_MANAGERS = new Map();
function managedWallet(privateKey, provider) {
  const rawWallet = new Wallet(privateKey, provider);
  const key = rawWallet.address.toLowerCase();
  let manager = NONCE_MANAGERS.get(key);
  if (!manager) {
    manager = new NonceManager(rawWallet);
    NONCE_MANAGERS.set(key, manager);
  }
  return manager;
}
async function waitForRpc(provider) {
  for (let i = 0; i < 60; i++) {
    try { await provider.getNetwork(); return; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error(`Anvil did not become reachable at ${RPC_URL}`);
}
async function waitForIpfs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(IPFS_API.replace(/\/api\/v0\/add$/, '/api/v0/version'), { method: 'POST' });
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`IPFS API did not become reachable at ${IPFS_API}`);
}
async function deploy(name, artifact, signer, args = []) {
  console.log(`Deploying ${name}...`);
  const factory = new ContractFactory(artifact.abi, getBytecode(artifact), signer);
  const contract = await factory.deploy(...args, { gasLimit: 29_000_000 });
  const tx = contract.deploymentTransaction();
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${name} deployment reverted`);
  const address = await contract.getAddress();
  console.log(`${name}: ${address} (${tx.hash})`);
  return { address, txHash: tx.hash };
}
async function registerFacet(factory, facetName, facetAddress, artifact, seen) {
  const selectors = [];
  const iface = new Interface(artifact.abi);
  for (const fragment of iface.fragments) {
    if (fragment.type !== 'function') continue;
    const selector = fragment.selector;
    if (seen.has(selector)) throw new Error(`Selector collision ${selector}: ${seen.get(selector)} and ${facetName}.${fragment.name}`);
    seen.set(selector, `${facetName}.${fragment.name}`);
    selectors.push(selector);
  }
  if (!selectors.length) throw new Error(`${facetName} has no function selectors`);
  const tx = await factory.addFacet(facetAddress, selectors, { gasLimit: 8_000_000 });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`Registering ${facetName} reverted`);
  for (const selector of selectors) {
    const actual = await factory.facets(selector);
    if (actual.toLowerCase() !== facetAddress.toLowerCase()) throw new Error(`Facet selector verification failed: ${selector}`);
  }
  console.log(`Registered ${facetName}: ${selectors.length} selectors`);
}
async function installPrng(provider, deployer, prngArtifact) {
  const deployed = await deploy('AnvilPrng', prngArtifact, deployer);
  const runtime = await provider.getCode(deployed.address);
  await provider.send('anvil_setCode', [PRNG_ADDRESS, runtime]);
  const installed = await provider.getCode(PRNG_ADDRESS);
  if (installed === '0x') throw new Error('Failed to install local PRNG runtime at 0x169');
  console.log(`Installed Anvil PRNG shim at ${PRNG_ADDRESS}`);
  return { ...deployed, installedAt: PRNG_ADDRESS };
}
function makeActor(type, index, provider, extra = {}) {
  const wallet = actorWallet(index, provider);
  return { id: `${type}-${String(index).padStart(4, '0')}`, type, accountIndex: index, address: wallet.address, privateKey: wallet.privateKey, ...extra };
}
async function bootstrap() {
  ensureDir(ACTOR_DATA);
  ensureDir(path.dirname(DEPLOYMENT_FILE));
  await waitForRpc(new JsonRpcProvider(RPC_URL));
  await waitForIpfs();
  const provider = new JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) throw new Error(`Expected Anvil chain 31337, got ${network.chainId}`);

  const factoryArtifact = artifactPath('Factory');
  const committeeArtifact = artifactPath('CommitteeInspector');
  const initArtifact = artifactPath('InitFactory');
  const visualizationArtifact = artifactPath('Visualization', 'FacilityFactory/Visualization.sol');
  const facilityArtifact = artifactPath('FacilityRegistry');
  const prngArtifact = artifactPath('AnvilPrng');
  const telemetryArtifact = artifactPath('SimulationTelemetry');

  // Account 0 performs most bootstrap deployments and registrations. Use one
  // NonceManager for every transaction signed by this account.
  const deployerWallet = actorWallet(0, provider);
  const deployer = managedWallet(deployerWallet.privateKey, provider);
  const prng = await installPrng(provider, deployer, prngArtifact);
  const implementation = await deploy('FacilityRegistry implementation', facilityArtifact, deployer);
  const timestamp = Math.floor(Date.now() / 1000);
  const docs = FACILITY_DOCS.map((d) => ({ ...d, uploadedAt: timestamp }));
  const inspectorDoc = { ...INSPECTOR_DOC, uploadedAt: timestamp };
  const factoryDeployment = await deploy('Factory', factoryArtifact, deployer, [implementation.address, [], docs, inspectorDoc]);
  const committee = await deploy('CommitteeInspector facet', committeeArtifact, deployer);
  const init = await deploy('InitFactory facet', initArtifact, deployer);
  const visualization = await deploy('Visualization facet', visualizationArtifact, deployer);
  const telemetry = await deploy('SimulationTelemetry (local event adapter)', telemetryArtifact, deployer);
  const factory = new Contract(factoryDeployment.address, factoryArtifact.abi, deployer);
  const seen = new Map();
  await registerFacet(factory, 'CommitteeInspector', committee.address, committeeArtifact, seen);
  await registerFacet(factory, 'InitFactory', init.address, initArtifact, seen);
  await registerFacet(factory, 'Visualization', visualization.address, visualizationArtifact, seen);

  const config = readConfig();
  const rng = seededRandom(Number(process.env.RANDOM_SEED || 42));
  // Preserve the 268-participant population from the existing working demo when
  // the repository is using its original default YAML ranges. Counts remain in
  // those ranges, and every facility has at least one gateway per relayer.
  const originalDemoShape = config.facilities === 10 && config.ownersPerFacility === 1
    && config.relayers.min === 5 && config.relayers.max === 15
    && config.gateways.min === 10 && config.gateways.max === 25
    && config.inspectors.min === 3 && config.inspectors.max === 10
    && config.committee.min === 3 && config.committee.max === 7;
  const relayerPlan = originalDemoShape ? [5, 10, 10, 10, 10, 10, 10, 10, 10, 11] : null;
  const gatewayPlan = originalDemoShape ? [10, 15, 15, 15, 15, 15, 15, 15, 15, 18] : null;
  // The committee contract ranks five candidates and freezes after five votes;
  // keep at least six compliant inspectors so the top-five boundary is testable.
  const inspectorCount = originalDemoShape ? 9 : Math.max(6, randInt(rng, config.inspectors.min, config.inspectors.max));
  const committeeCount = 5;
  if (committeeCount < config.committee.min || committeeCount > config.committee.max) {
    throw new Error(`The committee config range ${config.committee.min}-${config.committee.max} does not permit the five-member local vote workflow.`);
  }

  let accountIndex = 1;
  const actors = [];
  const facilities = [];
  const relayerActors = [];
  const gatewayActors = [];
  for (let f = 0; f < config.facilities; f++) {
    const facilityId = `facility-${String(f + 1).padStart(3, '0')}`;
    const owner = makeActor('facility_owner', accountIndex++, provider, { facilityId, gatewayIds: [] });
    actors.push(owner);
    const relayerCount = relayerPlan ? relayerPlan[f] : randInt(rng, config.relayers.min, config.relayers.max);
    // Ensure every configured relayer owns at least one gateway, even when the
    // independent YAML ranges would otherwise produce more relayers than gateways.
    const gatewayCount = gatewayPlan ? gatewayPlan[f] : Math.max(randInt(rng, config.gateways.min, config.gateways.max), relayerCount);
    const relayers = [];
    for (let r = 0; r < relayerCount; r++) {
      const actor = makeActor('relayer', accountIndex++, provider, { facilityId, gatewayIds: [] });
      relayers.push(actor); relayerActors.push(actor); actors.push(actor);
    }
    const gateways = [];
    for (let g = 0; g < gatewayCount; g++) {
      const actor = makeActor('gateway', accountIndex++, provider, { facilityId, gatewayIds: [] });
      gateways.push(actor); gatewayActors.push(actor); actors.push(actor);
    }
    for (let g = 0; g < gateways.length; g++) {
      const gatewayId = `${facilityId}-gateway-${String(g + 1).padStart(3, '0')}`;
      const relayer = relayers[g % relayers.length];
      gateways[g].gatewayId = gatewayId;
      gateways[g].relayerAddress = relayer.address;
      gateways[g].gatewayIds = [gatewayId];
      relayer.gatewayIds.push(gatewayId);
      owner.gatewayIds.push(gatewayId);
    }
    facilities.push({ id: facilityId, name: `VeriFactory ${facilityId}`, owner, relayers, gateways });
  }
  const inspectors = [];
  for (let i = 0; i < inspectorCount; i++) {
    const actor = makeActor('inspector', accountIndex++, provider, { gatewayIds: [] });
    inspectors.push(actor); actors.push(actor);
  }
  const committeeActors = [];
  for (let i = 0; i < committeeCount; i++) {
    const actor = makeActor('committee', accountIndex++, provider, { gatewayIds: [] });
    committeeActors.push(actor); actors.push(actor);
  }
  if (accountIndex > 500) throw new Error(`Actor allocation needs ${accountIndex - 1} accounts; Anvil is configured for 500.`);

  const initContract = new Contract(factoryDeployment.address, initArtifact.abi, deployer);
  const telemetryContract = new Contract(telemetry.address, telemetryArtifact.abi, deployer);
  const viz = new Contract(factoryDeployment.address, visualizationArtifact.abi, provider);
  console.log(`Provisioning ${facilities.length} facilities, ${relayerActors.length} relayers, ${gatewayActors.length} gateways, ${inspectors.length} inspectors and ${committeeActors.length} committee members...`);
  for (const facility of facilities) {
    const ownerWallet = managedWallet(facility.owner.privateKey, provider);
    const initAsOwner = initContract.connect(ownerWallet);
    const initialGateways = facility.gateways.map((g) => ({ id: g.gatewayId, key: g.address, relayer: g.relayerAddress }));
    const tx = await initAsOwner.createFacility(
      facility.name,
      `Demo zone ${facility.id.slice(-3)}`,
      'Industrial',
      facility.relayers.map((r) => r.address),
      initialGateways,
      docs,
      { gasLimit: 28_000_000 },
    );
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`createFacility failed for ${facility.id}`);
    const deployed = await viz.getDeployedFacilities();
    facility.address = deployed[deployed.length - 1];
    facility.owner.facilityAddress = facility.address;
    for (const actor of [...facility.relayers, ...facility.gateways]) actor.facilityAddress = facility.address;
    console.log(`${facility.id} deployed at ${facility.address}`);

    // Initialize cadence policy on every gateway using the actual facility admin.
    const facilityContract = new Contract(facility.address, facilityArtifact.abi, ownerWallet);
    for (const gateway of facility.gateways) {
      const policyTx = await facilityContract.setGatewayPolicy(gateway.gatewayId, 30, 5);
      const policyReceipt = await policyTx.wait();
      if (!policyReceipt || policyReceipt.status !== 1) throw new Error(`Policy initialization failed for ${gateway.gatewayId}`);
    }
  }

  // Give every inspector a facility context for its local inspection workflow.
  inspectors.forEach((actor, index) => {
    const facility = facilities[index % facilities.length];
    actor.facilityId = facility.id;
    actor.facilityAddress = facility.address;
  });

  // The supplied production contracts have no gateway measurement or inspection
  // submission endpoint. This local-only adapter emits those workflow events.
  let authTx = await telemetryContract.authorizeGateways(gatewayActors.map((a) => a.address), { gasLimit: 8_000_000 });
  await authTx.wait();
  authTx = await telemetryContract.authorizeInspectors(inspectors.map((a) => a.address), { gasLimit: 2_000_000 });
  await authTx.wait();

  // Register exactly five DAO members (the contract's five-voter freeze path).
  const committeeFacet = new Contract(factoryDeployment.address, committeeArtifact.abi, deployer);
  for (let i = 0; i < committeeActors.length; i++) {
    const facility = facilities[Math.floor(i / 3)];
    const ownerWallet = managedWallet(facility.owner.privateKey, provider);
    const asOwner = committeeFacet.connect(ownerWallet);
    const fee = i % 3 === 0 ? 25_000_000n : 100_000_000n;
    const tx = await asOwner.set_committee_member(committeeActors[i].address, facility.address, { value: fee });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Committee registration failed for ${committeeActors[i].id}`);
    committeeActors[i].facilityId = facility.id;
    committeeActors[i].facilityAddress = facility.address;
  }

  // Inspector candidacy and contract compliance signatures.
  for (const inspector of inspectors) {
    // Keep the raw wallet for off-chain signing; use its cached NonceManager
    // for both on-chain transactions from this inspector.
    const rawWallet = new Wallet(inspector.privateKey, provider);
    const wallet = managedWallet(inspector.privateKey, provider);
    const asInspector = committeeFacet.connect(wallet);
    let tx = await asInspector.become_candidate([]);
    await tx.wait();
    const messageHash = keccak256(toUtf8Bytes(INSPECTOR_DOC.cid));
    const signature = await rawWallet.signMessage(getBytes(messageHash));
    const sig = require('ethers').Signature.from(signature);
    tx = await asInspector.InspectorSignContract(sig.v, sig.r, sig.s);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Inspector compliance signature failed for ${inspector.id}`);
  }

  // Generate the committee and have all five members rank the same five leading candidates.
  let tx = await committeeFacet.generate_new_committee();
  await tx.wait();
  const preferences = inspectors.slice(0, 5).map((a) => a.address);
  for (const member of committeeActors) {
    const wallet = managedWallet(member.privateKey, provider);
    tx = await committeeFacet.connect(wallet).rank_candidates(preferences);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Committee vote failed for ${member.id}`);
  }
  const frozen = await viz.votes_frozen();
  if (!frozen) throw new Error('Committee vote workflow did not freeze as expected after five votes.');

  const deployment = {
    chainId: Number(network.chainId),
    rpcUrl: RPC_URL,
    deployedAt: new Date().toISOString(),
    deployer: deployerWallet.address,
    prng,
    factory: factoryDeployment.address,
    facilityImplementation: implementation.address,
    facets: { committeeInspector: committee.address, initFactory: init.address, visualization: visualization.address },
    simulationTelemetry: telemetry.address,
    artifactNames: { factory: 'Factory', committeeInspector: 'CommitteeInspector', initFactory: 'InitFactory', visualization: 'Visualization', facility: 'FacilityRegistry', simulationTelemetry: 'SimulationTelemetry' },
    facilities: facilities.map((f) => ({ id: f.id, name: f.name, address: f.address, owner: f.owner.address, relayers: f.relayers.length, gateways: f.gateways.length })),
    actorCounts: { facility_owner: facilities.length, relayer: relayerActors.length, gateway: gatewayActors.length, inspector: inspectors.length, committee: committeeActors.length, total: actors.length },
    notes: [
      'Local Anvil simulation only. Actor private keys are stored in the local actor-data Docker volume.',
      'Gateway measurements and inspector reports are stored in IPFS. SimulationTelemetry is a separate local-only contract that emits MeasurementRecorded and InspectionSubmitted events because the supplied VeriFactory contracts do not expose those endpoints.',
      'Facility creation, gateway policies, relayer key rotations, inspector candidacy/compliance/document updates, committee votes, gateway measurement records and inspection submissions are actual Anvil transactions.',
      'The PRNG code at 0x169 is a local mock for Hedera HIP-351 and is not suitable for production.',
    ],
  };
  fs.writeFileSync(DEPLOYMENT_FILE, `${JSON.stringify(deployment, null, 2)}\n`);
  fs.writeFileSync(ACTORS_FILE, `${JSON.stringify({ mnemonic: 'NOT STORED', actors, facilities: facilities.map((f) => ({ id: f.id, address: f.address, ownerId: f.owner.id, relayerIds: f.relayers.map((r) => r.id), gatewayIds: f.gateways.map((g) => g.id) })) }, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(ACTORS_FILE, 0o600);
  fs.writeFileSync(EVENTS_FILE, '');
  logEvent({ event: 'simulation.initialized', chainId: Number(network.chainId), deployment: factoryDeployment.address, actorCounts: deployment.actorCounts, simulation_only: true });
  console.log('\nLOCAL VERIFACTORY BOOTSTRAP COMPLETE');
  console.log(`Deployment manifest: ${DEPLOYMENT_FILE}`);
  console.log(`Actor manifest: ${ACTORS_FILE}`);
  console.log(`Actor totals: ${JSON.stringify(deployment.actorCounts)}`);
}

async function uploadJson(payload, filename) {
  const body = new FormData();
  body.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), filename);
  const response = await fetch(IPFS_API, { method: 'POST', body });
  if (!response.ok) throw new Error(`IPFS add failed (${response.status}): ${await response.text()}`);
  const text = await response.text();
  const line = text.trim().split('\n').pop();
  const result = JSON.parse(line);
  if (!result.Hash) throw new Error(`IPFS response did not include a CID: ${text}`);
  return result.Hash;
}
function loadState() {
  if (!fs.existsSync(ACTORS_FILE)) throw new Error(`Actor manifest missing: ${ACTORS_FILE}. Run the init service first.`);
  if (!fs.existsSync(DEPLOYMENT_FILE)) throw new Error(`Deployment manifest missing: ${DEPLOYMENT_FILE}.`);
  return { actors: JSON.parse(fs.readFileSync(ACTORS_FILE, 'utf8')).actors, deployment: JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8')) };
}
async function mapLimit(items, limit, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { await fn(items[index], index); }
      catch (error) {
        const message = error && error.shortMessage ? error.shortMessage : (error && error.message ? error.message : String(error));
        console.error(`${items[index].id}: ${message}`);
        logEvent({ event: 'actor.error', actor_id: items[index].id, actor_type: items[index].type, error: message, simulation_only: true });
      }
    }
  });
  await Promise.all(workers);
}
async function runRole(role) {
  const { actors, deployment } = loadState();
  const provider = new JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== deployment.chainId) throw new Error('Actor manifest chain ID does not match the connected RPC.');
  const selected = actors.filter((a) => a.type === role);
  if (!selected.length) throw new Error(`No actors found for role ${role}`);
  const facilityArtifact = artifactPath('FacilityRegistry');
  const committeeArtifact = artifactPath('CommitteeInspector');
  const visualizationArtifact = artifactPath('Visualization', 'FacilityFactory/Visualization.sol');
  const telemetryArtifact = artifactPath('SimulationTelemetry');
  const telemetryAddress = deployment.simulationTelemetry;
  const factoryAddress = deployment.factory;
  let cycle = 0;
  const envKey = `${role.toUpperCase()}_INTERVAL_MS`;
  const defaults = { facility_owner: 20000, relayer: 15000, gateway: 12000, inspector: 30000, committee: 60000 };
  const interval = Number(process.env[envKey] || defaults[role] || 15000);
  const concurrency = Number(process.env.ACTOR_CONCURRENCY || 8);
  console.log(`Started ${role} worker for ${selected.length} actors; cycle=${interval}ms; concurrency=${concurrency}`);
  for (; ;) {
    cycle++;
    await mapLimit(selected, concurrency, async (actor) => {
      const wallet = managedWallet(actor.privateKey, provider);
      if (role === 'facility_owner') {
        if (!actor.gatewayIds.length) return;
        const facility = new Contract(actor.facilityAddress, facilityArtifact.abi, wallet);
        const gatewayId = actor.gatewayIds[(cycle - 1) % actor.gatewayIds.length];
        const tx = await facility.setGatewayPolicy(gatewayId, 30 + (cycle % 5), 5);
        const receipt = await tx.wait();
        logEvent({ event: 'gateway.policy_updated', actor_id: actor.id, actor_type: role, facility_id: actor.facilityId, gateway_id: gatewayId, tx_hash: tx.hash, block_number: receipt.blockNumber, simulation_only: true });
      } else if (role === 'relayer') {
        if (!actor.gatewayIds.length) return;
        const facility = new Contract(actor.facilityAddress, facilityArtifact.abi, wallet);
        const gatewayId = actor.gatewayIds[(cycle - 1) % actor.gatewayIds.length];
        const hash = keccak256(toUtf8Bytes(`${actor.address}:${gatewayId}:${cycle}`));
        const nextKey = getAddress(`0x${hash.slice(-40)}`);
        const tx = await facility.rotateKey(gatewayId, nextKey);
        const receipt = await tx.wait();
        logEvent({ event: 'gateway.key_rotated', actor_id: actor.id, actor_type: role, facility_id: actor.facilityId, gateway_id: gatewayId, new_key: nextKey, tx_hash: tx.hash, block_number: receipt.blockNumber, simulation_only: true });
      } else if (role === 'gateway') {
        const payload = { schema: 'verifactory.measurement.v1', gateway_id: actor.gatewayId, facility_id: actor.facilityId, observed_at: new Date().toISOString(), values: { temperature_c: 18 + Math.random() * 12, pressure_kpa: 95 + Math.random() * 15, vibration_mm_s: Math.random() * 4 }, simulation_only: true };
        const cid = await uploadJson(payload, `${actor.gatewayId}-measurement.json`);
        const telemetry = new Contract(telemetryAddress, telemetryArtifact.abi, wallet);
        const observedAt = Math.floor(Date.now() / 1000);
        const tx = await telemetry.recordMeasurement(actor.facilityAddress, actor.gatewayId, cid, observedAt);
        const receipt = await tx.wait();
        const facility = new Contract(actor.facilityAddress, facilityArtifact.abi, provider);
        await facility.getGatewayInfo(actor.gatewayId);
        logEvent({ event: 'measurement.recorded', actor_id: actor.id, actor_type: role, facility_id: actor.facilityId, gateway_id: actor.gatewayId, cid, payload_schema: payload.schema, tx_hash: tx.hash, block_number: receipt.blockNumber, chain_read_verified: true, simulation_only: true });
      } else if (role === 'inspector') {
        const report = { schema: 'verifactory.inspection.v1', inspector: actor.address, observed_at: new Date().toISOString(), findings: [{ category: 'operational_status', status: 'simulated_pass' }], simulation_only: true };
        const cid = await uploadJson(report, `${actor.id}-inspection.json`);
        const committee = new Contract(factoryAddress, committeeArtifact.abi, wallet);
        const tx = await committee.change_candidate_documents([cid]);
        const receipt = await tx.wait();
        const telemetry = new Contract(telemetryAddress, telemetryArtifact.abi, wallet);
        const submitTx = await telemetry.submitInspection(actor.facilityAddress, cid);
        const submitReceipt = await submitTx.wait();
        logEvent({ event: 'inspection.submitted', actor_id: actor.id, actor_type: role, facility_id: actor.facilityId, cid, candidate_docs_tx: tx.hash, tx_hash: submitTx.hash, block_number: submitReceipt.blockNumber, simulation_only: true });
      } else if (role === 'committee') {
        const viz = new Contract(factoryAddress, visualizationArtifact.abi, provider);
        const members = await viz.getCurrentCommittee();
        const votes = await viz.get_top_6_votes();
        logEvent({ event: 'committee.state_observed', actor_id: actor.id, actor_type: role, committee_size: members.length, ranked_candidates: votes.length, simulation_only: true });
      }
    });
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'init') return bootstrap();
  if (command === 'run') {
    const role = process.argv[3];
    const allowed = ['facility_owner', 'relayer', 'gateway', 'inspector', 'committee'];
    if (!allowed.includes(role)) throw new Error(`Usage: node anvilSimulation.cjs run <${allowed.join('|')}>`);
    return runRole(role);
  }
  throw new Error('Usage: node anvilSimulation.cjs <init|run role>');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
