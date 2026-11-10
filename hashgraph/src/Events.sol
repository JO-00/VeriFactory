// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./data_structs.sol";


event RelayerRegistered(address indexed relayerAddress, string name);
event RelayerRemoved(address indexed relayerAddress);
event GatewayAssignedToRelayer(string indexed gatewayId, address indexed relayerAddress);
event GatewayReassigned(string indexed gatewayId, address indexed oldRelayer, address indexed newRelayer);
event GatewayBanned(string indexed gatewayId, address indexed bannedBy, address indexed previousRelayer);


event RoleGrantedToAccount(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevokedFromAccount(bytes32 indexed role, address indexed account, address indexed sender);

event EmergencyOverrideEnabled(uint256 timestamp);
event EmergencyOverrideDisabled(uint256 timestamp);

event KeyRotated(
        string indexed gatewayId, 
        address oldKey, 
        address newKey, 
        bool indexed isAnomalous,
        uint256 timestamp
    );

event FacilityAdded(
    address indexed facilityAddress, 
    string name, 
    address indexed addedBy, 
    string location,
    string sectorType,
    bool isActive
);

event FacilityDeleted(address indexed facilityAddress , string attached_document, uint256 timestamp);

event NewCommittee(uint256 timestamp);
event CommitteeVotesFrozen(uint256 timestamp);

event DocumentAdded(address indexed facilityAddress, string indexed _cid, string indexed _docType);
event DocumentRevoked(address indexed facilityAddress, string indexed _cid);

