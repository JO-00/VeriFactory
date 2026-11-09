// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {KeyRecord, CadencePolicy , Gateway, Document} from "./../data_structs.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


abstract contract FacilityStorageBase is AccessControl {

    bytes32 public constant ADMIN_ROLE        = keccak256("ADMIN");
    bytes32 public constant OBSERVER_ROLE     = keccak256("OBSERVER");
    bytes32 public constant RELAYER_ROLE     = keccak256("RELAYER");
    
    // we dont add relayers here because it depends on which gateway


    string public facilityName;
    bool public emergencyOverride;
    address public admin;

    Document[] public InspectorContracts;

    // Relayer Core Mappings
    mapping(address => bool) public isRelayer;
    address[] public relayers;
    mapping(address => uint256) relayerIndexPlusOne;
    mapping(address => string[]) public relayerGateways; // Relayer => Array of Gateway IDs
    
    // Gateway Core Mappings
    mapping(string => Gateway) public gateways;         // Gateway ID => Gateway Struct
    string[] public gateway_ids;
    mapping(string => uint256) gatewayIndexPlusOne;
    mapping(string => CadencePolicy) public gatewayPolicies;
    mapping(string => KeyRecord) public gatewayKeys;

    // --- Modifiers ---
    modifier notInEmergency() {
        require(!emergencyOverride, "State: Emergency Lockdown Active");
        _;
    }
    function getGatewayRelayerRole(string memory gatewayId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("RELAYER_ROLE", gatewayId));
    }
}