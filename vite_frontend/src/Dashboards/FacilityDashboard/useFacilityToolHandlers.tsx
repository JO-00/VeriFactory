// ============== useFacilityToolHandlers.tsx ==============

import React, { useState } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import { shortAddr, handleUpdatePublicURI } from './../facillity_dashboard_mocks';
import {
  RegisterRelayerModal,
  AssignGatewayModal,
  BanGatewayModal,
  ReassignGatewayModal,
  RemoveRelayerModal,
  SetGatewayPolicyModal,
  UpdateURIModal,
  RotateKeyModal,
} from './AdminModals';
import { FacilityContractWrite } from '../../HashGraphUtils/Contracts/Facility/FacilityWrite';

interface Args {
  facilityAddress: string;
  signer: Signer | null;
  emergency: boolean;
  myGateways: string[];
  relayers: string[];
  gateways: string[];
  setPublicURIState: (uri: string) => void;
}

type ModalKind =
  | 'rotate'
  | 'reassign'
  | 'ban'
  | 'registerRelayer'
  | 'removeRelayer'
  | 'assignGateway'
  | 'adminReassign'
  | 'setPolicy'
  | 'updateURI'
  | null;

/** Type-safe extraction of a message from an unknown thrown value. */
function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

export function useFacilityToolHandlers({
  facilityAddress,
  signer,
  emergency,
  myGateways,
  relayers,
  gateways,
  setPublicURIState,
}: Args) {
  const [toolError, setToolError] = useState<string | null>(null);
  const [toolSuccess, setToolSuccess] = useState<string | null>(null);

  const [open, setOpen] = useState<ModalKind>(null);

  const resetToolFeedback = () => {
    setToolError(null);
    setToolSuccess(null);
  };

  const openModal = (kind: Exclude<ModalKind, null>) => setOpen(kind);
  const closeModal = () => setOpen(null);

  // ---------- Handlers ----------

  const onRotateKey = async (gatewayId: string, newKey: string) => {
    resetToolFeedback();
    if (emergency) return setToolError("Key rotations aren't accepted in emergencies.");
    if (!gatewayId || !newKey.trim()) return setToolError('Gateway and new key are required.');
    try {
      // TODO: await FactoryWriteContract.rotateKey(signer, facilityAddress, gatewayId, newKey);
      console.log('[rotate_key]', { facilityAddress, gatewayId, newKey });
      setToolSuccess(`Key rotated for ${shortAddr(gatewayId)}`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Rotate key failed.'));
    }
  };

  const onUpdateURI = async (uri: string) => {
    resetToolFeedback();
    const trimmed = uri.trim();
    if (!trimmed) return setToolError('URI is required.');
    try {
      await handleUpdatePublicURI(facilityAddress, trimmed, signer);
      setPublicURIState(trimmed);
      setToolSuccess('Public URI updated.');
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Update failed.'));
    }
  };

  const onPublishMeasurement = async (gatewayId: string, cid: string) => {
    resetToolFeedback();
    if (!gatewayId || !cid.trim()) return setToolError('Gateway and document CID are required.');
    try {
      // TODO: await FactoryWriteContract.publishMeasurement(signer, facilityAddress, gatewayId, cid);
      console.log('[publish_measurement]', { facilityAddress, gatewayId, cid });
      setToolSuccess(`Measurement published for ${shortAddr(gatewayId)}.`);
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Publish failed.'));
    }
  };

  const onBanGateway = async (gatewayId: string) => {
    resetToolFeedback();
    if (!gatewayId) return setToolError('Select a gateway to ban.');
    if (!myGateways.includes(gatewayId)) return setToolError('You can only ban your own gateways.');
    try {
      // TODO: await FactoryWriteContract.banGateway(signer, facilityAddress, gatewayId);
      console.log('[ban_gateway]', { facilityAddress, gatewayId });
      setToolSuccess(`Gateway ${shortAddr(gatewayId)} banned.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Ban failed.'));
    }
  };

  const onAdminBanGateway = async (gatewayId: string) => {
    resetToolFeedback();
    if (!gatewayId) return setToolError('Select a gateway to ban.');
    try {
      // TODO: await FactoryWriteContract.banGateway(signer, facilityAddress, gatewayId);
      console.log('[admin_ban_gateway]', { facilityAddress, gatewayId });
      setToolSuccess(`Gateway ${shortAddr(gatewayId)} banned.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Ban failed.'));
    }
  };

  const onRegisterRelayer = async (relayerAddress: string) => {
    resetToolFeedback();
    if (!relayerAddress.trim()) return setToolError('Relayer address is required.');
    if (!signer) return setToolError('Connect your wallet first.');   // ← guard
    try {
      await FacilityContractWrite.registerRelayer(signer, facilityAddress, relayerAddress);
      setToolSuccess(`Relayer ${shortAddr(relayerAddress)} registered.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Registration failed.'));
    }
  };

  const onRemoveRelayer = async (relayerAddress: string,) => {
    resetToolFeedback();
    if (!relayerAddress) return setToolError('Select a relayer to remove.');
    try {
      // TODO: await FactoryWriteContract.removeRelayer(signer, facilityAddress, relayerAddress);
      console.log('[remove_relayer]', { facilityAddress, relayerAddress });
      setToolSuccess(`Relayer ${shortAddr(relayerAddress)} removed.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Removal failed.'));
    }
  };

  const onAssignGateway = async (gatewayId: string, gatewayKey: string, relayer: string) => {
    resetToolFeedback();
    if (!gatewayId.trim() || !gatewayKey.trim() || !relayer)
      return setToolError('Gateway ID, key, and relayer are required.');
    try {
      // TODO: await FactoryWriteContract.assignGateway(
      //   signer, facilityAddress, { id: gatewayId, key: gatewayKey, relayer }
      // );
      console.log('[assign_gateway]', { facilityAddress, gatewayId, gatewayKey, relayer });
      setToolSuccess(`Gateway ${gatewayId} assigned to ${shortAddr(relayer)}.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Assignment failed.'));
    }
  };

  const onSetGatewayPolicy = async (
    gatewayId: string,
    expectedInterval: number,
    gracePeriod: number
  ) => {
    resetToolFeedback();
    if (!gatewayId) return setToolError('Select a gateway.');
    if (expectedInterval <= 0 || gracePeriod < 0)
      return setToolError('Interval must be > 0 and grace period ≥ 0.');
    try {
      // TODO: await FactoryWriteContract.setGatewayPolicy(
      //   signer, facilityAddress, gatewayId, expectedInterval, gracePeriod
      // );
      console.log('[set_gateway_policy]', {
        facilityAddress,
        gatewayId,
        expectedInterval,
        gracePeriod,
      });
      setToolSuccess(`Policy updated for ${shortAddr(gatewayId)}.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Set policy failed.'));
    }
  };

  const onAdminReassign = async (gatewayId: string, newRelayer: string) => {
    resetToolFeedback();
    if (!gatewayId || !newRelayer) return setToolError('Gateway and target relayer are required.');
    try {
      // TODO: await FactoryWriteContract.reassignGateway(signer, facilityAddress, gatewayId, newRelayer);
      console.log('[admin_reassign_gateway]', { facilityAddress, gatewayId, newRelayer });
      setToolSuccess(`Gateway ${shortAddr(gatewayId)} reassigned.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Reassign failed.'));
    }
  };

  const onToggleEmergency = async () => {
    resetToolFeedback();
    try {
      // TODO: await FactoryWriteContract.toggleEmergency(signer, facilityAddress);
      console.log('[toggle_emergency]', { facilityAddress });
      setToolSuccess('Emergency toggled.');
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Toggle failed.'));
    }
  };

  const onDeactivate = async () => {
    resetToolFeedback();
    try {
      // TODO: await FactoryWriteContract.deactivateFacility(signer, facilityAddress);
      console.log('[deactivate_facility]', { facilityAddress });
      setToolSuccess('Facility deactivated.');
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Deactivation failed.'));
    }
  };

  // ---------- Modals rendered by the hook ----------

  const modals = (
    <>
      {open === 'rotate' && (
        <RotateKeyModal
          gateways={myGateways}
          emergency={emergency}
          onClose={closeModal}
          onSubmit={onRotateKey}
        />
      )}
      {open === 'registerRelayer' && (
        <RegisterRelayerModal onClose={closeModal} onSubmit={onRegisterRelayer} />
      )}
      {open === 'removeRelayer' && (
        <RemoveRelayerModal
          relayers={relayers}
          onClose={closeModal}
          onSubmit={onRemoveRelayer}
        />
      )}
      {open === 'updateURI' && (
        <UpdateURIModal
          currentURI=""
          onClose={closeModal}
          onSubmit={onUpdateURI}
        />
      )}
      {open === 'assignGateway' && (
        <AssignGatewayModal
          relayers={relayers}
          onClose={closeModal}
          onSubmit={onAssignGateway}
        />
      )}
      {open === 'adminReassign' && (
        <ReassignGatewayModal
          gateways={gateways}
          relayers={relayers}
          onClose={closeModal}
          onSubmit={onAdminReassign}
        />
      )}
      {open === 'setPolicy' && (
        <SetGatewayPolicyModal
          gateways={gateways}
          onClose={closeModal}
          onSubmit={onSetGatewayPolicy}
        />
      )}
      {open === 'ban' && (
        <BanGatewayModal
          gateways={myGateways.length ? myGateways : gateways}
          onClose={closeModal}
          onSubmit={myGateways.length ? onBanGateway : onAdminBanGateway}
        />
      )}
    </>
  );

  return {
    toolError,
    toolSuccess,
    resetToolFeedback,
    onUpdateURI,
    onRotateKey,
    onPublishMeasurement,
    onBanGateway,
    onAdminBanGateway,
    onRegisterRelayer,
    onRemoveRelayer,
    onAssignGateway,
    onSetGatewayPolicy,
    onAdminReassign,
    onToggleEmergency,
    onDeactivate,
    modals,
    openModal,
  };
}