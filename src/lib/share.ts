export async function downloadCard(element: HTMLElement, filename: string) {
  const canvas = await renderCanvas(element);
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function shareCard(element: HTMLElement, filename: string, text: string, url: string) {
  const canvas = await renderCanvas(element);

  // Try Web Share API first (mobile-friendly)
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
    const file = new File([blob], `${filename}.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, url });
      return;
    }
  } catch (e: any) {
    // User cancelled or share failed — fall through to download
    if (e?.name === 'AbortError') return;
  }

  // Fallback: copy URL to clipboard + download image
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
  } catch { /* clipboard not available */ }

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Read current CSS variable values from :root for screenshot rendering
function getCurrentThemeColors(): Record<string, string> {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const vars = [
    'bg', 'surface', 'surface-hover', 'border', 'text', 'text-muted',
    'primary', 'primary-hover', 'primary-dim', 'accent', 'accent-dim',
    'warm', 'danger', 'glow',
  ];
  const colors: Record<string, string> = {};
  for (const v of vars) {
    colors[v] = cs.getPropertyValue(`--color-${v}`).trim() || '';
  }
  return colors;
}

async function renderCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;
  const theme = getCurrentThemeColors();

  return html2canvas(element, {
    backgroundColor: theme.bg || '#f8fafc',
    scale: 2,
    useCORS: true,
    logging: false,
    onclone: (doc) => {
      // 1. Remove lab()/oklch()/oklab() from all stylesheets
      for (const sheet of Array.from(doc.styleSheets)) {
        try {
          for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
            const text = sheet.cssRules[i].cssText;
            if (text.match(/(ok)?(lab|lch)\(/i)) {
              const fixed = text.replace(/(ok)?(lab|lch)\([^)]+\)/gi, '#808080');
              try {
                sheet.deleteRule(i);
                sheet.insertRule(fixed, i);
              } catch { /* skip malformed rules */ }
            }
          }
        } catch { /* cross-origin stylesheets */ }
      }

      // 2. Inject current theme CSS custom properties (hex safe for html2canvas)
      const style = doc.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          --color-bg: ${theme.bg || '#f8fafc'} !important;
          --color-surface: ${theme.surface || '#ffffff'} !important;
          --color-surface-hover: ${theme['surface-hover'] || '#f1f5f9'} !important;
          --color-border: ${theme.border || '#e2e8f0'} !important;
          --color-text: ${theme.text || '#0f172a'} !important;
          --color-text-muted: ${theme['text-muted'] || '#64748b'} !important;
          --color-primary: ${theme.primary || '#10b981'} !important;
          --color-primary-hover: ${theme['primary-hover'] || '#059669'} !important;
          --color-primary-dim: ${theme['primary-dim'] || '#10b98112'} !important;
          --color-accent: ${theme.accent || '#0ea5e9'} !important;
          --color-accent-dim: ${theme['accent-dim'] || '#0ea5e912'} !important;
          --color-warm: ${theme.warm || '#f59e0b'} !important;
          --color-danger: ${theme.danger || '#ef4444'} !important;
          --color-glow: ${theme.glow || '#10b98120'} !important;
          --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace !important;
        }
      `;
      doc.head.appendChild(style);

      // 3. Force inline colors on elements with computed lab/oklch values
      doc.querySelectorAll('*').forEach((el) => {
        const htmlEl = el as HTMLElement;
        const cs = getComputedStyle(htmlEl);
        const props = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'] as const;
        for (const prop of props) {
          const val = cs[prop];
          if (val && (val.includes('lab(') || val.includes('oklch(') || val.includes('oklab('))) {
            const cvs = document.createElement('canvas');
            const ctx = cvs.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#808080';
              ctx.fillStyle = val;
              htmlEl.style[prop] = ctx.fillStyle;
            }
          }
        }
      });
    },
  });
}
