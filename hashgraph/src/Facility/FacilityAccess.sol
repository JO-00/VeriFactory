// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FacilityStorageBase.sol";
import {IFacilityAccess} from "./../interfaces/IFacility.sol";
import {EmergencyOverrideEnabled , EmergencyOverrideDisabled , RoleGrantedToAccount , RoleRevokedFromAccount} from "./../Events.sol";

abstract contract FacilityAccess is FacilityStorageBase, IFacilityAccess {
    
    function grantAccountRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        _grantRole(role, account);
        emit RoleGrantedToAccount(role, account, msg.sender);
    }

    /**
     * @notice Revokes a specific role from an account
     * @dev Restricted to callers holding the admin role over `role`
     */
    function revokeAccountRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        _revokeRole(role, account);
        emit RoleRevokedFromAccount(role, account, msg.sender);
    }

    /**
     * @notice Replaces getUserRole(): Non-reverting boolean query
     * @dev Checks whether a target account holds a specific role
     */
    function hasAccountRole(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }

    function EnableEmergencyOverride() external onlyRole(ADMIN_ROLE) {
        emergencyOverride = true;
        emit EmergencyOverrideEnabled(block.timestamp);
    }
    function DisableEmergencyOverride() external onlyRole(ADMIN_ROLE){
        emergencyOverride = false;
        emit EmergencyOverrideDisabled(block.timestamp);
    }

    function setLandingPageURI(string memory new_uri) external onlyRole(ADMIN_ROLE){
        LandingPageURI = new_uri;
    }
}