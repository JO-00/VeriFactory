// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./InitFactory.sol";
import "./../data_structs.sol";
import "./Committee.sol";
import "./Visualization.sol";

contract Factory is  InitFactory , CommitteeInspector, Visualization{
    
    constructor(address implementation, string[] memory platform_docs, Document[] memory _facility_contracts , Document memory _inspector_contract) {
        require(implementation != address(0) , "invalid implementation address");
        owner = msg.sender;
        facilityImplementation = implementation;
        factory_docs = platform_docs;
        facility_contracts = _facility_contracts;
        inspector_contract = _inspector_contract;
    }
    
}