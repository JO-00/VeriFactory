import type {PreviewModalProps , LandingPagePreviewModalProps , InspectorPopupProps , SuccessModalProps , FacilityDocsPopupProps} from "./../dashboard_types"
import { useState, useEffect } from "react"
import { theme } from "../dashboard_constants";
import { isImageCID , fetchIPFSBlobUrl } from "../../Functionalities/IPFSHelpers"

export const PreviewModal: React.FC<PreviewModalProps> = ({ cid, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isImage = isImageCID(cid);

  useEffect(() => {
    let revoked = false;
    let createdUrl: string | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = await fetchIPFSBlobUrl(cid);
        if (revoked) { URL.revokeObjectURL(url); return; }
        createdUrl = url;
        setBlobUrl(url);
      } catch (err: any) {
        if (!revoked) setError(err?.message ?? 'Failed to load IPFS content');
      } finally {
        if (!revoked) setLoading(false);
      }
    })();

    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [cid]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: 10, width: '80vw', height: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', borderBottom: `1px solid ${theme.border}`,
          background: theme.surfaceAlt,
        }}>
          <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: theme.text }}>
            {cid}
          </strong>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${theme.borderStrong}`, background: theme.surface,
              color: theme.text, borderRadius: 6, padding: '0.25rem 0.75rem', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#000', display: 'flex',
                      alignItems: 'center', justifyContent: 'center' }}>
          {loading && <span style={{ color: theme.textMuted }}>Loading IPFS content…</span>}
          {error && <span style={{ color: theme.red }}>{error}</span>}
          {!loading && !error && blobUrl && (
            isImage ? (
              <img src={blobUrl} alt={cid}
                   style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', margin: 'auto' }} />
            ) : (
              <iframe src={blobUrl} title={cid}
                      style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
            )
          )}
        </div>
      </div>
    </div>
  );
};


export const LandingPagePreviewModal: React.FC<LandingPagePreviewModalProps> = ({
  uri,
  facilityAddress,
  onClose,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          width: '85vw',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.6rem 1rem',
            borderBottom: `1px solid ${theme.border}`,
            background: theme.surfaceAlt,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>
              Landing page —{' '}
              <span style={{ fontFamily: 'monospace' }}>{facilityAddress}</span>
            </span>
            <a
              href={uri}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: theme.accent,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {uri}
            </a>
          </div>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${theme.borderStrong}`,
              background: theme.surface,
              color: theme.text,
              borderRadius: 6,
              padding: '0.25rem 0.75rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Close
          </button>
        </div>
        <iframe
          src={uri}
          title={`Landing page ${facilityAddress}`}
          style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
        />
      </div>
    </div>
  );
};

export const SuccessModal: React.FC<SuccessModalProps> = ({ result, onContinue }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: '1.75rem 2rem',
          minWidth: 340,
          maxWidth: '90vw',
          color: theme.text,
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(22,163,74,0.12)',
            border: `2px solid ${theme.green}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '1.6rem',
            color: theme.green,
          }}
        >
          ✔
        </div>

        <h2 style={{ margin: '0 0 0.5rem', color: theme.text }}>Authentication Successful</h2>
        <p style={{ color: theme.textMuted, margin: '0 0 1.5rem', fontSize: '0.85rem' }}>
          {result.message ?? 'Facility authenticated.'}
        </p>

        <button
          onClick={onContinue}
          style={{
            border: `1px solid ${theme.accent}`,
            background: theme.accent,
            color: '#fff',
            borderRadius: 6,
            padding: '0.5rem 1.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            width: '100%',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.accentHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = theme.accent)}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// ============== INSPECTOR POPUP ==============

export const InspectorPopup: React.FC<InspectorPopupProps> = ({ inspector, onPreview }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 6,
        background: theme.surfaceAlt,
        border: `1px solid ${theme.borderStrong}`,
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        padding: '0.7rem',
        minWidth: 260,
        zIndex: 50,
        fontSize: '0.8rem',
        color: theme.text,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ marginBottom: '0.5rem' }}>
        <strong style={{ color: theme.textMuted }}>Inspector:</strong>{' '}
        <span style={{ fontFamily: 'monospace', color: theme.text }}>{inspector.wallet}</span>
      </div>
      <div>
        <strong style={{ color: theme.textMuted }}>Attached documents:</strong>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.4rem 0 0' }}>
          {inspector.AttachedDocumentsCIDs.map((cid) => (
            <li key={cid} style={{ marginBottom: '0.35rem' }}>
              <button
                onClick={() => onPreview(cid)}
                style={{
                  border: `1px solid ${theme.borderStrong}`,
                  background: theme.surface,
                  color: theme.text,
                  borderRadius: 6,
                  padding: '0.3rem 0.5rem',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  width: '100%',
                  textAlign: 'left',
                  wordBreak: 'break-all',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.surfaceAlt;
                  e.currentTarget.style.borderColor = theme.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.surface;
                  e.currentTarget.style.borderColor = theme.borderStrong;
                }}
              >
                📄 {cid}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};



export const FacilityDocsPopup: React.FC<FacilityDocsPopupProps> = ({ docs, onPreview }) => {
  if (docs.length === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 6,
          background: theme.surfaceAlt,
          border: `1px solid ${theme.borderStrong}`,
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          padding: '0.6rem 0.7rem',
          zIndex: 50,
          fontSize: '0.8rem',
          color: theme.textMuted,
          whiteSpace: 'nowrap',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        No documents
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 6,
        background: theme.surfaceAlt,
        border: `1px solid ${theme.borderStrong}`,
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        padding: '0.7rem',
        minWidth: 260,
        maxWidth: 360,
        zIndex: 50,
        fontSize: '0.8rem',
        color: theme.text,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <strong style={{ color: theme.textMuted }}>Facility documents:</strong>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.4rem 0 0' }}>
        {docs.map((cid) => (
          <li key={cid} style={{ marginBottom: '0.35rem' }}>
            <button
              onClick={() => onPreview(cid)}
              style={{
                border: `1px solid ${theme.borderStrong}`,
                background: theme.surface,
                color: theme.text,
                borderRadius: 6,
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                width: '100%',
                textAlign: 'left',
                wordBreak: 'break-all',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.surfaceAlt;
                e.currentTarget.style.borderColor = theme.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme.surface;
                e.currentTarget.style.borderColor = theme.borderStrong;
              }}
            >
              📄 {cid}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};