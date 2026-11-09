// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FacilityStorageBase.sol";
import {IFacilityRelayers} from "./../interfaces/IFacility.sol";
import {RelayerRegistered , GatewayAssignedToRelayer , GatewayReassigned , RelayerRemoved , GatewayBanned } from "./../Events.sol";
import {KeyRecord} from "./../data_structs.sol";


abstract contract FacilityRelayers is FacilityStorageBase, IFacilityRelayers {

    /**
     * @notice Register a new Relayer node
     */
    function registerRelayer(address _relayer) public onlyRole(ADMIN_ROLE) {
        _RegisterRelayer(_relayer);
    }

    function _RegisterRelayer(address _relayer) internal {
        require(_relayer != address(0), "Invalid Relayer Address");
        require(!isRelayer[_relayer] || !hasRole(RELAYER_ROLE, _relayer), "Relayer already registered");

        isRelayer[_relayer] = true;
        relayers.push(_relayer);
        relayerIndexPlusOne[_relayer] = relayers.length;
        _grantRole(RELAYER_ROLE, _relayer);
        emit RelayerRegistered(_relayer, "Facility Relayer Node");
    }

    


    /**
     * @notice Revokes all relayer roles from an address and unassigns managed gateways
     * @dev Cleans up OpenZeppelin role state for both global and gateway-scoped permissions
     */
    function removeRelayer(address _relayer) external onlyRole(ADMIN_ROLE) {
        require(_relayer != address(0), "Invalid address");
        require(hasRole(RELAYER_ROLE , _relayer) && isRelayer[_relayer] , "entity is not even a relayer");
        // 1. REVOKE GLOBAL RELAYER ROLE (IF APPLICABLE)
        

        // 2. ITERATE MANAGED GATEWAYS & REVOKE SCOPED ROLES
        string[] storage managedIds = relayerGateways[_relayer];

        for (uint256 i = 0; i < managedIds.length; i++) {
            string memory gatewayId = managedIds[i];

            // Revoke the dynamic AccessControl role for this specific gateway
            bytes32 scopedRole = getGatewayRelayerRole(gatewayId);
            _revokeRole(scopedRole, _relayer);

            // Orphan or deactivate the gateway reference in state
            gateways[gatewayId].managingRelayer = address(0);
            gateways[gatewayId].isActive = false;
        }

        // 3. DELETE STORAGE ARRAY
        delete relayerGateways[_relayer];
        isRelayer[_relayer] = false;
        _revokeRole(RELAYER_ROLE, _relayer);

        {
            uint256 stored = relayerIndexPlusOne[_relayer];
            require(stored != 0, "relayer not found");
            uint256 idx = stored - 1;
            uint256 last = relayers.length - 1;

            address moved = relayers[last];
            relayers[idx] = moved;
            if (idx != last) {
                relayerIndexPlusOne[moved] = idx + 1;
            }
            relayers.pop();
            delete relayerIndexPlusOne[_relayer];
        }

        emit RelayerRemoved(_relayer);
    }

    
  
    function _AssignGatewayToRelayer(
        string memory _gatewayId, 
        address _initialKey, 
        address _relayer
    ) internal {
    require(isRelayer[_relayer] && hasRole(RELAYER_ROLE, _relayer), "Target address is not an authorized Relayer");
        require(_initialKey != address(0), "Invalid Initial Gateway Key");
        require(!gateways[_gatewayId].isActive, "Gateway already exists");
        require(_initialKey != _relayer, "gateway key and relayer key must not match");
        

        // Populate Gateway Struct
        gateways[_gatewayId] = Gateway({
            gatewayId: _gatewayId,
            activeKey: _initialKey,
            managingRelayer: _relayer,
            isActive: true,
            registeredAt: block.timestamp
        });

        gatewayKeys[_gatewayId] = KeyRecord({
            publicKey : _initialKey,
            createdAt : block.timestamp,
            rotatedAt : 0,
            sequenceNumber : 0

        });

        // Add Gateway ID to Relayer's managed list
        relayerGateways[_relayer].push(_gatewayId);
        _grantRole(getGatewayRelayerRole(_gatewayId), _relayer);
        gateway_ids.push(_gatewayId);
        gatewayIndexPlusOne[_gatewayId] = gateway_ids.length;
        emit GatewayAssignedToRelayer(_gatewayId, _relayer);
}

    // creates new gateway and assigns it to a given relayer

    function assignGatewayToRelayer(
        string memory _gatewayId, 
        address _initialKey, 
        address _relayer
    ) public onlyRole(ADMIN_ROLE) {
        _AssignGatewayToRelayer(_gatewayId, _initialKey, _relayer);
    }

    /**
     * @notice Reassign an existing Gateway from one Relayer to another
     */
    function reassignGatewayRelayer(string calldata _gatewayId, address _newRelayer) external onlyRole(ADMIN_ROLE) {
        require(gateways[_gatewayId].isActive, "Gateway does not exist");
        require(isRelayer[_newRelayer] && hasRole(RELAYER_ROLE , _newRelayer), "New address is not a registered Relayer");
        for (uint256 i = 0 ;  i < relayerGateways[_newRelayer].length ; i++ ){
            if (keccak256(bytes(_gatewayId)) == keccak256(bytes(relayerGateways[_newRelayer][i]))) revert ("gateway and relayer are already binded");
        }

        address oldRelayer = gateways[_gatewayId].managingRelayer;
        require(oldRelayer != _newRelayer, "Gateway already managed by this Relayer");

        // Update Gateway Struct
        gateways[_gatewayId].managingRelayer = _newRelayer;

        // Remove Gateway ID from Old Relayer's array
        _removeGatewayFromRelayerArray(oldRelayer, _gatewayId);

        // Append to New Relayer's array
        relayerGateways[_newRelayer].push(_gatewayId);
        bytes32 scopedRole = getGatewayRelayerRole(_gatewayId);

        _revokeRole(scopedRole, oldRelayer);
        _grantRole(scopedRole, _newRelayer);

        emit GatewayReassigned(_gatewayId, oldRelayer, _newRelayer);
    }

 
    function banGateway(string calldata _gatewayId) external {
        
        require(bytes(gateways[_gatewayId].gatewayId).length != 0, "gateway already inexistant");
        address currentRelayer = gateways[_gatewayId].managingRelayer;

        // 1. Authorization check using hasRole() OR condition
        require(
            msg.sender == currentRelayer || hasRole(ADMIN_ROLE, msg.sender),
            "You have no authority to ban this gateway"
        );

        // Ensure gateway actually exists before proceeding
        require(currentRelayer != address(0), "Gateway does not exist");

        // 2. Remove reference from the actual managing relayer's tracking array
        _removeGatewayFromRelayerArray(currentRelayer, _gatewayId);
        _revokeRole(getGatewayRelayerRole(_gatewayId), currentRelayer);
        delete gatewayKeys[_gatewayId];

        // 3. Clear gateway state from storage
        delete gateways[_gatewayId];
        {
            uint256 stored = gatewayIndexPlusOne[_gatewayId];
            if (stored != 0) {
                uint256 idx = stored - 1;
                uint256 last = gateway_ids.length - 1;
                string memory moved = gateway_ids[last];
                gateway_ids[idx] = moved;
                if (idx != last) {
                    gatewayIndexPlusOne[moved] = idx + 1;
                }
                gateway_ids.pop();
                delete gatewayIndexPlusOne[_gatewayId];
            }
        }

        emit GatewayBanned(_gatewayId, msg.sender, currentRelayer);
    }

    function _removeGatewayFromRelayerArray(address relayer, string memory _gatewayId) internal {
        string[] storage gatewayList = relayerGateways[relayer];
        uint256 length = gatewayList.length;

        for (uint256 i = 0; i < length; i++) {
            if (keccak256(bytes(gatewayList[i])) == keccak256(bytes(_gatewayId))) {
                // Swap target element with the last element
                gatewayList[i] = gatewayList[length - 1];
                // Pop the last element to save gas
                gatewayList.pop();
                break;
            }
        }
    }
}