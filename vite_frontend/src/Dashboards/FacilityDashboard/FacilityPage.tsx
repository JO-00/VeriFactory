import React from 'react';
import type { AuthenticationPageProps } from '../dashboard_types';


const authTheme = {
  bg: '#0f1115',
  surface: '#171a21',
  surfaceAlt: '#1e222b',
  border: '#2a2f3a',
  borderStrong: '#3a4150',
  text: '#e6e9ef',
  textMuted: '#9aa3b2',
  accent: '#5b8cff',
  green: '#2ecc71',
};


/**
 * Mock authentication page.
 * `result` is EXACTLY what authenticateFacility() returned.
 * Replace the body below with your real page.
 */
const AuthenticationPage: React.FC<AuthenticationPageProps> = ({ result, onBack }) => {
  return (
    <div
      style={{
        background: authTheme.bg,
        minHeight: '100vh',
        padding: '2rem',
        color: authTheme.text,
      }}
    >
      <button
        onClick={onBack}
        style={{
          border: `1px solid ${authTheme.borderStrong}`,
          background: authTheme.surfaceAlt,
          color: authTheme.text,
          borderRadius: 6,
          padding: '0.35rem 0.8rem',
          cursor: 'pointer',
          marginBottom: '1.25rem',
        }}
      >
        ← Back to facilities
      </button>

      <h1 style={{ marginTop: 0 }}>Authenticated Facility</h1>
      <p style={{ color: authTheme.textMuted }}>
        This is a mock page. Replace the content in{' '}
        <code style={{ color: authTheme.accent }}>AuthenticationPage.tsx</code>.
      </p>

      <pre
        style={{
          background: authTheme.surface,
          color: authTheme.text,
          border: `1px solid ${authTheme.border}`,
          padding: '0.85rem',
          borderRadius: 8,
          fontSize: '0.75rem',
          overflow: 'auto',
        }}
      >
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
};

export default AuthenticationPage;