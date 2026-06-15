const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 3001;

const VIDEOS_DIR = path.join(__dirname, 'videos');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
const TMP_DIR = path.join(__dirname, 'tmp');

// Ensure required directories exist (zip files don't preserve empty folders)
[UPLOADS_DIR, OUTPUTS_DIR, TMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// CORS: allow all by default. To restrict to your Vercel frontend, set
// ALLOWED_ORIGIN env var to e.g. "https://your-app.vercel.app"
const corsOptions = process.env.ALLOWED_ORIGIN
  ? { origin: process.env.ALLOWED_ORIGIN }
  : { origin: '*' };
app.use(cors(corsOptions));
app.use(express.json());
app.use('/outputs', express.static(OUTPUTS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images are allowed'));
  }
});

// Bundled fonts (cross-platform — works on Linux, macOS, Windows).
// IMPORTANT: we deliberately use RELATIVE paths with forward slashes and NO
// drive-letter colon. FFmpeg's filtergraph parser uses ':' as an option
// separator, and on Windows an absolute path like "C:/Users/.../font.ttf"
// inside a filter string requires "C\:/..." escaping — which is fragile and
// caused "No option name near ..." parse errors. Relative paths avoid the
// problem entirely. We run ffmpeg with cwd = backend/ so these resolve correctly.
const FONT_BOLD = 'fonts/DejaVuSans-Bold.ttf';
const FONT_REG  = 'fonts/DejaVuSans.ttf';

// ============================================================
// LANGUAGE → MASTER VIDEO MAP
// ============================================================
const LANGUAGE_VIDEOS = {
  english:   'English.mp4',
  hindi:     'Hindi.mp4',
  marathi:   'Marathi.mp4',
  gujarati:  'Gujarati.mp4',
  kannada:   'Kannada.mp4',
  telugu:    'Telugu.mp4',
  tamil:     'Tamil.mp4',
  punjabi:   'Punjabi.mp4',
  oriya:     'Oriya.mp4',
  malayalam: 'Malayalam.mp4',
  bengali:   'Bengali.mp4',
};

// ============================================================
// FRAME CONFIGS — measured at 1080x1920
// ============================================================

// --- English master video (existing 3-frame system, unchanged) ---
const ENGLISH_FRAMES = {
  FRAME1: {
    start: 3, end: 9,
    photo: { x: 110, y: 320, w: 830, h: 770 },
    namePlate:  { x: 90, y: 1280, w: 900, h: 205, color: '0xE05A1A' },
    desgPlate:  { x: 90, y: 1480, w: 900, h: 120, color: '0x2C3E6B' },
    nameFontSize: 64, nameTextY: 1360,
    desgFontSize: 46, desgTextY: 1530,
  },
  FRAME2: {
    start: 9, end: 16,
    circle: { cx: 530, cy: 310, r: 175 },
    namePlate:  { x: 313, y: 510, w: 455, h: 100, color: '0xE05A1A' },
    desgPlate:  { x: 313, y: 610, w: 455, h: 58,  color: '0x2C3E6B' },
    nameFontSize: 34, nameTextY: 570,
    desgFontSize: 24, desgTextY: 638,
  },
  FRAME3: {
    start: 16, end: 21,
    circle: { cx: 540, cy: 1450, r: 145 },
    namePlate:  { x: 260, y: 1668, w: 560, h: 60, color: '0xE05A1A' },
    desgPlate:  { x: 260, y: 1726, w: 560, h: 62, color: '0x2C3E6B' },
    nameFontSize: 38, nameTextY: 1675,
    desgFontSize: 28, desgTextY: 1736,
  },
};

// --- Regional language master videos (Hindi/Tamil/Telugu/etc.) ---
// Same timeline/positions across all 10 language videos (identical templates).
const REGIONAL_FRAMES = {
  FRAME1: {
    start: 3, end: 8,
    photo: { x: 110, y: 320, w: 830, h: 770 },
    namePlate:  { x: 90, y: 1280, w: 900, h: 205, color: '0xE05A1A' },
    desgPlate:  { x: 90, y: 1480, w: 900, h: 120, color: '0x2C3E6B' },
    nameFontSize: 64, nameTextY: 1360,
    desgFontSize: 46, desgTextY: 1530,
  },
  FRAME2: {
    start: 9, end: 16,
    circle: { cx: 540, cy: 1450, r: 145 },
    namePlate:  { x: 260, y: 1668, w: 560, h: 60, color: '0xE05A1A' },
    desgPlate:  { x: 260, y: 1726, w: 560, h: 62, color: '0x2C3E6B' },
    nameFontSize: 38, nameTextY: 1675,
    desgFontSize: 28, desgTextY: 1736,
  },
  FRAME3: {
    start: 16, end: 21,
    circle: { cx: 540, cy: 1450, r: 145 },
    namePlate:  { x: 260, y: 1668, w: 560, h: 60, color: '0xE05A1A' },
    desgPlate:  { x: 260, y: 1726, w: 560, h: 62, color: '0x2C3E6B' },
    nameFontSize: 38, nameTextY: 1675,
    desgFontSize: 28, desgTextY: 1736,
  },
};

function getFrameConfigs(language) {
  return language === 'english' ? ENGLISH_FRAMES : REGIONAL_FRAMES;
}


function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}

function circleGeq(r) {
  return `geq=r='r(X\\,Y)':g='g(X\\,Y)':b='b(X\\,Y)':a='if(lte(pow(X-${r}\\,2)+pow(Y-${r}\\,2)\\,pow(${r}\\,2))\\,255\\,0)'`;
}

function plateAndText(plateCfg, text, fontfile, fontsize, textY, enableExpr) {
  const en = `:enable='${enableExpr}'`;
  return (
    `drawbox=x=${plateCfg.x}:y=${plateCfg.y}:w=${plateCfg.w}:h=${plateCfg.h}:color=${plateCfg.color}@1.0:t=fill${en},` +
    `drawtext=fontfile=${fontfile}:text='${esc(text)}':fontcolor=white:fontsize=${fontsize}:x=(w-text_w)/2:y=${textY}${en}`
  );
}

function buildFilterComplex(doctorName, designation, frames) {
  const f1 = frames.FRAME1, f2 = frames.FRAME2, f3 = frames.FRAME3;

  const f1En = `between(t\\,${f1.start}\\,${f1.end})`;
  const f2En = `between(t\\,${f2.start}\\,${f2.end})`;
  const f3En = `between(t\\,${f3.start}\\,${f3.end})`;

  const f2Size = f2.circle.r * 2;
  const f3Size = f3.circle.r * 2;

  return [
    `[1:v]split=3[p1][p2][p3]`,

    `[p1]scale=${f1.photo.w}:${f1.photo.h}:force_original_aspect_ratio=increase,` +
      `crop=${f1.photo.w}:${f1.photo.h},format=rgba[photo_f1]`,

    `[p2]scale=${f2Size}:${f2Size}:force_original_aspect_ratio=increase,` +
      `crop=${f2Size}:${f2Size},format=rgba[photo_f2_sq]`,
    `[photo_f2_sq]${circleGeq(f2.circle.r)}[photo_f2]`,

    `[p3]scale=${f3Size}:${f3Size}:force_original_aspect_ratio=increase,` +
      `crop=${f3Size}:${f3Size},format=rgba[photo_f3_sq]`,
    `[photo_f3_sq]${circleGeq(f3.circle.r)}[photo_f3]`,

    `[0:v]format=yuva420p[base]`,
    `[base][photo_f1]overlay=${f1.photo.x}:${f1.photo.y}:format=auto:enable='${f1En}'[v1]`,
    `[v1][photo_f2]overlay=${f2.circle.cx - f2.circle.r}:${f2.circle.cy - f2.circle.r}:format=auto:enable='${f2En}'[v2]`,
    `[v2][photo_f3]overlay=${f3.circle.cx - f3.circle.r}:${f3.circle.cy - f3.circle.r}:format=auto:enable='${f3En}'[v3]`,

    `[v3]` +
      plateAndText(f1.namePlate, doctorName, FONT_BOLD, f1.nameFontSize, f1.nameTextY, f1En) + ',' +
      plateAndText(f1.desgPlate, designation, FONT_REG, f1.desgFontSize, f1.desgTextY, f1En) + ',' +
      plateAndText(f2.namePlate, doctorName, FONT_BOLD, f2.nameFontSize, f2.nameTextY, f2En) + ',' +
      plateAndText(f2.desgPlate, designation, FONT_REG, f2.desgFontSize, f2.desgTextY, f2En) + ',' +
      plateAndText(f3.namePlate, doctorName, FONT_BOLD, f3.nameFontSize, f3.nameTextY, f3En) + ',' +
      plateAndText(f3.desgPlate, designation, FONT_REG, f3.desgFontSize, f3.desgTextY, f3En) + ',' +
      `format=yuv420p[v_final]`
  ].join(';');
}

/**
 * Builds ffmpeg args array + writes the filter_complex graph to a temporary
 * script file. This avoids ALL shell-quoting problems on Windows (cmd.exe
 * mangles nested " and ' quotes in long commands), because execFile() spawns
 * ffmpeg.exe directly with an argv array -- no shell involved at all.
 */
function buildFFmpegInvocation(masterVideoPath, photoPath, doctorName, designation, outputPath, frames) {
  const filterComplex = buildFilterComplex(doctorName, designation, frames);

  const scriptPath = path.join(TMP_DIR, `filter_${uuidv4()}.txt`);
  fs.writeFileSync(scriptPath, filterComplex, 'utf8');

  const args = [
    '-y',
    '-i', masterVideoPath,
    '-i', photoPath,
    '-filter_complex_script', scriptPath,
    '-map', '[v_final]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-r', '25',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath
  ];

  return { args, scriptPath };
}

// POST /generate-video
function uploadMiddleware(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
}

app.post('/generate-video', uploadMiddleware, async (req, res) => {
  const { doctorName, designation, language } = req.body;
  const photoFile = req.file;

  if (!doctorName || !designation || !photoFile) {
    if (photoFile) fs.unlinkSync(photoFile.path);
    return res.status(400).json({ error: 'doctorName, designation, and photo are required.' });
  }

  if (doctorName.trim().length > 60 || designation.trim().length > 80) {
    if (photoFile) fs.unlinkSync(photoFile.path);
    return res.status(400).json({ error: 'Name must be ≤60 chars, designation ≤80 chars.' });
  }

  const lang = (language || 'english').trim().toLowerCase();
  if (!LANGUAGE_VIDEOS[lang]) {
    if (photoFile) fs.unlinkSync(photoFile.path);
    return res.status(400).json({
      error: `Invalid language "${language}". Valid options: ${Object.keys(LANGUAGE_VIDEOS).join(', ')}`
    });
  }

  const masterVideoPath = path.join(VIDEOS_DIR, LANGUAGE_VIDEOS[lang]);
  if (!fs.existsSync(masterVideoPath)) {
    if (photoFile) fs.unlinkSync(photoFile.path);
    return res.status(500).json({ error: `Master video not found for language "${lang}": ${LANGUAGE_VIDEOS[lang]}` });
  }

  const frames = getFrameConfigs(lang);

  const jobId = uuidv4();
  const outputFilename = `doctor_${jobId}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputFilename);

  console.log(`[${jobId}] Generating: ${doctorName} — ${designation} (${lang})`);

  let scriptPath = null;
  try {
    const { args, scriptPath: sp } = buildFFmpegInvocation(masterVideoPath, photoFile.path, doctorName.trim(), designation.trim(), outputPath, frames);
    scriptPath = sp;
    const startTime = Date.now();
    await execFileAsync('ffmpeg', args, { cwd: __dirname, maxBuffer: 50 * 1024 * 1024 });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${jobId}] Done in ${elapsed}s`);

    fs.unlinkSync(photoFile.path);
    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

    res.json({
      success: true,
      jobId,
      videoUrl: `/outputs/${outputFilename}`,
      filename: outputFilename,
      processingTime: `${elapsed}s`
    });
  } catch (err) {
    console.error(`[${jobId}] Error:`, err.message);
    if (err.stderr) {
      const s = err.stderr.toString();
      console.error(`[${jobId}] ffmpeg stderr (start):`, s.slice(0, 1500));
      console.error(`[${jobId}] ffmpeg stderr (end):`, s.slice(-500));
    }
    if (photoFile && fs.existsSync(photoFile.path)) fs.unlinkSync(photoFile.path);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    if (scriptPath && fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    res.status(500).json({ error: 'Video generation failed.', detail: (err.stderr || err.message || '').toString().slice(0, 1000) });
  }
});

app.get('/health', (req, res) => {
  const videoStatus = {};
  for (const [lang, file] of Object.entries(LANGUAGE_VIDEOS)) {
    videoStatus[lang] = fs.existsSync(path.join(VIDEOS_DIR, file));
  }
  res.json({
    status: 'ok',
    videos: videoStatus,
    fontBold: fs.existsSync(path.join(__dirname, FONT_BOLD)),
    fontReg: fs.existsSync(path.join(__dirname, FONT_REG))
  });
});

// Global error handler — always return JSON, never let Express's HTML error page leak through
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler — JSON instead of HTML
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Cleanup old outputs every 30 min
setInterval(() => {
  const outputDir = OUTPUTS_DIR;
  const now = Date.now();
  fs.readdirSync(outputDir).forEach(f => {
    const fp = path.join(outputDir, f);
    if (now - fs.statSync(fp).mtimeMs > 60 * 60 * 1000) {
      fs.unlinkSync(fp);
      console.log(`Cleaned: ${f}`);
    }
  });
}, 30 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`\n🚀 Doctor Video API → http://localhost:${PORT}`);
  console.log(`   Videos dir: ${VIDEOS_DIR}`);
  for (const [lang, file] of Object.entries(LANGUAGE_VIDEOS)) {
    const exists = fs.existsSync(path.join(VIDEOS_DIR, file));
    console.log(`     ${exists ? '✅' : '❌'} ${lang}: ${file}`);
  }
  console.log('');
});
