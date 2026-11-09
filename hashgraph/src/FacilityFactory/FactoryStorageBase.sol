// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {FacilityRegistry} from "./../Facility/FacilityRegistry.sol";
import {InitialGateway , FacilityMeta , Document , SignedContract , Inspector, CandidateVotes} from "./../data_structs.sol";
import {FacilityAdded} from "./../Events.sol";

abstract contract FactoryStorageBase {
    address public immutable facilityImplementation;

    address public owner;
    string[] public factory_docs;
    string public logo_image;
    

    // Mappings
    address[] public deployedFacilities;
    mapping(address => FacilityMeta) public facilityInfo;
    mapping(address => bool) public everRegistered;


    // facilityAddress => (CID => Document)
    mapping(address => Document[]) public facilityDocs;

    // legal contracts
    Document[] facility_contracts;
    Document inspector_contract;
    mapping(address => SignedContract[]) signed_contracts_per_facility ; //facility addr => its signed contracts
    mapping(string => address []) facilities_per_signed_contract;

    // Events
    event DocumentAdded(address indexed facilityAddress, string cid, string docType);
    event DocumentRevoked(address indexed facilityAddress, string cid);

    // inspectors logic
    Inspector[] public candidates;
    mapping(address => Inspector) candidate_addresses;
    mapping(address => bool) CandidateIsCompliant;
    mapping(address => uint256) public memberStake;
    mapping(address => uint256) candidate_votes;
    mapping(address => bool) hasVoted;
    address[] public voters;
    address[] public DAO;
    address[] public current_committee;
    CandidateVotes[] public top_6_votes;
    uint256 public latest_committee_generation_timestamp;
    mapping(address => address[]) public committee_members_per_facility;
    bool public votes_frozen;

    modifier onlyOwner() {
        require(msg.sender == owner, "Factory: caller is not the owner");
        _;
    }

    modifier onlyFacilityAdmin(address _facility) {
        // Enforces that only the creator/admin of that specific facility (or platform owner) can attach docs
        require(msg.sender == FacilityRegistry(payable(_facility)).admin(), "Unauthorized");
        _;
    }

    modifier isCommitteeMember(address entity) {
        bool found = false;
        for (uint256 i = 0 ; i < current_committee.length ; i++){
            if (current_committee[i] == entity){
                found = true;
                break;
            }
        }
        if (!found){
            revert("not a committee member");
        }
        _;
    }

}