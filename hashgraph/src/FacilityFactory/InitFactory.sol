// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FacilityRegistry} from "./../Facility/FacilityRegistry.sol";
import "./../data_structs.sol";
import {FacilityAdded, FacilityDeleted} from "./../Events.sol";
import {IInitFactory} from "./../interfaces/IFactory.sol";
import {FactoryStorageBase} from "./FactoryStorageBase.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


abstract contract InitFactory is IInitFactory ,  FactoryStorageBase{
    using Clones for address;

    

    // we aint gonna instantiate a facility contract with new(...) here cuz it'll bloat bytecode size
    function addExistingFacility(
        address _facilityContract,
        string calldata _location,
        string calldata _sectorType
    ) internal {
        require(_facilityContract != address(0), "Invalid contract address");
        require(facilityInfo[_facilityContract].facilityAddress == address(0), "Facility already registered");

        // 1. Interface Validation: Call facilityName() via try/catch
        string memory retrievedName;
        try FacilityRegistry(payable(_facilityContract)).facilityName() returns (string memory name) {
            require(bytes(name).length > 0, "Invalid facility name");
            retrievedName = name;
        } catch {
            revert("Target address is not a valid FacilityRegistry instance");
        }

        // 2. Ownership Verification: Ensure msg.sender is the Admin of the target facility
        try FacilityRegistry(payable(_facilityContract)).admin() returns (address facilityAdmin) {
            require(facilityAdmin == msg.sender, "Caller is not the admin of target facility");
        } catch {
            revert("Failed to verify facility admin");
        }

        // 3. metadata

        FacilityMeta storage meta = facilityInfo[_facilityContract];
        meta.facilityAddress = _facilityContract;
        meta.name = retrievedName;
        meta.location = _location;
        meta.sectorType = _sectorType;
        meta.createdAt = block.timestamp;
        meta.isActive = true;

        emit FacilityAdded(
            _facilityContract, 
            meta.name, 
            msg.sender, 
            meta.location,
            meta.sectorType,
            meta.isActive
        );
    }


    function createFacility(
        string calldata _name,
        string calldata _location,
        string calldata _sectorType,
        address[] memory _initialRelayers,
        InitialGateway[] memory _gateways,
        Document[] memory contracts
    ) external returns (address clone) {
        clone = facilityImplementation.clone();                 // instantiate the 45-byte proxy
        FacilityRegistry(payable(clone)).initialize(msg.sender, _name , _initialRelayers , _gateways, contracts);
        deployedFacilities.push(clone);
        everRegistered[clone] = true;
        addExistingFacility(clone, _location, _sectorType);

    }

    function removeFacilityFromPlatform(address facility_contract, string memory attached_document) external onlyFacilityAdmin(facility_contract){
        bool found = false;
        for (uint256 i = 0 ; i < deployedFacilities.length ; i++){
            if (deployedFacilities[i] == facility_contract){

                deployedFacilities[i] = deployedFacilities[deployedFacilities.length - 1];
                deployedFacilities.pop();
                found = true;
                break;
                
            }
        }
        if (found){
            delete facilityInfo[facility_contract];
            delete facilityDocs[facility_contract];
            emit FacilityDeleted(facility_contract , attached_document , block.timestamp);
        }
            
    }

    function updateFacilityMeta(address facility_contract , FacilityMeta memory new_data) external onlyFacilityAdmin(facility_contract){
        facilityInfo[facility_contract] = new_data;
    }



    function addFacilityDocument(
        address _facility, 
        string calldata _cid, 
        string calldata _docType, 
        string calldata _title
    ) external onlyFacilityAdmin(_facility) {
        require(bytes(_cid).length > 0, "Invalid CID");
        
        // Save document metadata
        facilityDocs[_facility].push(Document({
            cid: _cid,
            docType: _docType,
            title: _title,
            uploadedAt: block.timestamp
        }));

        // Append to facility CIDs array
        facilityInfo[_facility].docCids.push(_cid);

        emit DocumentAdded(_facility, _cid, _docType);
    }

    /**
     * @notice Replace or revoke an outdated document/rule set CID
     */
    function replaceFacilityDocument(
        address _facility,
        string calldata _oldCid,
        string calldata _newCid,
        string calldata _newDocType,
        string calldata _newTitle
    ) external onlyFacilityAdmin(_facility) {
        require(bytes(_newCid).length > 0, "Invalid new CID");
        require(_removeCid(_facility, _oldCid), "Old CID not found");

        emit DocumentRevoked(_facility, _oldCid);

        facilityDocs[_facility].push(Document({
            cid: _newCid,
            docType: _newDocType,
            title: _newTitle,
            uploadedAt: block.timestamp
        }));

        facilityInfo[_facility].docCids.push(_newCid);

        emit DocumentAdded(_facility, _newCid, _newDocType);
    }

    // Helper internal array cleanup
    function _removeCid(address _facility, string memory _targetCid) internal returns (bool) {
        bytes32 targetHash = keccak256(bytes(_targetCid));
        bool cidFound;
        bool docFound;

        // 1. remove from facilityInfo[_facility].docCids
        string[] storage cids = facilityInfo[_facility].docCids;
        uint256 cidsLen = cids.length;
        for (uint256 i = 0; i < cidsLen; i++) {
            if (keccak256(bytes(cids[i])) == targetHash) {
                cids[i] = cids[cidsLen - 1];
                cids.pop();
                cidFound = true;
                break;
            }
        }

        // 2. remove from facilityDocs[_facility] (Document[])
        Document[] storage docs = facilityDocs[_facility];
        uint256 docsLen = docs.length;
        for (uint256 i = 0; i < docsLen; i++) {
            if (keccak256(bytes(docs[i].cid)) == targetHash) {
                docs[i] = docs[docsLen - 1];
                docs.pop();
                docFound = true;
                break;
            }
        }

        return cidFound && docFound;
    }
    function SignTangibleContract(
        string memory DocumentCID,
        address facility_contract,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyFacilityAdmin(facility_contract) {

        // 1. duplicate check (per facility)
        SignedContract[] storage signed = signed_contracts_per_facility[facility_contract];
        bytes32 cidHash = keccak256(bytes(DocumentCID));
        for (uint256 i = 0; i < signed.length; i++) {
            if (keccak256(bytes(signed[i].DocumentCID)) == cidHash) {
                revert("contract already signed");
            }
        }

        // 2. contract must exist in the registry
        bool found = false;
        for (uint256 i = 0; i < facility_contracts.length; i++) {
            if (keccak256(bytes(facility_contracts[i].cid)) == cidHash) {
                found = true;
                break;
            }
        }
        require(found, "contract not found");

        // 3. signature covers CID + facility address (bound together)
        bytes32 messageHash = keccak256(abi.encodePacked(DocumentCID, facility_contract));
        // NOTE: ecrecover expects an eth_sign-style prefix. See below.
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address recoveredAddress = ecrecover(ethSignedHash, v, r, s);
        require(recoveredAddress == msg.sender, "invalid signature");

        // 4. record
        signed.push(SignedContract({
            DocumentCID: DocumentCID,
            v: v,
            r: r,
            s: s
        }));
        facilities_per_signed_contract[DocumentCID].push(facility_contract);
    }

    


    function setLogo(string memory image_cid) external onlyOwner{
        logo_image = image_cid;
    }

}