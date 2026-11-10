// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {InitialGateway, FacilityMeta, Document, SignedContract, Inspector, CandidateVotes} from "./../data_structs.sol";

library FactoryStorage {
    struct Layout {
        // --- immutable-ish (see note below) ---
        address facilityImplementation;

        address owner;
        string[] factory_docs;
        string logo_image;

        // mappings
        address[] deployedFacilities;
        mapping(address => FacilityMeta) facilityInfo;
        mapping(address => bool) everRegistered;

        // facilityAddress => Document[]
        mapping(address => Document[]) facilityDocs;

        // legal contracts
        Document[] facility_contracts;
        Document inspector_contract;
        mapping(address => SignedContract[]) signed_contracts_per_facility;
        mapping(string => address[]) facilities_per_signed_contract;

        // inspectors logic
        Inspector[] candidates;
        mapping(address => Inspector) candidate_addresses;
        mapping(address => bool) CandidateIsCompliant;
        mapping(address => uint256) memberStake;
        mapping(address => address[]) inspector_to_facilities;
        mapping(address => Inspector) facility_to_inspector;
        mapping(address => uint256) candidate_votes;
        mapping(address => bool) hasVoted;
        address[] voters;
        address[] DAO;
        address[] current_committee;
        CandidateVotes[] top_6_votes;
        uint256 latest_committee_generation_timestamp;
        mapping(address => address[]) committee_members_per_facility;
        bool votes_frozen;
        mapping(address => uint256) candidateIndexPlusOne;
        mapping(address => uint256) DAOIndexPlusOne;
    }

    bytes32 internal constant SLOT = keccak256("factory.facility.storage.v1");

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = SLOT;
        assembly { l.slot := slot }
    }
}