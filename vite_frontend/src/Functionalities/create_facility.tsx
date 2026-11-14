import {type  RelayerGatewayConfig } from "../Dashboards/dashboard_types";
import type { InitialGatewayInput } from "../types";
type ValidationResult =
  | { ok: true; config: RelayerGatewayConfig }
  | { ok: false; error: string };

export function validateRelayerGatewayJSON(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Top-level value must be a JSON object.' };
  }
  const obj = raw as Record<string, unknown>;

  const relayers = obj.Relayers;
  const gateways = obj.Gateways;
  const matrix = obj.RelayersGatewaysBinaryMatrix;

  if (!Array.isArray(relayers) || relayers.length === 0) {
    return { ok: false, error: 'Relayers must be a non-empty array of addresses.' };
  }
  if (!Array.isArray(gateways) || gateways.length === 0) {
    return { ok: false, error: 'Gateways must be a non-empty array of addresses.' };
  }
  if (!relayers.every((r) => typeof r === 'string' && r.length > 0)) {
    return { ok: false, error: 'Every relayer entry must be a non-empty string.' };
  }
  if (!gateways.every((g) => typeof g === 'string' && g.length > 0)) {
    return { ok: false, error: 'Every gateway entry must be a non-empty string.' };
  }

  if (!Array.isArray(matrix)) {
    return { ok: false, error: 'RelayersGatewaysBinaryMatrix must be a 2D array.' };
  }
  if (matrix.length !== relayers.length) {
    return {
      ok: false,
      error: `Matrix has ${matrix.length} row(s) but there are ${relayers.length} relayer(s). They must match.`,
    };
  }
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) {
      return { ok: false, error: `Matrix row ${i} is not an array.` };
    }
    if (row.length !== gateways.length) {
      return {
        ok: false,
        error: `Matrix row ${i} has ${row.length} cell(s) but there are ${gateways.length} gateway(s). Every row must match.`,
      };
    }
    for (let j = 0; j < row.length; j++) {
      if (row[j] !== 0 && row[j] !== 1) {
        return {
          ok: false,
          error: `Matrix cell [${i}][${j}] must be 0 or 1 (got ${JSON.stringify(row[j])}).`,
        };
      }
    }
  }

  return {
    ok: true,
    config: {
      relayers: relayers as string[],
      gateways: gateways as string[],
      relayersGatewaysBinaryMatrix: matrix as number[][],
    },
  };
}

// ============================================================
// Derive InitialGateway[] from the binary matrix
// ============================================================

type GatewayBuildResult =
  | { ok: true; gateways: InitialGatewayInput[] }
  | { ok: false; error: string };

export function buildInitialGateways(cfg: RelayerGatewayConfig): GatewayBuildResult {
  const { relayers, gateways, relayersGatewaysBinaryMatrix: matrix } = cfg;
  const out: InitialGatewayInput[] = [];

  for (let j = 0; j < gateways.length; j++) {
    // First relayer that manages this gateway, or '' if none.
    let relayer = '';
    for (let i = 0; i < relayers.length; i++) {
      if (matrix[i][j] === 1) {
        relayer = relayers[i];
        break;
      }
    }

    out.push({
      id: String(j),
      key: gateways[j],
      relayer,
    });
  }

  return { ok: true, gateways: out };
}