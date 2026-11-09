// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


enum Role {Admin , Relayer , User}

struct KeyRecord {
    address publicKey;
    uint256 createdAt;
    uint256 rotatedAt;
    uint256 sequenceNumber;
}

struct CadencePolicy {
    uint256 expectedInterval; // In seconds (e.g. 90 days)
    uint256 gracePeriod;      // In seconds
    uint256 maxPressureLimit; // Physics envelope threshold
}

struct Gateway {
        string gatewayId;
        address activeKey;
        address managingRelayer;
        bool isActive;
        uint256 registeredAt;
    }
struct InitialGateway {
    string id;
    address key;
    address relayer; // Optional: specify explicit relayer, or leave address(0) for auto-assignment
}


// this part for the factory

struct Document {
        string cid;         // IPFS/Arweave Hash (e.g. "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco")
        string docType;     // "SOP", "DATASHEET", "COMPLIANCE_RULE", "LEGAL_GUIDE"
        string title;       // Human-readable title
        uint256 uploadedAt;
    }

struct FacilityMeta {
    address facilityAddress;
    string name;
    string location;
    string sectorType;  // e.g. "Chemical", "Hydroelectric", "Nuclear" , "Solar"
    uint256 createdAt;
    bool isActive;
    string[] docCids;    // Quick lookup list of active CIDs
}


struct SignedContract{
    string DocumentCID;
    uint8 v;
    bytes32 r;
    bytes32 s ;
}

struct Inspector{
    address wallet;
    string[] AttachedDocumentsCIDs;
}


struct StakedMember{
    address wallet;
    uint256 amount;
}

enum FacilityExistenceStatus{
    INEXISTENT,
    DELETED,
    EXISTENT
}

struct WrappedCandidate{
    Inspector candidate;
    bool is_compliant;
}

struct CandidateVotes{
    address wallet ; 
    uint256 votes;
}