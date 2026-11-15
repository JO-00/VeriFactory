// ============== FacilityCreationForm.tsx ==============

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { InitialGatewayInput, DocumentInput } from '../../types';
import type { FacilityCreationPayload, RelayerGatewayConfig } from '../dashboard_types';
import { validateRelayerGatewayJSON, buildInitialGateways } from '../../Functionalities/create_facility';
import { useWallet } from '../../Common/WalletProvider';
import { FactoryWriteContract } from './../../HashGraphUtils/Contracts/Factory/FactoryWrite';
import { fetchIPFSBlobUrl, isImageCID } from './../../Functionalities/IPFSHelpers'; // adjust path
import { TransactionReceipt } from '@hiero-ledger/sdk';

// ============================================================
// Per-CID IPFS validation + preview
// ============================================================

type CIDStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface CIDValidation {
  status: CIDStatus;
  error?: string;
  blobUrl?: string;
}

/**
 * Debounced IPFS fetch: whenever `cid` changes, wait ~500ms then try
 * `fetchIPFSBlobUrl`. If it resolves → valid + preview. If it throws →
 * invalid + error. Revokes the blob URL on cleanup / next change.
 */
const useCIDValidation = (cid: string): CIDValidation => {
  const [state, setState] = useState<CIDValidation>({ status: 'idle' });
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = cid.trim();
    if (!trimmed) {
      setState({ status: 'idle' });
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setState({ status: 'checking' });

    const timer = setTimeout(async () => {
      try {
        const url = await fetchIPFSBlobUrl(trimmed);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        // Replace any previous blob URL
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setState({ status: 'valid', blobUrl: url });
      } catch (err: unknown) {
        if (!cancelled) {
          setState({
            status: 'invalid',
            error: err instanceof Error ? err.message : 'Not found on IPFS.',
          });
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cid]);

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  return state;
};

// ============================================================
// Inline preview for a validated CID
// ============================================================

const CIDPreview: React.FC<{ cid: string; validation: CIDValidation }> = ({
  cid,
  validation,
}) => {
  if (validation.status === 'idle') return null;

  if (validation.status === 'checking') {
    return (
      <div className="mt-2 flex items-center gap-2 text-[0.7rem] text-ink-muted">
        <span className="inline-block w-3 h-3 border-2 border-ink-muted border-t-transparent rounded-full animate-spin" />
        Checking IPFS…
      </div>
    );
  }

  if (validation.status === 'invalid') {
    return (
      <div className="mt-2 text-[0.7rem] text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-2 py-1 break-all">
        ⚠️ This CID is not resolvable on IPFS. Check it and try again.
      </div>
    );
  }

  // valid
  const isImage = isImageCID(cid);
  return (
    <div className="mt-2">
      <div className="border border-border rounded-[5px] bg-surface-muted overflow-hidden max-w-md">
        {isImage ? (
          <img
            src={validation.blobUrl!}
            alt={cid}
            className="block max-w-full max-h-[180px] mx-auto"
          />
        ) : (
          <iframe
            src={validation.blobUrl!}
            title={cid}
            className="w-full h-[200px] border-none bg-white"
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// Contract row (wraps inputs + preview + validation state)
// ============================================================

const ContractRow: React.FC<{
  index: number;
  doc: DocumentInput;
  locked: boolean;
  onChange: (patch: Partial<DocumentInput>) => void;
  onRemove: () => void;
  canRemove: boolean;
  registerValidation: (index: number, status: CIDStatus) => void;
}> = ({ index, doc, locked, onChange, onRemove, canRemove, registerValidation }) => {
  const validation = useCIDValidation(doc.cid);

  // Report the status up so the parent knows which rows are valid
  useEffect(() => {
    registerValidation(index, validation.status);
  }, [index, validation.status, registerValidation]);

  const invalid = validation.status === 'invalid';
  const valid = validation.status === 'valid';

  return (
    <div className="bg-bg border border-border-strong rounded-[5px] px-3 py-2.5">
      <div className="grid grid-cols-[1fr_7rem_9rem_auto] gap-2 items-center">
        <input
          value={doc.cid}
          onChange={(e) => onChange({ cid: e.target.value })}
          readOnly={locked}
          placeholder={`Contract #${index + 1} CID (e.g. bafkrei…)`}
          className={`bg-bg border rounded-[5px] px-3 py-1.5 text-sm font-mono text-ink outline-none ${
            locked
              ? 'border-border text-ink-muted cursor-not-allowed'
              : invalid
              ? 'border-[#f2a3a3] focus:border-[#a12626]'
              : valid
              ? 'border-success focus:border-success'
              : 'border-border-strong focus:border-accent'
          }`}
        />
        <input
          value={doc.docType}
          onChange={(e) => onChange({ docType: e.target.value })}
          readOnly={locked}
          placeholder="docType"
          className={`bg-bg border rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none ${
            locked
              ? 'border-border text-ink-muted cursor-not-allowed'
              : 'border-border-strong focus:border-accent'
          }`}
        />
        <input
          value={doc.title}
          onChange={(e) => onChange({ title: e.target.value })}
          readOnly={locked}
          placeholder="Title"
          className={`bg-bg border rounded-[5px] px-3 py-1.5 text-sm text-ink outline-none ${
            locked
              ? 'border-border text-ink-muted cursor-not-allowed'
              : 'border-border-strong focus:border-accent'
          }`}
        />
        {!locked && (
          <button
            onClick={onRemove}
            disabled={!canRemove}
            className={`w-7 h-7 rounded-[5px] border text-sm font-semibold ${
              !canRemove
                ? 'border-border text-ink-faint cursor-not-allowed'
                : 'border-border-strong text-ink-muted hover:border-red-500 hover:text-red-500 cursor-pointer'
            }`}
            title="Remove this contract"
          >
            ×
          </button>
        )}
      </div>

      {/* Inline preview / validation */}
      <CIDPreview cid={doc.cid} validation={validation} />
    </div>
  );
};

// ============================================================
// Main form
// ============================================================

const FacilityCreationForm: React.FC = () => {
  const { signer, isConnected } = useWallet();

  // ── basic info ──
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [sectorType, setSectorType] = useState('');

  // ── contract docs ──
  const emptyDoc = (): DocumentInput => ({
    cid: '',
    docType: 'contract',
    title: '',
    uploadedAt: Math.floor(Date.now() / 1000),
  });
  const [contractDocs, setContractDocs] = useState<DocumentInput[]>([emptyDoc()]);
  const [contractsLocked, setContractsLocked] = useState(false);

  // ── per-row CID validation status (index → status) ──
  const [cidStatuses, setCidStatuses] = useState<Record<number, CIDStatus>>({});

  const registerValidation = React.useCallback(
    (index: number, status: CIDStatus) => {
      setCidStatuses((prev) =>
        prev[index] === status ? prev : { ...prev, [index]: status }
      );
    },
    []
  );

  // ── relayer / gateway config ──
  const [rgConfig, setRgConfig] = useState<RelayerGatewayConfig | null>(null);
  const [initialGateways, setInitialGateways] = useState<InitialGatewayInput[] | null>(null);
  const [rgError, setRgError] = useState<string | null>(null);
  const [rgFileName, setRgFileName] = useState<string | null>(null);

  // ── submit state ──
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // ----------------------------------------------------------
  // Doc handlers
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
    () =>
      contractDocs
        .map((d, i) => ({ ...d, _index: i }))
        .filter((d) => d.cid.trim().length > 0),
    [contractDocs]
  );

  // ── Are all filled docs valid on IPFS? ──
  const allFilledValid = useMemo(() => {
    if (filledDocs.length === 0) return true; // no contracts is fine
    return filledDocs.every((d) => cidStatuses[d._index] === 'valid');
  }, [filledDocs, cidStatuses]);

  const anyFilledInvalid = useMemo(
    () => filledDocs.some((d) => cidStatuses[d._index] === 'invalid'),
    [filledDocs, cidStatuses]
  );

  // ----------------------------------------------------------
  // JSON upload
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

  // ----------------------------------------------------------
  // Submit gating
  // ----------------------------------------------------------
  const canSubmit =
    name.trim().length > 0 &&
    location.trim().length > 0 &&
    sectorType.trim().length > 0 &&
    (filledDocs.length === 0 || contractsLocked) &&
    allFilledValid &&
    !anyFilledInvalid &&
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

      const txId = (receipt as TransactionReceipt)?.transactionId?.toString?.() ?? 'submitted';
      console.log('createFacility receipt:', receipt);
      setSubmitSuccess(`Facility creation submitted — ${txId}`);
    } catch (err: unknown) {
      console.error('createFacility failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Transaction failed.');
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
      </section>

      {/* Contract docs */}
      <section className="bg-surface border border-border rounded-md p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold">Facility contracts (IPFS documents)</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Each CID is checked against IPFS before submission — a CID that can't be resolved blocks the submit.
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
            <ContractRow
              key={i}
              index={i}
              doc={doc}
              locked={contractsLocked}
              onChange={(patch) => updateDoc(i, patch)}
              onRemove={() => removeDoc(i)}
              canRemove={contractDocs.length > 1}
              registerValidation={registerValidation}
            />
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
              disabled={filledDocs.length === 0 || !allFilledValid || anyFilledInvalid}
              className={`mt-2 rounded-[5px] px-3 py-1.5 text-xs font-semibold border ${
                filledDocs.length === 0 || !allFilledValid || anyFilledInvalid
                  ? 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
                  : 'border-accent bg-accent text-white hover:brightness-110 cursor-pointer'
              }`}
              title={
                anyFilledInvalid
                  ? 'Fix the invalid CID(s) before locking'
                  : !allFilledValid
                  ? 'Wait for IPFS checks to finish'
                  : ''
              }
            >
              Lock contracts & continue
            </button>
            {anyFilledInvalid && (
              <div className="text-[0.7rem] text-[#a12626] mt-1.5">
                One or more CIDs are not resolvable on IPFS — fix them to proceed.
              </div>
            )}
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
              : !allFilledValid || anyFilledInvalid
              ? 'One or more contract CIDs are not resolvable on IPFS'
              : !contractsLocked && filledDocs.length > 0
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