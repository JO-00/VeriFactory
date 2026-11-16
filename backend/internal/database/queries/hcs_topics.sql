-- name: ListGatewayDocumentsByFacilityAndGateway :many
SELECT *
FROM verifactory.gateway_documents
WHERE facility_address = LOWER($1)
  AND gateway_id = $2
ORDER BY consensus_timestamp DESC;

-- name: ListInspectorReportsByInspector :many
SELECT *
FROM verifactory.inspector_reports
WHERE inspector_address = LOWER($1)
ORDER BY consensus_timestamp DESC;

-- name: ListInspectorReportsByFacility :many
SELECT *
FROM verifactory.inspector_reports
WHERE facility_address = LOWER($1)
ORDER BY consensus_timestamp DESC;

-- name: ListInspectorReportsByFacilityAndInspector :many
SELECT *
FROM verifactory.inspector_reports
WHERE facility_address = LOWER($1)
  AND inspector_address = LOWER($2)
ORDER BY consensus_timestamp DESC;

-- name: ListAllGatewayDocuments :many
SELECT *
FROM verifactory.gateway_documents
ORDER BY consensus_timestamp DESC;

-- name: ListAllInspectorReports :many
SELECT *
FROM verifactory.inspector_reports
ORDER BY consensus_timestamp DESC;
