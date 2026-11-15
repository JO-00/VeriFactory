// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/Facility/FacilityRegistry.sol";
import {Factory as FacilityFactory} from "../../src/FacilityFactory/Factory.sol";
import {CommitteeInspector} from "../../src/FacilityFactory/Committee.sol";
import {Visualization as VisualizationFacet} from "../../src/FacilityFactory/Visualization.sol";
import {InitFactory} from "../../src/FacilityFactory/InitFactory.sol";
import "../../src/data_structs.sol";

abstract contract BaseSetup is Test {
    FacilityRegistry internal impl;
    FacilityFactory internal factory;

    CommitteeInspector internal committeeFacet;
    VisualizationFacet internal vizFacet;
    InitFactory        internal initFacet;

    CommitteeInspector internal committee;
    VisualizationFacet internal viz;
    InitFactory        internal init;

    address internal admin    = address(0xA11CE);
    address internal relayer1 = address(0xB0B);
    address internal relayer2 = address(0xCAFE);
    address internal stranger = address(0xDEAD);

    bytes32 internal constant ADMIN_ROLE   = keccak256("ADMIN");
    bytes32 internal constant RELAYER_ROLE = keccak256("RELAYER");

    function setUp() public virtual {
        Document memory inspectorDoc = Document({
            cid: "QmINSPECTOR",
            docType: "legal",
            title: "Inspector Contract",
            uploadedAt: 0
        });

        Document[] memory legalContracts = new Document[](2);
        legalContracts[0] = Document({
            cid: "QmLEGAL",
            docType: "legal",
            title: "Master Service Agreement",
            uploadedAt: 0
        });
        legalContracts[1] = Document({
            cid: "QmREGISTERED",
            docType: "legal",
            title: "Registered Contract",
            uploadedAt: 0
        });

        impl = new FacilityRegistry();

        factory = new FacilityFactory(
            address(impl),
            new string[](2),          // platform docs
            legalContracts,           // facility contracts — now contains "QmLEGAL"
            inspectorDoc
        );

        committeeFacet = new CommitteeInspector();
        vizFacet       = new VisualizationFacet();
        initFacet      = new InitFactory();

        _wireCommittee();
        _wireVisualization();
        _wireInit();

        committee = CommitteeInspector(address(factory));
        viz       = VisualizationFacet(address(factory));
        init      = InitFactory(address(factory));
    }

    function _wireCommittee() internal {
        bytes4[] memory s = new bytes4[](9);
        s[0] = CommitteeInspector.generate_new_committee.selector;
        s[1] = CommitteeInspector.rank_candidates.selector;
        s[2] = CommitteeInspector.getCurrentInspectors.selector;
        s[3] = CommitteeInspector.become_candidate.selector;
        s[4] = CommitteeInspector.quit_candidateship.selector;
        s[5] = CommitteeInspector.InspectorSignContract.selector;
        s[6] = CommitteeInspector.change_candidate_documents.selector;
        s[7] = CommitteeInspector.set_committee_member.selector;
        s[8] = CommitteeInspector.remove_committee_member.selector;
        factory.addFacet(address(committeeFacet), s);
    }

    function _wireVisualization() internal {
        bytes4[] memory s = new bytes4[](23);
        s[0]  = VisualizationFacet.getFactoryDocs.selector;
        s[1]  = VisualizationFacet.getDeployedFacilities.selector;
        s[2]  = VisualizationFacet.getFacilityCount.selector;
        s[3]  = VisualizationFacet.getFactoryLegalContracts.selector;
        s[4]  = VisualizationFacet.getInspectorLegalContract.selector;
        s[5]  = VisualizationFacet.getFacilityGlobalInfo.selector;
        s[6]  = VisualizationFacet.getFacilityDocs.selector;
        s[7]  = VisualizationFacet.getFacilitySignedContracts.selector;
        s[8]  = VisualizationFacet.getFacilitiesFromSignedContract.selector;
        s[9]  = VisualizationFacet.getFacilityCommitteeMembers.selector;
        s[10] = VisualizationFacet.getCurrentCommittee.selector;
        s[11] = VisualizationFacet.get_top_6_votes.selector;
        s[12] = VisualizationFacet.get_number_of_voters.selector;
        s[13] = VisualizationFacet.getFacilityInspector.selector;
        s[14] = VisualizationFacet.getInspectorFacilities.selector;
        s[15] = VisualizationFacet.getDAO.selector;
        s[16] = VisualizationFacet.getCandidates.selector;
        s[17] = VisualizationFacet.getFacilityExistenceStatus.selector;
        s[18] = VisualizationFacet.view_staked_members.selector;
        s[19] = VisualizationFacet.memberStake.selector;
        s[20] = VisualizationFacet.CandidateIsCompliant.selector;
        s[21] = VisualizationFacet.votes_frozen.selector;
        s[22] = VisualizationFacet.latest_committee_generation_timestamp.selector;
        factory.addFacet(address(vizFacet), s);
    }

    function _wireInit() internal {
        bytes4[] memory s = new bytes4[](8);
        s[0] = InitFactory.createFacility.selector;
        s[1] = InitFactory.removeFacilityFromPlatform.selector;
        s[2] = InitFactory.updateFacilityMeta.selector;
        s[3] = InitFactory.addFacilityDocument.selector;
        s[4] = InitFactory.replaceFacilityDocument.selector;
        s[5] = InitFactory.SignTangibleContract.selector;
        s[6] = InitFactory.setLogo.selector;
        s[7] = InitFactory.setPlatformDocs.selector;
        factory.addFacet(address(initFacet), s);
    }

    function _relayers() internal view returns (address[] memory rs) {
        rs = new address[](2);
        rs[0] = relayer1;
        rs[1] = relayer2;
    }

    function _signInspectorContract(address candidate, uint256 pk) internal {
        bytes32 messageHash = keccak256(abi.encodePacked("QmINSPECTOR"));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedHash);

        vm.prank(candidate);
        committee.InspectorSignContract(v, r, s);

        assertTrue(
            viz.CandidateIsCompliant(candidate),
            "candidate not compliant"
        );
    }

    function _gateways() internal view returns (InitialGateway[] memory gws) {
        gws = new InitialGateway[](2);
        gws[0] = InitialGateway({ id: "GW-1", key: address(0x1111), relayer: relayer1 });
        gws[1] = InitialGateway({ id: "GW-2", key: address(0x2222), relayer: relayer2 });
    }

    function _createFacility(address caller, string memory name)
        internal
        returns (address clone)
    {
        vm.prank(caller);
        clone = init.createFacility(
            name, "Tunis", "Energy", _relayers(), _gateways(), new Document[](2)
        );
    }
}