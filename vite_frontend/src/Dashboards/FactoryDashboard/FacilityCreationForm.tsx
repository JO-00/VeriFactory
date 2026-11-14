// ============== FacilityCreationForm.tsx ==============

import React, { useMemo, useState } from 'react';
import type { InitialGatewayInput, DocumentInput } from '../../types';
import type { FacilityCreationPayload, RelayerGatewayConfig } from '../dashboard_types';
import { validateRelayerGatewayJSON, buildInitialGateways } from '../../Functionalities/create_facility';
import { useWallet } from '../../Common/WalletProvider';
import { FactoryWriteContract } from './../../HashGraphUtils/Contracts/Factory/FactoryWrite';

// ============================================================
// Component
// ============================================================

const FacilityCreationForm: React.FC = () => {
  const { signer, isConnected } = useWallet();

  // ── basic info ──
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [sectorType, setSectorType] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  // ── contract docs ──
  const emptyDoc = (): DocumentInput => ({
    cid: '',
    docType: 'contract',
    title: '',
    uploadedAt: Math.floor(Date.now() / 1000),
  });
  const [contractDocs, setContractDocs] = useState<DocumentInput[]>([emptyDoc()]);
  const [contractsLocked, setContractsLocked] = useState(false);

  // ── relayer / gateway config ──
  const [rgConfig, setRgConfig] = useState<RelayerGatewayConfig | null>(null);
  const [initialGateways, setInitialGateways] = useState<InitialGatewayInput[] | null>(null);
  const [rgError, setRgError] = useState<string | null>(null);
  const [rgFileName, setRgFileName] = useState<string | null>(null);

  // ── optional fields (editable later) ──
  const [landingPageURI, setLandingPageURI] = useState('');
  const [logoCid, setLogoCid] = useState('');

  // ── submit state ──
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // ----------------------------------------------------------
  // Contract doc handlers
  // ----------------------------------------------------------
  const updateDoc = (index: number, patch: Partial<DocumentInput>) => {
    if (contractsLocked) return;
    setContractDocs((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  };

  const addDoc = () => {
    if (contractsLocked) return;
    setContractDocs((prev) => [...prev, emptyDoc()]);
  };

  const removeDoc = (index: number) => {
    if (contractsLocked) return;
    setContractDocs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [emptyDoc()] : next;
    });
  };

  const filledDocs = useMemo(
    () => contractDocs.filter((d) => d.cid.trim().length > 0),
    [contractDocs]
  );

  // ----------------------------------------------------------
  // JSON upload handler
  // ----------------------------------------------------------
  const handleFile = async (file: File | null) => {
    setRgError(null);
    setRgConfig(null);
    setInitialGateways(null);
    setRgFileName(file?.name ?? null);

    if (!file) return;

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setRgError('File is not valid JSON.');
      return;
    }

    const result = validateRelayerGatewayJSON(parsed);
    if (!result.ok) {
      setRgError(result.error);
      return;
    }

    const built = buildInitialGateways(result.config);
    if (!built.ok) {
      setRgConfig(result.config);
      setRgError(built.error);
      return;
    }

    setRgConfig(result.config);
    setInitialGateways(built.gateways);
  };

  const canSubmit = 
    name.trim().length > 0 &&
    location.trim().length > 0 &&
    sectorType.trim().length > 0 &&
    (filledDocs.length === 0 || contractsLocked) &&   // ← lock only if docs exist
    rgConfig !== null &&
    initialGateways !== null;

  const handleSubmit = async () => {
  if (!canSubmit || !rgConfig || !initialGateways) return;

  if (!isConnected || !signer) {
    setSubmitError('Connect your wallet first.');
    return;
  }

  setSubmitError(null);
  setSubmitSuccess(null);
  setSubmitting(true);

  const contracts: DocumentInput[] = filledDocs.map((d) => ({
    cid: d.cid.trim(),
    docType: d.docType.trim() || 'contract',
    title: d.title.trim() || `Contract`,
    uploadedAt: d.uploadedAt,
  }));

  // ── Sanitize gateways: ethers rejects '' as an address.
  //    Unassigned relayers become the zero address. ──
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const gatewaysForContract: InitialGatewayInput[] = initialGateways.map((g) => ({
    ...g,
    relayer: g.relayer && g.relayer.trim().length > 0 ? g.relayer : ZERO_ADDRESS,
  }));

  const payload: FacilityCreationPayload = {
    name: name.trim(),
    location: location.trim(),
    sectorType: sectorType.trim(),
    initialRelayers: rgConfig.relayers,
    initialGateways: gatewaysForContract,
    contracts,
    landingPageURI: landingPageURI.trim(),
    logoCid: logoCid.trim(),
    visibility,
    raw: {
      relayers: rgConfig.relayers,
      gateways: rgConfig.gateways,
      relayersGatewaysBinaryMatrix: rgConfig.relayersGatewaysBinaryMatrix,
    },
  };
  console.log('Facility creation payload:', payload);

  try {
    const receipt = await FactoryWriteContract.createFacility(
      signer,
      payload.name,
      payload.location,
      payload.sectorType,
      payload.initialRelayers,
      payload.initialGateways,
      payload.contracts
    );

    const txId = (receipt as any)?.transactionId?.toString?.() ?? 'submitted';
    console.log('createFacility receipt:', receipt);
    setSubmitSuccess(`Facility creation submitted — ${txId}`);

    // TODO: extract the clone address from the receipt logs, then call
    // a follow-up to save landingPageURI / logoCid for that clone.
  } catch (err: any) {
    console.error('createFacility failed:', err);
    setSubmitError(err?.message ?? 'Transaction failed.');
  } finally {
    setSubmitting(false);
  }
};

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------
  return (
    <div className="text-ink max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-[-0.01em]">Create Facility</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Register a new facility, define its contracts, and configure relayers/gateways.
        </p>
      </div>

      {/* Basic info */}
      <section className="bg-surface border border-border rounded-md p-4 mb-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atlas Point Nuclear Generating Station"
            className="w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Pickering, Ontario, Canada"
            className="w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Sector type</label>
          <input
            value={sectorType}
            onChange={(e) => setSectorType(e.target.value)}
            placeholder="e.g. Nuclear Reactor"
            className="w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-ink-muted">
              Landing page URI <span className="text-ink-faint">(optional)</span>
            </label>
            <span className="text-[10px] text-ink-faint italic">You can change this later</span>
          </div>
          <input
            value={landingPageURI}
            onChange={(e) => setLandingPageURI(e.target.value)}
            placeholder="https://your-facility.example.com/"
            className="w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-ink-muted">
              Logo CID <span className="text-ink-faint">(optional)</span>
            </label>
            <span className="text-[10px] text-ink-faint italic">You can change this later</span>
          </div>
          <input
            value={logoCid}
            onChange={(e) => setLogoCid(e.target.value)}
            placeholder="e.g. bafkreiahuey6bj56cemwkr3jg2gjwkpch4a5rdjgljfz25eqefsziokxte"
            className="w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm font-mono text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Visibility</label>
          <div className="flex gap-4">
            {(['public', 'private'] as const).map((v) => (
              <label key={v} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value={v}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  className="accent-accent"
                />
                <span className="capitalize">{v}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Contract docs */}
      <section className="bg-surface border border-border rounded-md p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold">Facility contracts (IPFS documents)</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Each contract is identified by its IPFS CID, plus a type and title.
            </p>
          </div>
          {!contractsLocked && (
            <button
              onClick={addDoc}
              className="rounded-[5px] border border-border-strong bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
              title="Add another contract"
            >
              + Add
            </button>
          )}
        </div>

        <div className="space-y-2">
          {contractDocs.map((doc, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_7rem_9rem_auto] gap-2 items-center"
            >
              <input
                value={doc.cid}
                onChange={(e) => updateDoc(i, { cid: e.target.value })}
                readOnly={contractsLocked}
                placeholder={`Contract #${i + 1} CID (e.g. bafkrei…)`}
                className={`bg-bg border rounded-[5px] px-3 py-1.5 text-sm font-mono text-ink outline-none ${
                  contractsLocked
                    ? 'border-border text-ink-muted cursor-not-allowed'
                    : 'border-border-strong focus:border-accent'
                }`}
              />
              <input
                value={doc.docType}
                onChange={(e) => updateDoc(i, { docType: e.target.value })}
                readOnly={contractsLocked}
                placeholder="docType"
                className={`bg-bg border rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none ${
                  contractsLocked
                    ? 'border-border text-ink-muted cursor-not-allowed'
                    : 'border-border-strong focus:border-accent'
                }`}
              />
              <input
                value={doc.title}
                onChange={(e) => updateDoc(i, { title: e.target.value })}
                readOnly={contractsLocked}
                placeholder="Title"
                className={`bg-bg border rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none ${
                  contractsLocked
                    ? 'border-border text-ink-muted cursor-not-allowed'
                    : 'border-border-strong focus:border-accent'
                }`}
              />
              {!contractsLocked && (
                <button
                  onClick={() => removeDoc(i)}
                  disabled={contractDocs.length === 1}
                  className={`w-7 h-7 rounded-[5px] border text-sm font-semibold ${
                    contractDocs.length === 1
                      ? 'border-border text-ink-faint cursor-not-allowed'
                      : 'border-border-strong text-ink-muted hover:border-red-500 hover:text-red-500 cursor-pointer'
                  }`}
                  title="Remove this contract"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Lock / warning gate */}
        {!contractsLocked ? (
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-start gap-2 bg-[#fff7e6] border border-[#f0c878] rounded-[5px] px-3 py-2 text-xs text-[#7a5a12]">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <div className="font-semibold mb-0.5">This cannot be undone</div>
                Once you confirm, contracts are locked: you will not be able to add or
                remove contract documents for this facility.
              </div>
            </div>
            <button
              onClick={() => setContractsLocked(true)}
              disabled={filledDocs.length === 0}
              className={`mt-2 rounded-[5px] px-3 py-1.5 text-xs font-semibold border ${
                filledDocs.length === 0
                  ? 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
                  : 'border-accent bg-accent text-white hover:brightness-110 cursor-pointer'
              }`}
            >
              Lock contracts & continue
            </button>
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e8f7ee] text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Contracts locked
          </div>
        )}
      </section>

      {/* Relayer / Gateway JSON */}
      <section className="bg-surface border border-border rounded-md p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">Relayers & gateways configuration</h2>
        <p className="text-xs text-ink-muted mb-3">
          Required JSON file containing <code>Relayers</code>, <code>Gateways</code>, and{' '}
          <code>RelayersGatewaysBinaryMatrix</code>. The matrix must have one row per
          relayer and one column per gateway, with 0/1 cells only.
        </p>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent">
            Upload JSON
          </span>
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {rgFileName && <span className="text-xs text-ink-muted">{rgFileName}</span>}
        </label>

        {rgError && (
          <div className="mt-3 bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 text-xs text-[#a12626]">
            <div className="font-semibold mb-0.5">Invalid configuration</div>
            {rgError}
          </div>
        )}

        {rgConfig && (
          <div className="mt-3 text-xs text-ink-muted space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e8f7ee] text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Valid — {rgConfig.relayers.length} relayer(s), {rgConfig.gateways.length}{' '}
              gateway(s), matrix {rgConfig.relayersGatewaysBinaryMatrix.length}×
              {rgConfig.gateways.length}
            </div>
            <div className="font-mono break-all">
              <span className="text-ink">Relayers:</span> {rgConfig.relayers.join(', ')}
            </div>
            <div className="font-mono break-all">
              <span className="text-ink">Gateways:</span> {rgConfig.gateways.join(', ')}
            </div>
            {initialGateways && (
              <div className="font-mono break-all">
                <span className="text-ink">Resolved gateways:</span>{' '}
                {initialGateways
                  .map((g) =>
                    g.relayer
                      ? `#${g.id}:${g.key.slice(0, 8)}…→${g.relayer.slice(0, 6)}…${g.relayer.slice(-4)}`
                      : `#${g.id}:${g.key.slice(0, 8)}…→(unassigned)`
                  )
                  .join(' | ')}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        {!isConnected && (
          <span className="text-xs text-ink-muted italic">Connect wallet to submit</span>
        )}
        {submitError && (
          <span className="text-xs text-red-500 font-medium">{submitError}</span>
        )}
        {submitSuccess && (
          <span className="text-xs text-success font-medium">{submitSuccess}</span>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || !isConnected || submitting}
          className={`rounded-[5px] px-4 py-2 text-sm font-semibold border ${
            canSubmit && isConnected && !submitting
              ? 'border-accent bg-accent text-white hover:brightness-110 cursor-pointer'
              : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
          }`}
          title={
            !isConnected
              ? 'Connect your wallet first'
              : submitting
              ? 'Submitting transaction…'
              : !name.trim() || !location.trim() || !sectorType.trim()
              ? 'Fill in name, location, and sector type'
              : (!contractsLocked && filledDocs.length>0)
              ? 'Lock contracts before submitting'
              : !rgConfig || !initialGateways
              ? 'Upload a valid relayers/gateways JSON file'
              : 'Create facility'
          }
        >
          {submitting ? 'Submitting…' : 'Create facility'}
        </button>
      </div>
    </div>
  );
};

export default FacilityCreationForm;