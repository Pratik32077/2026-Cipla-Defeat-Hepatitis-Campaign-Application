import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

const OUTPUTS_DIR = "/tmp/cipla-video-outputs";
const TMP_DIR     = "/tmp/cipla-video-tmp";

export function ensureDirs() {
  [OUTPUTS_DIR, TMP_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}
ensureDirs();

const LANGUAGE_VIDEOS: Record<string, string> = {
  english:   "English.mp4",
  hindi:     "Hindi.mp4",
  marathi:   "Marathi.mp4",
  gujarati:  "Gujarati.mp4",
  kannada:   "Kannada.mp4",
  telugu:    "Telugu.mp4",
  tamil:     "Tamil.mp4",
  punjabi:   "Punjabi.mp4",
  oriya:     "Oriya.mp4",
  malayalam: "Malayalam.mp4",
  bengali:   "Bengali.mp4",
  assamese:  "Bengali.mp4",
};

const ENGLISH_FRAMES = {
  FRAME1: {
    start: 3, end: 9,
    photo: { x: 110, y: 320, w: 830, h: 770 },
    namePlate:  { x: 90,  y: 1280, w: 900, h: 205, color: "0xE05A1A" },
    desgPlate:  { x: 90,  y: 1480, w: 900, h: 120, color: "0x2C3E6B" },
    nameFontSize: 64, nameTextY: 1360,
    desgFontSize: 46, desgTextY: 1530,
  },
  FRAME2: {
    start: 9, end: 16,
    circle: { cx: 530, cy: 310, r: 175 },
    namePlate:  { x: 313, y: 510, w: 455, h: 100, color: "0xE05A1A" },
    desgPlate:  { x: 313, y: 610, w: 455, h: 58,  color: "0x2C3E6B" },
    nameFontSize: 34, nameTextY: 570,
    desgFontSize: 24, desgTextY: 638,
  },
  FRAME3: {
    start: 16, end: 21,
    circle: { cx: 540, cy: 1450, r: 145 },
    namePlate:  { x: 260, y: 1668, w: 560, h: 60, color: "0xE05A1A" },
    desgPlate:  { x: 260, y: 1726, w: 560, h: 62, color: "0x2C3E6B" },
    nameFontSize: 38, nameTextY: 1675,
    desgFontSize: 28, desgTextY: 1736,
  },
};

const REGIONAL_FRAMES = {
  FRAME1: {
    start: 3, end: 8,
    photo: { x: 110, y: 320, w: 830, h: 770 },
    namePlate:  { x: 90,  y: 1280, w: 900, h: 205, color: "0xE05A1A" },
    desgPlate:  { x: 90,  y: 1480, w: 900, h: 120, color: "0x2C3E6B" },
    nameFontSize: 64, nameTextY: 1360,
    desgFontSize: 46, desgTextY: 1530,
  },
  FRAME2: {
    start: 9, end: 16,
    circle: { cx: 540, cy: 1450, r: 145 },
    namePlate:  { x: 260, y: 1668, w: 560, h: 60, color: "0xE05A1A" },
    desgPlate:  { x: 260, y: 1726, w: 560, h: 62, color: "0x2C3E6B" },
    nameFontSize: 38, nameTextY: 1675,
    desgFontSize: 28, desgTextY: 1736,
  },
  FRAME3: {
    start: 16, end: 21,
    circle: { cx: 540, cy: 1450, r: 145 },
    namePlate:  { x: 260, y: 1668, w: 560, h: 60, color: "0xE05A1A" },
    desgPlate:  { x: 260, y: 1726, w: 560, h: 62, color: "0x2C3E6B" },
    nameFontSize: 38, nameTextY: 1675,
    desgFontSize: 28, desgTextY: 1736,
  },
};

function getFrames(lang: string) {
  return lang === "english" ? ENGLISH_FRAMES : REGIONAL_FRAMES;
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
}

function circleGeq(r: number) {
  return `geq=r='r(X\\,Y)':g='g(X\\,Y)':b='b(X\\,Y)':a='if(lte(pow(X-${r}\\,2)+pow(Y-${r}\\,2)\\,pow(${r}\\,2))\\,255\\,0)'`;
}

function plateAndText(
  plate: { x: number; y: number; w: number; h: number; color: string },
  text: string, fontfile: string, fontsize: number, textY: number, enableExpr: string
) {
  const en = `:enable='${enableExpr}'`;
  return (
    `drawbox=x=${plate.x}:y=${plate.y}:w=${plate.w}:h=${plate.h}:color=${plate.color}@1.0:t=fill${en},` +
    `drawtext=fontfile=${fontfile}:text='${esc(text)}':fontcolor=white:fontsize=${fontsize}:x=(w-text_w)/2:y=${textY}${en}`
  );
}

function buildFilterComplex(doctorName: string, designation: string, frames: typeof ENGLISH_FRAMES) {
  const f1 = frames.FRAME1, f2 = frames.FRAME2, f3 = frames.FRAME3;
  const f1En = `between(t\\,${f1.start}\\,${f1.end})`;
  const f2En = `between(t\\,${f2.start}\\,${f2.end})`;
  const f3En = `between(t\\,${f3.start}\\,${f3.end})`;

  const f2Size = (f2 as any).circle ? (f2 as any).circle.r * 2 : 0;
  const f3Size = (f3 as any).circle ? (f3 as any).circle.r * 2 : 0;

  const hasF1Photo = "photo" in f1;
  const hasF2Circle = "circle" in f2;
  const hasF3Circle = "circle" in f3;

  const parts: string[] = [];

  if (hasF2Circle && hasF3Circle) {
    parts.push(`[1:v]split=3[p1][p2][p3]`);
    if (hasF1Photo) {
      const ph = (f1 as any).photo;
      parts.push(`[p1]scale=${ph.w}:${ph.h}:force_original_aspect_ratio=increase,crop=${ph.w}:${ph.h},format=rgba[photo_f1]`);
    }
    parts.push(
      `[p2]scale=${f2Size}:${f2Size}:force_original_aspect_ratio=increase,crop=${f2Size}:${f2Size},format=rgba[photo_f2_sq]`,
      `[photo_f2_sq]${circleGeq((f2 as any).circle.r)}[photo_f2]`,
      `[p3]scale=${f3Size}:${f3Size}:force_original_aspect_ratio=increase,crop=${f3Size}:${f3Size},format=rgba[photo_f3_sq]`,
      `[photo_f3_sq]${circleGeq((f3 as any).circle.r)}[photo_f3]`,
    );
    parts.push(`[0:v]format=yuva420p[base]`);
    if (hasF1Photo) {
      const ph = (f1 as any).photo;
      parts.push(`[base][photo_f1]overlay=${ph.x}:${ph.y}:format=auto:enable='${f1En}'[v1]`);
    } else {
      parts.push(`[base]copy[v1]`);
    }
    parts.push(
      `[v1][photo_f2]overlay=${(f2 as any).circle.cx - (f2 as any).circle.r}:${(f2 as any).circle.cy - (f2 as any).circle.r}:format=auto:enable='${f2En}'[v2]`,
      `[v2][photo_f3]overlay=${(f3 as any).circle.cx - (f3 as any).circle.r}:${(f3 as any).circle.cy - (f3 as any).circle.r}:format=auto:enable='${f3En}'[v3]`,
    );
    parts.push(
      `[v3]` +
      plateAndText(f1.namePlate, doctorName, FONT_BOLD, f1.nameFontSize, f1.nameTextY, f1En) + "," +
      plateAndText(f1.desgPlate, designation, FONT_REG,  f1.desgFontSize, f1.desgTextY, f1En) + "," +
      plateAndText(f2.namePlate, doctorName, FONT_BOLD, f2.nameFontSize, f2.nameTextY, f2En) + "," +
      plateAndText(f2.desgPlate, designation, FONT_REG,  f2.desgFontSize, f2.desgTextY, f2En) + "," +
      plateAndText(f3.namePlate, doctorName, FONT_BOLD, f3.nameFontSize, f3.nameTextY, f3En) + "," +
      plateAndText(f3.desgPlate, designation, FONT_REG,  f3.desgFontSize, f3.desgTextY, f3En) + "," +
      `format=yuv420p[v_final]`
    );
  } else {
    parts.push(`[1:v]copy[p1]`);
    const ph = (f1 as any).photo;
    parts.push(`[p1]scale=${ph.w}:${ph.h}:force_original_aspect_ratio=increase,crop=${ph.w}:${ph.h},format=rgba[photo_f1]`);
    parts.push(`[0:v]format=yuva420p[base]`);
    parts.push(`[base][photo_f1]overlay=${ph.x}:${ph.y}:format=auto:enable='${f1En}'[v1]`);
    parts.push(
      `[v1]` +
      plateAndText(f1.namePlate, doctorName, FONT_BOLD, f1.nameFontSize, f1.nameTextY, f1En) + "," +
      plateAndText(f1.desgPlate, designation, FONT_REG,  f1.desgFontSize, f1.desgTextY, f1En) + "," +
      `format=yuv420p[v_final]`
    );
  }

  return parts.join(";");
}

export function getVideosDir(): string {
  return path.join(process.cwd(), "videos");
}

export function getMasterVideoPath(language: string): string | null {
  const lang = language.trim().toLowerCase();
  const filename = LANGUAGE_VIDEOS[lang];
  if (!filename) return null;
  const p = path.join(getVideosDir(), filename);
  return fs.existsSync(p) ? p : null;
}

export function listAvailableLanguages(): string[] {
  const dir = getVideosDir();
  if (!fs.existsSync(dir)) return [];
  return Object.entries(LANGUAGE_VIDEOS)
    .filter(([, file]) => fs.existsSync(path.join(dir, file)))
    .map(([lang]) => lang);
}

export interface GenerateVideoOptions {
  doctorName: string;
  designation: string;
  language: string;
  imageBase64: string;
}

export interface GenerateVideoResult {
  jobId: string;
  videoUrl: string;
  filename: string;
  processingTime: string;
}

export async function generateVideo(opts: GenerateVideoOptions): Promise<GenerateVideoResult> {
  const { doctorName, designation, imageBase64 } = opts;
  const lang = opts.language.trim().toLowerCase();

  const masterPath = getMasterVideoPath(lang);
  if (!masterPath) {
    throw new Error(`Master video not found for language "${lang}". Upload the video file to the server's videos/ directory.`);
  }

  const jobId = crypto.randomUUID();

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const photoPath = path.join(TMP_DIR, `photo_${jobId}.jpg`);
  fs.writeFileSync(photoPath, Buffer.from(base64Data, "base64"));

  const outputFilename = `doctor_${jobId}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputFilename);
  const filterPath  = path.join(TMP_DIR, `filter_${jobId}.txt`);

  const frames = getFrames(lang);
  const filterComplex = buildFilterComplex(doctorName.trim(), designation.trim(), frames);
  fs.writeFileSync(filterPath, filterComplex, "utf8");

  const args = [
    "-y",
    "-i", masterPath,
    "-i", photoPath,
    "-filter_complex_script", filterPath,
    "-map", "[v_final]",
    "-map", "0:a",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "22",
    "-c:a", "aac",
    "-b:a", "192k",
    "-r",   "25",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ];

  logger.info({ jobId, doctorName, lang }, "Starting video generation");
  const start = Date.now();

  try {
    await execFileAsync("ffmpeg", args, { maxBuffer: 50 * 1024 * 1024 });
  } finally {
    for (const f of [photoPath, filterPath]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info({ jobId, elapsed }, "Video generation complete");

  return {
    jobId,
    videoUrl: `/api/video-outputs/${outputFilename}`,
    filename: outputFilename,
    processingTime: `${elapsed}s`,
  };
}
