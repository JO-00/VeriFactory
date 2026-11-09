// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FacilityStorageBase.sol";
import {IFacilityKeys} from "./../interfaces/IFacility.sol";
import "./../Events.sol";

abstract contract FacilityKeys is FacilityStorageBase, IFacilityKeys {


    function rotateKey(string calldata gatewayId, address newPublicKey) 
        external 
        notInEmergency
    {
        require(newPublicKey != address(0), "Invalid Key");
        require(
            gateways[gatewayId].isActive,
            "Gateway does not exist"
        );

        require(
            gateways[gatewayId].managingRelayer == msg.sender || hasRole(ADMIN_ROLE , msg.sender),
            "Unauthorized gateway relayer"
        );

        require(
            newPublicKey != gateways[gatewayId].activeKey,
            "New key must differ from current key"
        );

        
        require(newPublicKey != msg.sender, "gateway key and relayer key must not match");

        KeyRecord storage record = gatewayKeys[gatewayId];
        address oldKey = record.publicKey;

        // 1. SAFE CADENCE ANOMALY CHECK (Underflow Protected)
        CadencePolicy memory policy = gatewayPolicies[gatewayId];
        bool isAnomalous = false;

        if (record.rotatedAt > 0 && policy.expectedInterval > 0) {
            uint256 timeDelta = block.timestamp - record.rotatedAt;
            
            // Protect against underflow if gracePeriod exceeds expectedInterval
            uint256 minAllowedInterval = policy.expectedInterval > policy.gracePeriod 
                ? policy.expectedInterval - policy.gracePeriod 
                : 0;

            if (timeDelta < minAllowedInterval) {
                isAnomalous = true;
            }
        }


        record.publicKey = newPublicKey;
        record.rotatedAt = block.timestamp;
        record.sequenceNumber += 1;
        gateways[gatewayId].activeKey = newPublicKey;

        emit KeyRotated(gatewayId, oldKey, newPublicKey, isAnomalous, block.timestamp);
    }

    
}