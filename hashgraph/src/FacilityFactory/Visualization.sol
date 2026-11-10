// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../data_structs.sol";
import {FactoryStorage} from "./FactoryStorageBase.sol";
import {FactoryAuth} from "./FactoryAuth.sol";

contract Visualization is FactoryAuth {

    // simple getters
    function getFactoryDocs() external view returns (string[] memory) {
        return FactoryStorage.layout().factory_docs;
    }

    function getDeployedFacilities() external view returns (address[] memory) {
        return FactoryStorage.layout().deployedFacilities;
    }

    function getFacilityCount() external view returns (uint256) {
        return FactoryStorage.layout().deployedFacilities.length;
    }

    function getFactoryLegalContracts() external view returns (Document[] memory) {
        return FactoryStorage.layout().facility_contracts;
    }

    function getInspectorLegalContract() external view returns (Document memory) {
        return FactoryStorage.layout().inspector_contract;
    }

    function getFacilityGlobalInfo(address facility_contract) external view returns (FacilityMeta memory) {
        return FactoryStorage.layout().facilityInfo[facility_contract];
    }

    function getFacilityDocs(address facility_contract) external view returns (Document[] memory) {
        return FactoryStorage.layout().facilityDocs[facility_contract];
    }

    function getFacilitySignedContracts(address facility_contract) external view returns (SignedContract[] memory) {
        return FactoryStorage.layout().signed_contracts_per_facility[facility_contract];
    }

    function getFacilitiesFromSignedContract(string memory contract_cid) external view returns (address[] memory) {
        return FactoryStorage.layout().facilities_per_signed_contract[contract_cid];
    }

    function getFacilityCommitteeMembers(address facility_contract) external view returns (address[] memory) {
        return FactoryStorage.layout().committee_members_per_facility[facility_contract];
    }

    function getCurrentCommittee() external view returns (address[] memory) {
        return FactoryStorage.layout().current_committee;
    }

    function get_top_6_votes() external view returns (CandidateVotes[] memory) {
        return FactoryStorage.layout().top_6_votes;
    }

    function get_number_of_voters() external view returns (uint256) {
        return FactoryStorage.layout().voters.length;
    }

    function getFacilityInspector(address facility_contract)
        Frozen
        external
        view
        returns (Inspector memory)
    {
        return FactoryStorage.layout().facility_to_inspector[facility_contract];
    }

    function getInspectorFacilities(address inspector_address)
        Frozen
        external
        view
        returns (address[] memory)
    {
        return FactoryStorage.layout().inspector_to_facilities[inspector_address];
    }

    function getDAO() external view returns (address[] memory) {
        return FactoryStorage.layout().DAO;
    }

    function getCandidates() external view returns (WrappedCandidate[] memory) {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        WrappedCandidate[] memory candidates_wrapped = new WrappedCandidate[](l.candidates.length);
        for (uint256 i = 0 ; i < l.candidates.length ; i++){
            candidates_wrapped[i].candidate = l.candidates[i];
            candidates_wrapped[i].is_compliant = l.CandidateIsCompliant[l.candidates[i].wallet];
        }
        return candidates_wrapped;
    }

    function getFacilityExistenceStatus(address facility_contract) external view returns (FacilityExistenceStatus) {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        if (l.facilityInfo[facility_contract].facilityAddress == address(0)){
            if (l.everRegistered[facility_contract]) return FacilityExistenceStatus.DELETED;
            else return FacilityExistenceStatus.INEXISTENT;
        }
        return FacilityExistenceStatus.EXISTENT;
    }

    function view_staked_members(address facility_contract)
        external
        view
        returns (StakedMember[] memory)
    {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        address[] memory members = l.committee_members_per_facility[facility_contract];
        uint256 n = members.length;

        StakedMember[] memory out = new StakedMember[](n);
        for (uint256 i = 0; i < n; ) {
            address m = members[i];
            out[i] = StakedMember({ wallet: m, amount: l.memberStake[m] });
            unchecked { ++i; }
        }
        return out;
    }
    function memberStake(address who) external view returns (uint256) {
        return FactoryStorage.layout().memberStake[who];
    }

    function CandidateIsCompliant(address who) external view returns (bool){
        return FactoryStorage.layout().CandidateIsCompliant[who];
    }
    function votes_frozen() external view returns (bool){
        return FactoryStorage.layout().votes_frozen;
    }
    function latest_committee_generation_timestamp() external view returns (uint256){
        return FactoryStorage.layout().latest_committee_generation_timestamp;
    }
}