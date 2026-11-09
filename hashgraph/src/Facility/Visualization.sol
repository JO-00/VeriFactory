// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FacilityStorageBase.sol";
import "./../data_structs.sol";

abstract contract Visualization is FacilityStorageBase {
    function getAllGateways() external view returns (string[] memory) {return gateway_ids;}
    function getAllRelayers() external view returns (address[] memory) { return relayers; }
    function getRelayerGateways(address relayer) external view returns (string[] memory ) { return relayerGateways[relayer];}
    function getAllContracts() external view returns (Document[] memory) { return InspectorContracts; }


    function getGatewayInfo(string calldata _gatewayId) external view returns (Gateway memory) { return gateways[_gatewayId]; }
    function getGatewayKey(string calldata gatewayId) external view returns (address) { return gatewayKeys[gatewayId].publicKey; }
    function getGatewayPolicy(string calldata gatewayId) external view returns (CadencePolicy memory) { return gatewayPolicies[gatewayId]; }

    function getUserRole(address user) external view returns (Role){
        if (hasRole(ADMIN_ROLE , user)) return Role.Admin;
        if (hasRole(RELAYER_ROLE, user)) return Role.Relayer;
        return Role.User;
    }

    


}