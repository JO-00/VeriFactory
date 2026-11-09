// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../data_structs.sol";

interface IInitFactory{

    function createFacility(
        string calldata _name,
        string calldata _location,
        string calldata _sectorType,
        address[] memory _initialRelayers,
        InitialGateway[] memory _gateways,
        Document[] memory _contracts
    ) external returns (address clone);
    
    function addFacilityDocument(
        address _facility, 
        string calldata _cid, 
        string calldata _docType, 
        string calldata _title
    ) external;

    function replaceFacilityDocument(
        address _facility, 
        string calldata _oldCid, 
        string calldata _newCid, 
        string calldata _newDocType, 
        string calldata _newTitle
    ) external;

    function SignTangibleContract(
        string memory DocumentCID,
        address facility_contract,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}


interface ICommitteeInspector{
    function generate_new_committee() external;
    function rank_candidates(address[] calldata preferences) external;
    function become_candidate(string[] memory attached_documents) external;
    function quit_candidateship() external;
}

interface IVisualization{
    function getFactoryDocs() external view returns (string[] memory);
    function getDeployedFacilities() external view returns (address[] memory);
    function getFacilityCount() external view returns (uint256) ;
    function getFactoryLegalContracts() external view returns (string[] memory);
    function getFacilityGlobalInfo(address facility_contract) external view returns (FacilityMeta memory);
    function getFacilityDocs(address facility_contract) external view returns (Document[] memory);
    function getFacilitySignedContracts(address facility_contract) external view returns (SignedContract[] memory);
    function getFacilitiesFromSignedContract(string memory contract_cid) external view returns (address[] memory);
    function getFacilityCommitteeMembers(address facility_contract) external view returns (address[] memory);
    function getCurrentCommittee() external view returns (address [] memory);
    function getDAO() external view returns (address [] memory);
    function getCandidates() external view returns (Inspector [] memory);
    


    function view_staked_members(address facility_contract) external view returns (StakedMember[] memory);
}





