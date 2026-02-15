import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

const TRAIT_COLORS = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];
const TRAIT_LABELS = ['Consistency', 'Speed', 'Endurance', 'Variety', 'Volume'];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type') || 'Running DNA';
  const name = searchParams.get('name') || 'Runner';
  const scores = searchParams.get('scores')?.split(',').map(Number) || [3, 3, 3, 3, 3];

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #060a0e 0%, #0d1117 50%, #060a0e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(30,42,58,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(30,42,58,0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            display: 'flex',
          }}
        />

        {/* Top section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 48, display: 'flex' }}>🧬</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 18, color: '#7d8590', display: 'flex' }}>
              {name}&apos;s Running DNA
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#10b981', display: 'flex' }}>
              {type}
            </div>
          </div>
        </div>

        {/* Trait bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          {TRAIT_LABELS.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 120, fontSize: 20, color: '#7d8590', display: 'flex' }}>
                {label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 24,
                  borderRadius: 12,
                  background: '#1e2a3a',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    width: `${((scores[i] || 0) / 5) * 100}%`,
                    height: '100%',
                    borderRadius: 12,
                    background: TRAIT_COLORS[i],
                    display: 'flex',
                  }}
                />
              </div>
              <div style={{ width: 40, fontSize: 22, fontWeight: 700, color: TRAIT_COLORS[i], display: 'flex', justifyContent: 'flex-end' }}>
                {scores[i] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #1e2a3a',
            paddingTop: 24,
            marginTop: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e6edf3', display: 'flex' }}>
              Run<span style={{ color: '#10b981' }}>DNA</span>
            </div>
            <div style={{ fontSize: 16, color: '#7d8590', display: 'flex' }}>
              AI Running Intelligence
            </div>
          </div>
          <div style={{ fontSize: 16, color: '#7d8590', display: 'flex' }}>
            rundna.online
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
