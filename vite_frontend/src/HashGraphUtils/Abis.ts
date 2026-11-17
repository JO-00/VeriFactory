import { Interface } from "ethers";


export const facilityAbi = new Interface([
  // IFacilityAccess
  "function grantAccountRole(bytes32 role, address account)",
  "function revokeAccountRole(bytes32 role, address account)",
  "function EnableEmergencyOverride()",
  "function DisableEmergencyOverride()",
  "function setLandingPageURI(string new_uri)",
  // IFacilityKeys
  "function rotateKey(string gatewayId, address newPublicKey)",
  // IFacilityPolicy
  "function setGatewayPolicy(string gatewayId, uint256 expectedInterval, uint256 gracePeriod)",
  // IFacilityRelayers
  "function registerRelayer(address _relayer)",
  "function removeRelayer(address _relayer)",
  "function assignGatewayToRelayer(string _gatewayId, address _initialKey, address _relayer)",
  "function reassignGatewayRelayer(string _gatewayId, address _newRelayer)",
  "function banGateway(string _gatewayId)",
]);
export const factoryAbi = new Interface([
  "function createFacility(string _name, string _location, string _sectorType, address[] _initialRelayers, tuple(string id, address key, address relayer)[] _gateways, tuple(string cid, string docType, string title, uint256 uploadedAt)[] _contracts)",
  "function addFacilityDocument(address _facility, string _cid, string _docType, string _title)",
  "function replaceFacilityDocument(address _facility, string _oldCid, string _newCid, string _newDocType, string _newTitle)",
  "function SignTangibleContract(string DocumentCID, address facility_contract, uint8 v, bytes32 r, bytes32 s)",
  "function generate_new_committee()",
  "function rank_candidates(address[] preferences)",
  "function become_candidate(string[] attached_documents)",
  "function quit_candidateship()",
  "function set_committee_member(address new_member, address facility_contract)",
  "function remove_committee_member(address member, address facility_contract)",
  "function removeFacilityFromPlatform(address facility_contract, string memory attached_document)",
  "function InspectorSignContract(uint8 v,bytes32 r,bytes32 s)",
  "function backfillEvents()",
  "function unfreeze_votes()",
  "function assign_inspectors_if_frozen()"
]);