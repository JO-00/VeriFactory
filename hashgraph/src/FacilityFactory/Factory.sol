// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FactoryStorage} from "./FactoryStorageBase.sol";
import "../data_structs.sol";

contract Factory {
    // selector => facet address
    mapping(bytes4 => address) public facets;

    event FacetAdded(bytes4 indexed selector, address facet);

    constructor(
        address implementation,
        string[] memory platform_docs,
        Document[] memory _facility_contracts,
        Document memory _inspector_contract
    ) {
        require(implementation != address(0), "invalid implementation address");

        FactoryStorage.Layout storage l = FactoryStorage.layout();
        l.owner = msg.sender;
        l.facilityImplementation = implementation;
        l.factory_docs = platform_docs;
        l.facility_contracts = _facility_contracts;
        l.inspector_contract = _inspector_contract;
        for (uint256 i = 0; i < 6; i++) {
            l.top_6_votes.push();
        }
    }

    function addFacet(address facet, bytes4[] calldata selectors) external {
        require(msg.sender == FactoryStorage.layout().owner, "not owner");
        for (uint256 i = 0; i < selectors.length; i++) {
            facets[selectors[i]] = facet;
            emit FacetAdded(selectors[i], facet);
        }
    }

    fallback() external payable {
        address facet = facets[msg.sig];
        require(facet != address(0), "no facet for selector");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let ok := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch ok
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}