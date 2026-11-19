import type { Inspector , FacilityData, InitialGatewayInput, DocumentInput, UserFacilityRole, Measurement} from "../types";
import type { KeyRotatedEvent } from "../types";

export interface InspectorPopupProps {
  inspector: Inspector;
  onPreview: (cid: string) => void;
}
export interface PreviewModalProps {
  cid: string;
  onClose: () => void;
}
export interface LandingPagePreviewModalProps {
  uri: string;
  facilityAddress: string;
  onClose: () => void;
}
export interface SuccessModalProps {
  result: AuthenticationResult;
  onContinue: () => void;
}
export interface AuthenticationResult {
  facilityAddress: string;
  authenticated: boolean;
  role : UserFacilityRole
  wallet?: string;
  message?: string;
}
export interface AuthenticationPageProps {
  result: AuthenticationResult;
  onBack: () => void;
}

export interface FacilityEntryProps {
  facility: FacilityData;
  onPreview: (cid: string) => void;
  onAuthenticate: (facilityAddress: string) => void;
  onPreviewLandingPage: (facilityAddress: string, uri: string) => void;
  totalContracts : string[]
}

export interface FacilityDocsPopupProps {
  docs: string[];
  onPreview: (cid: string) => void;
}

export interface FacilityCreationPayload {
  // ── contract args, in call order ──
  name: string;
  location: string;
  sectorType: string;
  initialRelayers: string[];
  initialGateways: InitialGatewayInput[];
  contracts: DocumentInput[];


  // ── debug ──
  raw: {
    relayers: string[];
    gateways: string[];
    relayersGatewaysBinaryMatrix: number[][];
  };
}
export interface RelayerGatewayConfig {
  relayers: string[];
  gateways: string[];
  relayersGatewaysBinaryMatrix: number[][];
}

export interface EntityModalProps {
  facilityAddress : string,
  selected: { kind: 'gateway' | 'relayer'; address: string ; id ? : string };
  page: ModalPage;
  setPage: (p: ModalPage) => void;
  onClose: () => void;
  onNavigate: (kind: 'gateway' | 'relayer', address: string) => void;
}

export type ModalPage =
  | { kind: 'overview' }
  | { kind: 'measurements' }
  | { kind: 'measurement-detail'; measurement: Measurement }
  | { kind: 'events' };

export interface RelayerBodyProps {
  facilityAddress : string;
  relayer: string;
  onNavigate: (kind: 'gateway' | 'relayer', address: string) => void;
}

export interface GatewayBodyProps {
  facilityAddress : string;
  gateway: string;
  page: ModalPage;
  setPage: (p: ModalPage) => void;
  onNavigate: (kind: 'gateway' | 'relayer', address: string) => void;
}

export interface EventListProps {
  assigned: GatewayAssignedEvent[];
  reassigned: GatewayReassignedEvent[];
  rotations: KeyRotatedEvent[];
}
export interface GatewayAssignedEvent {
  gatewayId: string;
  relayerAddress: string;
}

export interface GatewayReassignedEvent {
  gatewayId: string;
  oldRelayer: string;
  newRelayer: string;
}