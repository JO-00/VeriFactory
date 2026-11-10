// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FactoryDocumentsTest is BaseSetup {
    address internal clone;

    function setUp() public override {
        super.setUp();
        clone = _createFacility(admin, "F");
    }

    function test_addDocument_admin() public {
        vm.prank(admin);
        init.addFacilityDocument(clone, "QmCID1", "SOP", "Title 1");

        Document[] memory docs = viz.getFacilityDocs(clone);
        assertEq(docs.length, 1);
        assertEq(docs[0].cid, "QmCID1");
        assertEq(docs[0].docType, "SOP");
        assertEq(docs[0].title, "Title 1");
    }

    function test_addDocument_nonAdminReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        init.addFacilityDocument(clone, "QmCID1", "SOP", "Title 1");
    }

    function test_replaceDocument_admin() public {
        vm.startPrank(admin);
        init.addFacilityDocument(clone, "QmOLD", "SOP", "Old");
        init.replaceFacilityDocument(clone, "QmOLD", "QmNEW", "SOP2", "New");
        vm.stopPrank();

        Document[] memory docs = viz.getFacilityDocs(clone);
        bool foundNew = false;
        for (uint256 i = 0; i < docs.length; i++) {
            if (keccak256(bytes(docs[i].cid)) == keccak256(bytes("QmNEW"))) foundNew = true;
            assertTrue(keccak256(bytes(docs[i].cid)) != keccak256(bytes("QmOLD")), "old cid still present");
        }
        assertTrue(foundNew, "new cid not present");
    }

    function test_replaceDocument_nonAdminReverts() public {
        vm.prank(admin);
        init.addFacilityDocument(clone, "QmOLD", "SOP", "Old");

        vm.prank(stranger);
        vm.expectRevert();
        init.replaceFacilityDocument(clone, "QmOLD", "QmNEW", "SOP2", "New");
    }
}