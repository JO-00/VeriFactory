// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FacilityAccess.sol";
import "./FacilityRelayers.sol";
import "./FacilityKeys.sol";
import "./FacilityPolicy.sol";
import "./Visualization.sol";
import {InitialGateway} from "./../data_structs.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract FacilityRegistry is 
    Initializable,
    FacilityAccess, 
    FacilityRelayers, 
    FacilityKeys, 
    FacilityPolicy,
    Visualization
{
    constructor() {
        _disableInitializers();   // lock the implementation itself
    }

    function initialize(
        address _admin,
        string memory _facilityName,
        address[] memory _initialRelayers,
        InitialGateway[] memory _gateways,
        Document[] memory _contracts
    ) external initializer {
        require(_admin != address(0), "Invalid admin address");
        admin = _admin;
        facilityName = _facilityName;
        InspectorContracts = _contracts;
        _grantRole(ADMIN_ROLE, _admin);

        // 1. Register initial relayers
        for (uint256 i = 0; i < _initialRelayers.length; i++) {
            if (_initialRelayers[i] != address(0)) {
                _RegisterRelayer(_initialRelayers[i]);
            }
        }

        // 2. Register initial gateways — relayer must be explicit
        for (uint256 j = 0; j < _gateways.length; j++) {
            require(_gateways[j].relayer != address(0), "Gateway relayer not specified");
            _AssignGatewayToRelayer(_gateways[j].id, _gateways[j].key, _gateways[j].relayer);
        }
    }

    receive() external payable {
        revert("Direct HBAR transfers rejected");
    }
}