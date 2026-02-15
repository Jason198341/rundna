import html2canvas from 'html2canvas';

export async function downloadCard(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#060a0e',
    scale: 2, // 2x for crisp output
    useCORS: true,
    logging: false,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
