// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FacilityStorageBase.sol";
import {IFacilityPolicy} from "./../interfaces/IFacility.sol";


abstract contract FacilityPolicy is FacilityStorageBase , IFacilityPolicy {

    function setGatewayPolicy(
        string calldata gatewayId, 
        uint256 expectedInterval, 
        uint256 gracePeriod
    ) external onlyRole(ADMIN_ROLE) {
        require(bytes(gateways[gatewayId].gatewayId).length != 0, "gateway doesn't even exist");
        gatewayPolicies[gatewayId] = CadencePolicy({
            expectedInterval: expectedInterval,
            gracePeriod: gracePeriod
        });
    }

    
}