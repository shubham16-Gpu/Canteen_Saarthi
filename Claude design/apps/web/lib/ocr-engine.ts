/**
 * Browser OCR pipeline targeting 95%+ accuracy on clean Indian government IDs.
 *
 * Pipeline:
 *   1. Load image into <canvas>
 *   2. Upscale to 1500px on long edge (Tesseract works best at ~300 DPI)
 *   3. Grayscale → contrast stretch → Otsu binarization
 *   4. Run Tesseract twice with different PSM modes (block + sparse), keep best
 *   5. Per-doc-type field extraction
 *
 * Worker is reused across calls within a single page load to avoid re-loading
 * the language model (which is large). Call `terminateOcr()` on unmount.
 */

import Tesseract, { type Worker, createWorker } from 'tesseract.js';

// ─────────────── public types ───────────────

export type DocStructure = 'structured' | 'semi-structured' | 'unstructured';

export type DocType =
  | 'aadhaar'
  | 'pan'
  | 'passport'
  | 'driving-licence'
  | 'voter-id'
  | 'bank-statement'
  | 'certificate'
  | 'invoice'
  | 'generic';

export type OcrLanguage = 'eng' | 'eng+hin' | 'eng+hin+guj';

export interface OcrFieldHint {
  field: string;
  label?: string;
  regex?: string;
}

export interface OcrConfig {
  docType: DocType;
  structure?: DocStructure;
  language?: OcrLanguage;
  expectedFields?: OcrFieldHint[];
  preprocessing?: {
    grayscale?: boolean;
    contrast?: number;
    upscale?: boolean;
    threshold?: 'otsu' | 'none';
  };
  onProgress?: (progress: number, label?: string) => void;
}

export interface OcrResult {
  text: string;
  confidence: number; // 0..100
  fields: Record<string, string>;
  fieldConfidence: Record<string, number>;
  passes: number;
  timeMs: number;
  preprocessingApplied: string[];
}

// ─────────────── worker cache ───────────────

const workerCache: Map<string, Promise<Worker>> = new Map();

async function getWorker(language: OcrLanguage): Promise<Worker> {
  if (!workerCache.has(language)) {
    workerCache.set(
      language,
      createWorker(language, undefined, {
        logger: () => {
          /* noop — pass through onProgress at call site */
        },
      }),
    );
  }
  return workerCache.get(language)!;
}

export async function terminateOcr() {
  for (const [, p] of workerCache) {
    try {
      const w = await p;
      await w.terminate();
    } catch {
      /* ignore */
    }
  }
  workerCache.clear();
}

// ─────────────── image preprocessing ───────────────

async function loadToCanvas(input: File | Blob | string): Promise<HTMLCanvasElement> {
  const url = typeof input === 'string' ? input : URL.createObjectURL(input);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);
  if (typeof input !== 'string') URL.revokeObjectURL(url);
  return canvas;
}

function upscale(canvas: HTMLCanvasElement, targetLong = 1500): HTMLCanvasElement {
  const long = Math.max(canvas.width, canvas.height);
  if (long >= targetLong) return canvas;
  const scale = targetLong / long;
  const dst = document.createElement('canvas');
  dst.width = Math.round(canvas.width * scale);
  dst.height = Math.round(canvas.height * scale);
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, dst.width, dst.height);
  return dst;
}

function grayscaleAndContrast(canvas: HTMLCanvasElement, contrast = 1.4): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114;
    let v = (lum - 128) * contrast + 128;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function otsuThreshold(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  // histogram
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) hist[d[i]!]++;
  const total = canvas.width * canvas.height;

  // Otsu's method
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) {
      max = between;
      threshold = t;
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const v = d[i]! < threshold ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ─────────────── core OCR ───────────────

async function singlePass(
  canvas: HTMLCanvasElement,
  language: OcrLanguage,
  psm: number,
  onProgress?: OcrConfig['onProgress'],
): Promise<{ text: string; words: { text: string; confidence: number }[]; confidence: number }> {
  const worker = await getWorker(language);
  // Tesseract.js v5 typings vary — cast lightly
  await (worker as unknown as {
    setParameters: (p: Record<string, string>) => Promise<void>;
  }).setParameters({ tessedit_pageseg_mode: String(psm) });

  const result = await worker.recognize(canvas, {}, { text: true, blocks: false });
  const data = result.data as unknown as {
    text: string;
    confidence?: number;
    words?: Array<{ text: string; confidence: number }>;
  };
  const words = data.words ?? [];
  const avg =
    words.length > 0
      ? words.reduce((a, w) => a + (w.confidence || 0), 0) / words.length
      : data.confidence ?? 0;
  onProgress?.(100, `Pass PSM ${psm}: ${avg.toFixed(0)}% confidence`);
  return { text: data.text || '', words, confidence: avg };
}

// ─────────────── per-doc-type parsers ───────────────

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function findDate(text: string): string | null {
  const m = text.match(/\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : null;
}

function lineAfterLabel(text: string, label: RegExp, max = 2): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (label.test(lines[i]!)) {
      // value may be on the same line after a colon, or the next line
      const same = lines[i]!.replace(label, '').replace(/^[:\-\s]+/, '').trim();
      if (same && same.length >= 2) return clean(same);
      for (let j = 1; j <= max; j++) {
        const next = (lines[i + j] || '').trim();
        if (next && !/^[:\-]/.test(next)) return clean(next);
      }
    }
  }
  return null;
}

function lineBefore(text: string, label: RegExp): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (label.test(lines[i]!)) {
      const prev = (lines[i - 1] || '').trim();
      if (prev && prev.length >= 2 && !/government|india|unique|identification/i.test(prev)) {
        return clean(prev);
      }
    }
  }
  return null;
}

function parseAadhaar(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const idMatch = text.match(/\b(\d{4})\s?(\d{4})\s?(\d{4})\b/);
  if (idMatch) out.aadhaarNumber = `${idMatch[1]} ${idMatch[2]} ${idMatch[3]}`;

  const dob = text.match(/(?:DOB|Date of Birth|जन्म\s*तिथि)[^\d]*(\d{2}[-/.]\d{2}[-/.]\d{4})/i);
  if (dob) out.dob = dob[1]!.replace(/[.-]/g, '/');
  else {
    const d = findDate(text);
    if (d) out.dob = d;
  }

  if (/\b(MALE|पुरुष)\b/i.test(text)) out.gender = 'Male';
  else if (/\b(FEMALE|महिला)\b/i.test(text)) out.gender = 'Female';

  const name = lineBefore(text, /\b(DOB|Date of Birth|जन्म\s*तिथि)\b/i);
  if (name) out.fullName = name;

  const addr = lineAfterLabel(text, /\b(Address|पता)\b/i, 4);
  if (addr) out.address = addr;
  return out;
}

function parsePan(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const pan = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  if (pan) out.panNumber = pan[1]!;
  const name = lineAfterLabel(text, /\bName\b/i);
  if (name) out.fullName = name;
  const father = lineAfterLabel(text, /\bFather'?s?\s*Name\b/i);
  if (father) out.fatherName = father;
  const dob = lineAfterLabel(text, /\b(?:DOB|Date of Birth)\b/i) ?? findDate(text);
  if (dob) out.dob = dob;
  return out;
}

function parsePassport(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const num = text.match(/\b([A-Z]\d{7})\b/);
  if (num) out.passportNumber = num[1]!;
  const surname = lineAfterLabel(text, /\bSurname\b/i);
  if (surname) out.surname = surname;
  const given = lineAfterLabel(text, /\bGiven\s*Name/i);
  if (given) out.givenName = given;
  if (/\b(MALE|M)\b/.test(text)) out.gender = 'Male';
  if (/\b(FEMALE|F)\b/.test(text)) out.gender = 'Female';
  const dob = lineAfterLabel(text, /\bDate of Birth\b/i) ?? findDate(text);
  if (dob) out.dob = dob;
  return out;
}

function parseDrivingLicence(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const num = text.match(/\b([A-Z]{2}[-\s]?\d{2}[\s-]?\d{4,11})\b/);
  if (num) out.licenceNumber = num[1]!.replace(/[\s-]/g, '');
  const dob = lineAfterLabel(text, /\b(?:DOB|Date of Birth)\b/i) ?? findDate(text);
  if (dob) out.dob = dob;
  const name = lineAfterLabel(text, /\bName\b/i);
  if (name) out.fullName = name;
  const valid = text.match(/(?:Valid\s*Up\s*To|Valid\s*Till)[^\d]*(\d{2}[-/.]\d{2}[-/.]\d{4})/i);
  if (valid) out.validUpto = valid[1]!.replace(/[.-]/g, '/');
  return out;
}

function parseVoterId(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const id = text.match(/\b([A-Z]{3}\d{7})\b/);
  if (id) out.voterId = id[1]!;
  const name = lineAfterLabel(text, /\bName\b/i);
  if (name) out.fullName = name;
  const father = lineAfterLabel(text, /\b(?:Father'?s|Husband'?s)\s*Name\b/i);
  if (father) out.fatherName = father;
  return out;
}

function parseGeneric(text: string, hints: OcrFieldHint[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of hints) {
    if (h.regex) {
      try {
        const m = text.match(new RegExp(h.regex, 'i'));
        if (m) {
          out[h.field] = m[1] ?? m[0]!;
          continue;
        }
      } catch {
        /* invalid regex */
      }
    }
    if (h.label) {
      const v = lineAfterLabel(text, new RegExp(`\\b${h.label}\\b`, 'i'));
      if (v) out[h.field] = v;
    }
  }
  // best-effort key:value scan for unmatched fields
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z\s]{2,30})\s*[:\-]\s*(.{2,})$/);
    if (m) {
      const key = m[1]!
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
      if (!out[key]) out[key] = clean(m[2]!);
    }
  }
  return out;
}

function dispatchParser(
  docType: DocType,
  text: string,
  hints: OcrFieldHint[] = [],
): Record<string, string> {
  switch (docType) {
    case 'aadhaar':
      return { ...parseAadhaar(text), ...parseGeneric(text, hints) };
    case 'pan':
      return { ...parsePan(text), ...parseGeneric(text, hints) };
    case 'passport':
      return { ...parsePassport(text), ...parseGeneric(text, hints) };
    case 'driving-licence':
      return { ...parseDrivingLicence(text), ...parseGeneric(text, hints) };
    case 'voter-id':
      return { ...parseVoterId(text), ...parseGeneric(text, hints) };
    case 'invoice':
    case 'bank-statement':
    case 'certificate':
    case 'generic':
    default:
      return parseGeneric(text, hints);
  }
}

// ─────────────── main entry ───────────────

export async function runOcr(
  input: File | Blob | string,
  config: OcrConfig,
): Promise<OcrResult> {
  const t0 = performance.now();
  const lang: OcrLanguage = config.language ?? 'eng';
  const applied: string[] = [];

  config.onProgress?.(5, 'Loading image');
  let canvas = await loadToCanvas(input);

  if (config.preprocessing?.upscale !== false) {
    canvas = upscale(canvas, 1500);
    applied.push('upscale');
  }
  if (config.preprocessing?.grayscale !== false) {
    canvas = grayscaleAndContrast(canvas, config.preprocessing?.contrast ?? 1.4);
    applied.push('grayscale+contrast');
  }
  if (config.preprocessing?.threshold !== 'none') {
    canvas = otsuThreshold(canvas);
    applied.push('otsu');
  }
  config.onProgress?.(35, 'Pre-processing complete');

  // Multi-pass: PSM 6 (block) + PSM 11 (sparse). Keep higher confidence.
  config.onProgress?.(45, 'OCR pass 1 (block layout)');
  const passA = await singlePass(canvas, lang, 6, config.onProgress);
  config.onProgress?.(75, 'OCR pass 2 (sparse layout)');
  const passB = await singlePass(canvas, lang, 11, config.onProgress);

  const best = passA.confidence >= passB.confidence ? passA : passB;
  config.onProgress?.(90, `Best: PSM ${best === passA ? 6 : 11} @ ${best.confidence.toFixed(0)}%`);

  const fields = dispatchParser(config.docType, best.text, config.expectedFields);
  const fieldConfidence: Record<string, number> = {};
  for (const k of Object.keys(fields)) fieldConfidence[k] = best.confidence;

  config.onProgress?.(100, 'Done');

  return {
    text: best.text,
    confidence: Math.max(0, Math.min(100, best.confidence)),
    fields,
    fieldConfidence,
    passes: 2,
    timeMs: performance.now() - t0,
    preprocessingApplied: applied,
  };
}
// Avoid unused-import warning for type-only re-export consumers
export type _Tesseract = typeof Tesseract;
