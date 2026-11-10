// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Local-demo event adapter for actor telemetry not represented in the
///         supplied VeriFactory production contracts.
/// @dev Deploy only to Anvil/local development chains. This is not a Hedera
///      HCS replacement and is not intended for production deployment.
contract SimulationTelemetry {
    address public immutable owner;
    mapping(address => bool) public authorizedGateways;
    mapping(address => bool) public authorizedInspectors;

    event GatewayAuthorized(address indexed gateway);
    event InspectorAuthorized(address indexed inspector);
    event MeasurementRecorded(
        address indexed facility,
        address indexed gateway,
        string gatewayId,
        string cid,
        uint256 observedAt
    );
    event InspectionSubmitted(
        address indexed facility,
        address indexed inspector,
        string cid,
        uint256 submittedAt
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not simulation owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function authorizeGateways(address[] calldata gateways) external onlyOwner {
        for (uint256 i = 0; i < gateways.length; i++) {
            require(gateways[i] != address(0), "invalid gateway");
            authorizedGateways[gateways[i]] = true;
            emit GatewayAuthorized(gateways[i]);
        }
    }

    function authorizeInspectors(address[] calldata inspectors) external onlyOwner {
        for (uint256 i = 0; i < inspectors.length; i++) {
            require(inspectors[i] != address(0), "invalid inspector");
            authorizedInspectors[inspectors[i]] = true;
            emit InspectorAuthorized(inspectors[i]);
        }
    }

    function recordMeasurement(
        address facility,
        string calldata gatewayId,
        string calldata cid,
        uint256 observedAt
    ) external {
        require(authorizedGateways[msg.sender], "unauthorized gateway");
        require(facility != address(0), "invalid facility");
        require(bytes(gatewayId).length != 0, "empty gateway id");
        require(bytes(cid).length != 0, "empty cid");
        emit MeasurementRecorded(facility, msg.sender, gatewayId, cid, observedAt);
    }

    function submitInspection(address facility, string calldata cid) external {
        require(authorizedInspectors[msg.sender], "unauthorized inspector");
        require(facility != address(0), "invalid facility");
        require(bytes(cid).length != 0, "empty cid");
        emit InspectionSubmitted(facility, msg.sender, cid, block.timestamp);
    }
}
