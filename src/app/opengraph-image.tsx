import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RunDNA — AI Running Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #060a0e 0%, #0d1117 50%, #060a0e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(30,42,58,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,42,58,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            display: 'flex',
          }}
        />

        {/* Green glow */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        <div style={{ fontSize: 80, marginBottom: 16, display: 'flex' }}>🧬</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#e6edf3',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>Run</span>
          <span style={{ color: '#10b981' }}>DNA</span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#7d8590',
            marginTop: 16,
            display: 'flex',
          }}
        >
          AI Running Intelligence
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#7d8590',
            marginTop: 32,
            display: 'flex',
            gap: 24,
          }}
        >
          <span>🧬 Running DNA</span>
          <span>•</span>
          <span>🤖 AI Coach</span>
          <span>•</span>
          <span>🏁 Race Planner</span>
          <span>•</span>
          <span>📊 Weekly Report</span>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#7d8590',
            fontSize: 16,
          }}
        >
          <span>rundna.online</span>
          <span style={{ color: '#1e2a3a' }}>|</span>
          <span>Connect your Strava. Discover your DNA.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
