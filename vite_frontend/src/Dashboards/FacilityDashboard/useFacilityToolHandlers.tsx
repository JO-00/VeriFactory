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
  AddDAOMemberModal,
  RemoveDAOMemberModal,
} from './AdminModals';
import type { StakedMember } from '../../types';
import { FacilityContractWrite } from '../../HashGraphUtils/Contracts/Facility/FacilityWrite';
import { FactoryWriteContract } from '../../HashGraphUtils/Contracts/Factory/FactoryWrite';

interface Args {
  facilityAddress: string;
  signer: Signer | null;
  emergency: boolean;
  myGateways: string[];
  relayers: string[];
  gateways: string[];
  daoMembers: StakedMember[];       
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
  | 'registerDAO'
  | 'removeDAO'
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
  daoMembers,        // ← new
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
    if (!signer) return setToolError('Connect your wallet first');
    try {
      await FacilityContractWrite.rotateKey(signer, facilityAddress, gatewayId, newKey);
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
      setToolSuccess(`Measurement published for ${shortAddr(gatewayId)}.`);
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Publish failed.'));
    }
  };

  const onAddDAOMember = async (new_member: string, fee : string) => {
    resetToolFeedback();
    if (!new_member) return setToolError('Select a member to add');
    if (!signer) return setToolError('Need to connect to wallet');
    try {
      await FactoryWriteContract.setCommitteeMember(signer , facilityAddress , new_member, fee );
      setToolSuccess(`DAO member added : ${shortAddr(new_member)} !`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Ban failed.'));
    }
  };

  const onRemoveDAO = async (new_member: string) => {
    resetToolFeedback();
    if (!new_member) return setToolError('Select a member to add');
    if (!signer) return setToolError('Need to connect to wallet');
    try {
      await FactoryWriteContract.removeCommitteeMember(signer , facilityAddress , new_member);
      setToolSuccess(`DAO member removed : ${shortAddr(new_member)} !`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Ban failed.'));
    }
  };
  const onBanGateway = async (gatewayId: string) => {
    resetToolFeedback();
    if (!gatewayId) return setToolError('Select a gateway to ban.');
    if (!myGateways.includes(gatewayId)) return setToolError('You can only ban your own gateways.');
    if (!signer) return setToolError('Need to connect to wallet');
    try {
      await FacilityContractWrite.banGateway(signer, facilityAddress, gatewayId);
      setToolSuccess(`Gateway ${shortAddr(gatewayId)} banned.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Ban failed.'));
    }
  };

  const onAdminBanGateway = async (gatewayId: string) => {
    resetToolFeedback();
    if (!gatewayId) return setToolError('Select a gateway to ban.');
    if (!signer) return setToolError('Connect to wallet first');
    try {
      await FacilityContractWrite.banGateway(signer, facilityAddress, gatewayId);
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
    if (!signer) return setToolError('Connect your wallet first.');
    try {
      await FacilityContractWrite.removeRelayer(signer, facilityAddress, relayerAddress);
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
    if (!signer) return setToolError('Connect your wallet first');
    try {
      await FacilityContractWrite.assignGatewayToRelayer(
         signer, facilityAddress, gatewayId, gatewayKey, relayer 
      );
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
    if (!signer) return setToolError('Connect your wallet first');
    try {
      await FacilityContractWrite.setGatewayPolicy(signer , facilityAddress , gatewayId , expectedInterval , gracePeriod)
      setToolSuccess(`Policy updated for ${shortAddr(gatewayId)}.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Set policy failed.'));
    }
  };

  const onAdminReassign = async (gatewayId: string, newRelayer: string) => {
    resetToolFeedback();
    if (!gatewayId || !newRelayer) return setToolError('Gateway and target relayer are required.');
    if (!signer) return setToolError('Connect your wallet first');
    try {
      await FacilityContractWrite.reassignGatewayRelayer(signer, facilityAddress, gatewayId, newRelayer);
      setToolSuccess(`Gateway ${shortAddr(gatewayId)} reassigned.`);
      closeModal();
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Reassign failed.'));
    }
  };

  const onToggleEmergency = async () => {
    resetToolFeedback();
    if (!signer)return setToolError('Connect your wallet first.');
    try {
      if (!emergency) await FacilityContractWrite.enableEmergencyOverride(signer, facilityAddress);
      else return setToolError('Emergency already Activated');
      setToolSuccess('Emergency toggled.');
    } catch (err: unknown) {
      setToolError(getErrorMessage(err, 'Toggle failed.'));
    }
  };

  const onDeactivate = async () => {
    resetToolFeedback();
    if (!signer)return setToolError('Connect your wallet first.');
    try {
      if (emergency) await FacilityContractWrite.disableEmergencyOverride(signer, facilityAddress);
      else return setToolError('Emergency is not even Active');
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
      {open === 'registerDAO' && (
        <AddDAOMemberModal onClose={closeModal} currentDAOMembers={daoMembers} onSubmit={onAddDAOMember} />
      )}
      {open === 'removeDAO' && (
        <RemoveDAOMemberModal onClose={closeModal} members={daoMembers} onSubmit={onRemoveDAO} />
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