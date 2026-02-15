export async function downloadCard(element: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(element, {
    backgroundColor: '#060a0e',
    scale: 2,
    useCORS: true,
    logging: false,
    onclone: (doc) => {
      // 1. Remove lab()/oklch()/oklab() from all stylesheets — html2canvas can't parse them
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

      // 2. Inject CSS custom properties with hex colors (overrides Tailwind v4)
      const style = doc.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          --color-bg: #060a0e !important;
          --color-surface: #0d1117 !important;
          --color-surface-hover: #161b22 !important;
          --color-border: #1e2a3a !important;
          --color-text: #e6edf3 !important;
          --color-text-muted: #7d8590 !important;
          --color-primary: #10b981 !important;
          --color-primary-hover: #34d399 !important;
          --color-accent: #22d3ee !important;
          --color-warm: #f59e0b !important;
          --color-danger: #ef4444 !important;
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
            // Use canvas 2D context to convert to hex
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

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
