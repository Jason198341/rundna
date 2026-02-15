export async function downloadCard(element: HTMLElement, filename: string) {
  // Dynamic import — html2canvas only works in browser
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(element, {
    backgroundColor: '#060a0e',
    scale: 2,
    useCORS: true,
    logging: false,
    // Resolve CSS custom properties for Tailwind v4
    onclone: (doc) => {
      const style = doc.createElement('style');
      style.textContent = `
        * {
          --color-bg: #060a0e; --color-surface: #0d1117; --color-surface-hover: #161b22;
          --color-border: #1e2a3a; --color-text: #e6edf3; --color-text-muted: #7d8590;
          --color-primary: #10b981; --color-primary-hover: #34d399; --color-primary-dim: #10b98120;
          --color-accent: #22d3ee; --color-accent-dim: #22d3ee20;
          --color-warm: #f59e0b; --color-danger: #ef4444; --color-glow: #10b98140;
        }
      `;
      doc.head.appendChild(style);
    },
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
