import type { Inspector , FacilityData} from "../types";

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
}

export interface FacilityDocsPopupProps {
  docs: string[];
  onPreview: (cid: string) => void;
}