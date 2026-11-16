package read

import (
	"encoding/json"
	"time"
)

type Proof struct {
	TransactionHash    string `json:"transaction_hash,omitempty"`
	ConsensusTimestamp string `json:"consensus_timestamp,omitempty"`
	CID                string `json:"cid,omitempty"`
}

type PaginationMeta struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
	Total  int64 `json:"total,omitempty"`
}

type PaginatedResponse[T any] struct {
	Data       []T            `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}

type ConfigResponse struct {
	Network        string              `json:"network"`
	FactoryAddress string              `json:"factory_address"`
	MirrorNodeURL  string              `json:"mirror_node_url"`
	IPFSGatewayURL string              `json:"ipfs_gateway_url"`
	LegalDocuments []LegalDocumentItem `json:"legal_documents"`
}

type LegalDocumentItem struct {
	CID       string `json:"cid"`
	Title     string `json:"title"`
	Scope     string `json:"scope"`
	SortOrder int32  `json:"sort_order"`
}

type FacilityHealthSummary struct {
	TotalGateways   int32  `json:"total_gateways"`
	HealthyGateways int32  `json:"healthy_gateways"`
	SilentGateways  int32  `json:"silent_gateways"`
	Status          string `json:"status"` // healthy | degraded | offline | unprovisioned
}

type FacilitySummary struct {
	Address                string                `json:"address"`
	Name                   string                `json:"name"`
	Location               string                `json:"location"`
	Sector                 string                `json:"sector"`
	Status                 string                `json:"status"`
	LandingPageURI         string                `json:"landing_page_uri"`
	AssignedInspector      string                `json:"assigned_inspector,omitempty"`
	SignedContractsCount   int32                 `json:"signed_contracts_count"`
	RequiredContractsCount int32                 `json:"required_contracts_count"`
	Health                 FacilityHealthSummary `json:"health"`
	Proof                  Proof                 `json:"proof"`
	CreatedAt              time.Time             `json:"created_at"`
	UpdatedAt              time.Time             `json:"updated_at"`
}

type FacilityDetail struct {
	FacilitySummary
	Documents []FacilityDocumentItem `json:"documents"`
	Contracts []SignedContractItem   `json:"contracts"`
	Relayers  []RelayerItem          `json:"relayers"`
	Gateways  []GatewayItem          `json:"gateways"`
}

type FacilityDocumentItem struct {
	ID              int64     `json:"id"`
	FacilityAddress string    `json:"facility_address"`
	CID             string    `json:"cid"`
	DocType         string    `json:"doc_type"`
	Title           string    `json:"title"`
	Revoked         bool      `json:"revoked"`
	Proof           Proof     `json:"proof"`
	AddedAt         time.Time `json:"added_at"`
}

type SignedContractItem struct {
	CID       string     `json:"cid"`
	Title     string     `json:"title"`
	Scope     string     `json:"scope"`
	SortOrder int32      `json:"sort_order"`
	Signed    bool       `json:"signed"`
	Signer    string     `json:"signer_address,omitempty"`
	Proof     Proof      `json:"proof"`
	SignedAt  *time.Time `json:"signed_at,omitempty"`
}

type RelayerItem struct {
	RelayerAddress string    `json:"relayer_address"`
	Active         bool      `json:"active"`
	Proof          Proof     `json:"proof"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type GatewayItem struct {
	GatewayID           string     `json:"gateway_id"`
	FacilityAddress     string     `json:"facility_address"`
	ManagingRelayer     string     `json:"managing_relayer"`
	ActiveKey           string     `json:"active_key"`
	Banned              bool       `json:"banned"`
	ExpectedIntervalSec int32      `json:"expected_interval_sec"`
	GracePeriodSec      int32      `json:"grace_period_sec"`
	Online              bool       `json:"online"`
	LastSeenAt          *time.Time `json:"last_seen_at,omitempty"`
	Proof               Proof      `json:"proof"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type GatewayKeyHistoryItem struct {
	ID          int64     `json:"id"`
	GatewayID   string    `json:"gateway_id"`
	OldKey      string    `json:"old_key"`
	NewKey      string    `json:"new_key"`
	IsAnomalous bool      `json:"is_anomalous"`
	Proof       Proof     `json:"proof"`
	RotatedAt   time.Time `json:"rotated_at"`
}

type MeasurementBatchItem struct {
	BatchID           string    `json:"batch_id"`
	FacilityAddress   string    `json:"facility_address"`
	GatewayID         string    `json:"gateway_id"`
	MerkleRoot        string    `json:"merkle_root"`
	CID               string    `json:"cid"`
	ReadingCount      int32     `json:"reading_count"`
	WindowStart       time.Time `json:"window_start"`
	WindowEnd         time.Time `json:"window_end"`
	HCSTopicID        string    `json:"hcs_topic_id,omitempty"`
	HCSSequenceNumber int64     `json:"hcs_sequence_number,omitempty"`
	Proof             Proof     `json:"proof"`
	AnchoredAt        time.Time `json:"anchored_at"`
}

type InspectionItem struct {
	ID              int64     `json:"id"`
	FacilityAddress string    `json:"facility_address"`
	InspectorWallet string    `json:"inspector_wallet"`
	Epoch           int64     `json:"epoch"`
	ReportCID       string    `json:"report_cid"`
	Status          string    `json:"status"`
	Proof           Proof     `json:"proof"`
	SubmittedAt     time.Time `json:"submitted_at"`
}

type DAOMemberItem struct {
	Address         string    `json:"address"`
	FacilityAddress string    `json:"facility_address"`
	Stake           string    `json:"stake"`
	Proof           Proof     `json:"proof"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type DAOResponse struct {
	MemberCount int             `json:"member_count"`
	Members     []DAOMemberItem `json:"members"`
}

type CandidateItem struct {
	Address      string    `json:"address"`
	DocumentCIDs []string  `json:"document_cids"`
	Compliant    bool      `json:"compliant"`
	Active       bool      `json:"active"`
	Proof        Proof     `json:"proof"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CommitteeEpochItem struct {
	Epoch       int64             `json:"epoch"`
	Members     []string          `json:"members"`
	VotesFrozen bool              `json:"votes_frozen"`
	VoteTallies json.RawMessage   `json:"vote_tallies"`
	Assignments map[string]string `json:"assignments"`
	Proof       Proof             `json:"proof"`
	GeneratedAt time.Time         `json:"generated_at"`
}

type InspectorProfileResponse struct {
	Wallet             string           `json:"wallet"`
	CurrentEpoch       int64            `json:"current_epoch"`
	IsCommitteeMember  bool             `json:"is_committee_member"`
	AssignedFacilities []string         `json:"assigned_facilities"`
	RecentInspections  []InspectionItem `json:"recent_inspections"`
}

type IndexerCursorItem struct {
	StreamID               string    `json:"stream_id"`
	Network                string    `json:"network"`
	ContractAddress        string    `json:"contract_address"`
	LastConsensusTimestamp string    `json:"last_consensus_timestamp"`
	LastTransactionHash    string    `json:"last_transaction_hash"`
	LastLogIndex           int64     `json:"last_log_index"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type IndexerStatusResponse struct {
	Network       string              `json:"network"`
	TotalEvents   int64               `json:"total_events"`
	DecodedEvents int64               `json:"decoded_events"`
	Cursors       []IndexerCursorItem `json:"cursors"`
}
