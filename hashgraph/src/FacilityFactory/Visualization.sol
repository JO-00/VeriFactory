// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./InitFactory.sol";
import "./../data_structs.sol";


abstract contract Visualization is FactoryStorageBase {

    // simple getters
    function getFactoryDocs() external view returns (string[] memory){ return factory_docs; }
    function getDeployedFacilities() external view returns (address[] memory){ return deployedFacilities; }
    function getFacilityCount() external view returns (uint256) { return deployedFacilities.length; }
    function getFactoryLegalContracts() external view returns (Document[] memory){ return facility_contracts; }
    function getInspectorLegalContract() external view returns (Document memory) {return inspector_contract;}
    function getFacilityGlobalInfo(address facility_contract) external view returns (FacilityMeta memory){ return facilityInfo[facility_contract]; }
    function getFacilityDocs(address facility_contract) external view returns (Document[] memory){ return facilityDocs[facility_contract]; }
    function getFacilitySignedContracts(address facility_contract) external view returns (SignedContract[] memory){ return signed_contracts_per_facility[facility_contract]; }
    function getFacilitiesFromSignedContract(string memory contract_cid) external view returns (address[] memory){ return facilities_per_signed_contract[contract_cid]; }
    function getFacilityCommitteeMembers(address facility_contract) external view returns (address[] memory){ return committee_members_per_facility[facility_contract]; }
    function getCurrentCommittee() external view returns (address [] memory){ return current_committee ; }
    function get_top_6_votes() external view returns (CandidateVotes[] memory) {return top_6_votes;}
    function get_number_of_voters() external view returns (uint256) {return voters.length;}
    function getCurrentInspectors() external view returns (Inspector[5] memory winners) {
        require (votes_frozen , "votes not frozen yet");
        for (uint8 i = 0 ; i < 5 ; i++){
            winners[i] = candidate_addresses[top_6_votes[i].wallet];
        }
    }
    function getDAO() external view returns (address [] memory){ return DAO ; }
    function getCandidates() external view returns (WrappedCandidate [] memory){
        WrappedCandidate[] memory candidates_wrapped  = new WrappedCandidate[](candidates.length);
        for (uint256 i = 0 ; i < candidates.length ; i++){
            candidates_wrapped[i].candidate = candidates[i];
            candidates_wrapped[i].is_compliant = CandidateIsCompliant[candidates[i].wallet];
        }
        return candidates_wrapped;
    }
    function getFacilityExistenceStatus(address facility_contract)external view returns (FacilityExistenceStatus){
        if (facilityInfo[facility_contract].facilityAddress == address(0)){
            if (everRegistered[facility_contract]) return FacilityExistenceStatus.DELETED;
            else return FacilityExistenceStatus.INEXISTENT;
        }
        return FacilityExistenceStatus.EXISTENT;
    }
    


    function view_staked_members(address facility_contract)
        external
        view
        returns (StakedMember[] memory)
    {
        address[] memory members = committee_members_per_facility[facility_contract];
        uint256 n = members.length;

        StakedMember[] memory out = new StakedMember[](n);
        for (uint256 i = 0; i < n; ) {
            address m = members[i];
            out[i] = StakedMember({ wallet: m, amount: memberStake[m] });
            unchecked { ++i; }
        }
        return out;
    }

    

    
    
    
}