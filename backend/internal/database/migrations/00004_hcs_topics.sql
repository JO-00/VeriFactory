-- +goose Up

CREATE TABLE verifactory.hcs_topic_cursors (
    topic_id TEXT PRIMARY KEY,
    last_consensus_timestamp TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verifactory.gateway_documents (
    id BIGSERIAL PRIMARY KEY,
    topic_id TEXT NOT NULL,
    consensus_timestamp TEXT NOT NULL,
    facility_address TEXT NOT NULL,
    gateway_id TEXT NOT NULL,
    gateway_address TEXT NOT NULL,
    document_cid TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (topic_id, consensus_timestamp)
);

CREATE INDEX idx_gateway_documents_facility_gateway
    ON verifactory.gateway_documents (facility_address, gateway_id, consensus_timestamp DESC);

CREATE TABLE verifactory.inspector_reports (
    id BIGSERIAL PRIMARY KEY,
    topic_id TEXT NOT NULL,
    consensus_timestamp TEXT NOT NULL,
    facility_address TEXT NOT NULL,
    inspector_address TEXT NOT NULL,
    report_cid TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (topic_id, consensus_timestamp)
);

CREATE INDEX idx_inspector_reports_inspector
    ON verifactory.inspector_reports (inspector_address, consensus_timestamp DESC);

CREATE INDEX idx_inspector_reports_facility
    ON verifactory.inspector_reports (facility_address, consensus_timestamp DESC);

CREATE INDEX idx_inspector_reports_facility_inspector
    ON verifactory.inspector_reports (facility_address, inspector_address, consensus_timestamp DESC);

-- +goose Down

DROP TABLE IF EXISTS verifactory.inspector_reports;
DROP TABLE IF EXISTS verifactory.gateway_documents;
DROP TABLE IF EXISTS verifactory.hcs_topic_cursors;
