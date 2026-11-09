// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../data_structs.sol";



interface IFacilityAccess{
    function grantAccountRole(bytes32 role, address account) external;
    function revokeAccountRole(bytes32 role, address account) external;
    function hasAccountRole(bytes32 role, address account) external view returns (bool);
    function EnableEmergencyOverride() external;
    function DisableEmergencyOverride() external;
    function setLandingPageURI(string memory new_uri) external;
}

interface IFacilityKeys{
    function rotateKey(string calldata gatewayId, address newPublicKey) external;
}

interface IFacilityPolicy{
    function setGatewayPolicy(
        string calldata gatewayId, 
        uint256 expectedInterval, 
        uint256 gracePeriod,
        uint256 maxPressureLimit
    ) external;



}

interface IVisualization{
        function getAllGateways() external view returns (string[] memory);
    function getAllRelayers() external view returns (address[] memory);
    function getRelayerGateways(address relayer) external view returns (string[] memory );


    function getGatewayInfo(string calldata _gatewayId) external view returns (Gateway memory) ;
    function getGatewayKey(string calldata gatewayId) external view returns (address);
    function getGatewayPolicy(string calldata gatewayId) external view returns (CadencePolicy memory);
}


interface IFacilityRelayers{
    function registerRelayer(address _relayer) external;
    function removeRelayer(address _relayer) external;

    function assignGatewayToRelayer(
        string calldata _gatewayId, 
        address _initialKey, 
        address _relayer
    ) external ;

    function reassignGatewayRelayer(string calldata _gatewayId, address _newRelayer) external;
    function banGateway(string calldata _gatewayId) external;
}


