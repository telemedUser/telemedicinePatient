/**
 * Minimal, dependency-free PDF generator. Produces a valid single- or multi-page PDF (A4) from a
 * list of text lines with a few styles (title / heading / normal / muted / rule). Enough to render
 * the post-consultation documents (prescription, medical leave, summary, receipt) so the patient
 * can view and download real .pdf files without pulling in a PDF library.
 *
 * It emits PDF 1.4 with the 14 standard fonts (Helvetica / Helvetica-Bold), so no font embedding is
 * needed. Text is escaped for PDF string syntax. Lines wrap at a fixed column width.
 */

export type PdfLineStyle = 'title' | 'heading' | 'normal' | 'muted' | 'rule' | 'spacer';

export interface PdfLine {
  text?: string;
  style?: PdfLineStyle;
}

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

const STYLE: Record<PdfLineStyle, { font: 'H' | 'HB'; size: number; gap: number; gray?: number }> = {
  title: { font: 'HB', size: 20, gap: 28 },
  heading: { font: 'HB', size: 12, gap: 20 },
  normal: { font: 'H', size: 10.5, gap: 16 },
  muted: { font: 'H', size: 9.5, gap: 14, gray: 0.45 },
  rule: { font: 'H', size: 1, gap: 14 },
  spacer: { font: 'H', size: 1, gap: 10 },
};

function escapePdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Approximate character width for Helvetica at a given size, for naive word-wrap. */
function wrap(text: string, size: number): string[] {
  const maxChars = Math.max(8, Math.floor(CONTENT_W / (size * 0.5)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/** Build the content streams (one per page) from the styled lines. */
function buildPageStreams(lines: PdfLine[]): string[] {
  const pages: string[] = [];
  let ops = '';
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    if (ops) pages.push(ops);
    ops = '';
    y = PAGE_H - MARGIN;
  };

  for (const line of lines) {
    const style = STYLE[line.style ?? 'normal'];
    if ((line.style ?? 'normal') === 'rule') {
      if (y < MARGIN + 20) newPage();
      ops += `0.85 0.85 0.85 RG 0.7 w ${MARGIN} ${y} m ${PAGE_W - MARGIN} ${y} l S\n`;
      y -= style.gap;
      continue;
    }
    if ((line.style ?? 'normal') === 'spacer' || !line.text) {
      y -= style.gap;
      continue;
    }
    const wrapped = wrap(line.text, style.size);
    for (const seg of wrapped) {
      if (y < MARGIN + style.size) newPage();
      const gray = style.gray ?? 0;
      ops += `BT /${style.font} ${style.size} Tf ${gray} ${gray} ${gray} rg ${MARGIN} ${y} Td (${escapePdf(seg)}) Tj ET\n`;
      y -= style.gap;
    }
  }
  if (ops) pages.push(ops);
  return pages.length ? pages : [''];
}

/** Assemble a complete PDF document (as a Blob) from the styled lines. */
export function buildPdf(lines: PdfLine[]): Blob {
  const streams = buildPageStreams(lines);
  const objects: string[] = [];

  // Object numbering:
  // 1 = Catalog, 2 = Pages, 3 = Helvetica, 4 = Helvetica-Bold,
  // then per page: a Page object and its Contents stream object.
  const pageCount = streams.length;
  const pageObjNums: number[] = [];
  let nextObj = 5;
  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(nextObj);
    nextObj += 2; // page obj + content obj
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] =
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  streams.forEach((stream, i) => {
    const pageNum = pageObjNums[i];
    const contentNum = pageNum + 1;
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /H 3 0 R /HB 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  // Serialize with an xref table.
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  const maxObj = nextObj - 1;
  for (let n = 1; n <= maxObj; n++) {
    offsets[n] = body.length;
    body += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefStart = body.length;
  body += `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    body += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([body], { type: 'application/pdf' });
}

/** Open a built PDF in a new browser tab (the "view" / eye action). */
export function viewPdf(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Trigger a download of a built PDF with the given file name (the "download" action). */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
