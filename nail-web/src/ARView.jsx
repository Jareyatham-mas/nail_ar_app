import { useEffect, useRef, useState, useCallback } from "react";

// ─── MediaPipe landmark indices ───────────────────────────────────────────────
// Each finger: [tip, dip, pip, mcp]
const FINGER_LM = {
  thumb:  [4,  3,  2,  1],
  index:  [8,  7,  6,  5],
  middle: [12, 11, 10, 9],
  ring:   [16, 15, 14, 13],
  pinky:  [20, 19, 18, 17],
};

// Per-finger scale and placement tuning
const TUNE = {
  thumb:  { sizeScale: 1.45, offsetAlong: 0.50, squish: 0.62 },
  index:  { sizeScale: 1.40, offsetAlong: 0.48, squish: 0.64 },
  middle: { sizeScale: 1.42, offsetAlong: 0.48, squish: 0.64 },
  ring:   { sizeScale: 1.38, offsetAlong: 0.48, squish: 0.64 },
  pinky:  { sizeScale: 1.30, offsetAlong: 0.46, squish: 0.64 },
};

// ─── One-euro-style adaptive smoother per finger ─────────────────────────────
class AdaptiveSmoother {
  constructor(minAlpha = 0.25, maxAlpha = 0.7, speedThreshold = 12) {
    this.minAlpha = minAlpha;
    this.maxAlpha = maxAlpha;
    this.speedThreshold = speedThreshold;
    this.prev = null;
  }
  update(val) {
    if (!this.prev) { this.prev = { ...val }; return { ...val }; }
    // speed-based alpha: fast movement -> higher alpha (more responsive)
    const dx = (val.cx - this.prev.cx) || 0;
    const dy = (val.cy - this.prev.cy) || 0;
    const speed = Math.sqrt(dx * dx + dy * dy);
    const t = Math.min(1, speed / this.speedThreshold);
    const alpha = this.minAlpha + t * (this.maxAlpha - this.minAlpha);
    const out = {};
    for (const k of Object.keys(val)) {
      // angle needs circular interpolation
      if (k === "angle") {
        let da = val[k] - this.prev[k];
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        this.prev[k] = this.prev[k] + alpha * da;
      } else {
        this.prev[k] = this.prev[k] * (1 - alpha) + val[k] * alpha;
      }
      out[k] = this.prev[k];
    }
    return out;
  }
  reset() { this.prev = null; }
}

// ─── Is finger visible / extended enough? ────────────────────────────────────
function fingerVisible(lm, tipI, mcpI, CW, CH) {
  const tip = lm[tipI]; const mcp = lm[mcpI];
  if (!tip || !mcp) return false;
  const dx = (tip.x - mcp.x) * CW;
  const dy = (tip.y - mcp.y) * CH;
  return Math.sqrt(dx * dx + dy * dy) > 20;
}

// ─── Draw nail with squish (y-scale < 1) ─────────────────────────────────────
function drawNail(ctx, img, cx, cy, angle, w, squish, alpha) {
  if (!img?.complete || img.naturalWidth === 0 || alpha < 0.05) return;
  const h = w / squish;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(1, squish);
  // shadow
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(img, -w / 2, -h * 0.88, w, h);
  ctx.restore();
}

// ─── Sample brightness for low-light detection ───────────────────────────────
function sampleBrightness(ctx, w, h) {
  try {
    const d = ctx.getImageData(w / 4 | 0, h / 4 | 0, w / 2 | 0, h / 2 | 0).data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 32) { s += 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; n++; }
    return n ? s / n : 128;
  } catch { return 128; }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ARView({ nail }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const imgs      = useRef({});
  const smoothers = useRef(null);
  const cameraRef = useRef(null);
  const mirrRef   = useRef(true);
  const facingRef = useRef("user");

  const [fps,      setFps]      = useState(0);
  const [tracking, setTracking] = useState(false);
  const [lowLight, setLowLight] = useState(false);
  const [facing,   setFacing]   = useState("user");

  const fpsTs  = useRef(Date.now());
  const fpsCnt = useRef(0);
  const briTs  = useRef(0);

  // Create smoothers once
  if (!smoothers.current) {
    smoothers.current = Object.fromEntries(
      Object.keys(FINGER_LM).map(k => [k, new AdaptiveSmoother()])
    );
  }

  // ── Load images ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = (src) => {
      if (!src) return null;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      return img;
    };
    imgs.current = {
      thumb:  load(nail?.thumb         || "/\u0e40\u0e25\u0e47\u0e1a\u0e42\u0e1b\u0e49\u0e07.png"),
      index:  load(nail?.index_finger  || "/\u0e40\u0e25\u0e47\u0e1a\u0e0a\u0e35\u0e49.png"),
      middle: load(nail?.middle_finger || "/\u0e40\u0e25\u0e47\u0e1a\u0e01\u0e25\u0e32\u0e07.png"),
      ring:   load(nail?.ring_finger   || "/\u0e40\u0e25\u0e47\u0e1a\u0e19\u0e32\u0e07.png"),
      pinky:  load(nail?.pinky         || "/\u0e40\u0e25\u0e47\u0e1a\u0e01\u0e49\u0e2d\u0e22.png"),
    };
    Object.values(smoothers.current).forEach(s => s.reset());
  }, [nail]);

  // ── MediaPipe onResults ────────────────────────────────────────────────────
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const CW = canvas.width;
    const CH = canvas.height;

    // FPS
    fpsCnt.current++;
    const now = Date.now();
    if (now - fpsTs.current >= 1000) { setFps(fpsCnt.current); fpsCnt.current = 0; fpsTs.current = now; }

    ctx.clearRect(0, 0, CW, CH);

    // Draw mirrored video
    ctx.save();
    if (mirrRef.current) { ctx.translate(CW, 0); ctx.scale(-1, 1); }
    ctx.drawImage(results.image, 0, 0, CW, CH);
    ctx.restore();

    // Low-light check every 2s
    if (now - briTs.current > 2000) {
      briTs.current = now;
      setLowLight(sampleBrightness(ctx, CW, CH) < 48);
    }

    const lms = results.multiHandLandmarks;
    setTracking(!!(lms?.length));
    if (!lms?.length) {
      Object.values(smoothers.current).forEach(s => s.reset());
      return;
    }

    const lm = lms[0];

    ctx.save();
    if (mirrRef.current) { ctx.translate(CW, 0); ctx.scale(-1, 1); }

    for (const [key, [tipI, dipI, pipI, mcpI]] of Object.entries(FINGER_LM)) {
      const tune = TUNE[key];
      const img  = imgs.current[key];

      if (!lm[tipI] || !lm[dipI] || !lm[pipI] || !lm[mcpI]) continue;
      if (!fingerVisible(lm, tipI, mcpI, CW, CH)) {
        smoothers.current[key].reset(); continue;
      }

      const tipX = lm[tipI].x * CW,  tipY = lm[tipI].y * CH;
      const dipX = lm[dipI].x * CW,  dipY = lm[dipI].y * CH;
      const pipX = lm[pipI].x * CW,  pipY = lm[pipI].y * CH;
      const mcpX = lm[mcpI].x * CW,  mcpY = lm[mcpI].y * CH;

      // Angle: tip → dip direction (more stable, avoids DIP jitter)
      const axisX = tipX - dipX;
      const axisY = tipY - dipY;
      const angle = Math.atan2(axisY, axisX) + Math.PI / 2;

      // Nail size = tip→pip distance × scale factor
      const tipPipDx = tipX - pipX;
      const tipPipDy = tipY - pipY;
      const tipPipLen = Math.sqrt(tipPipDx * tipPipDx + tipPipDy * tipPipDy);

      // Also use pip→mcp to get finger "width" proxy
      const pipMcpDx = pipX - mcpX;
      const pipMcpDy = pipY - mcpY;
      const pipMcpLen = Math.sqrt(pipMcpDx * pipMcpDx + pipMcpDy * pipMcpDy);
      const nailW = Math.max(12, (tipPipLen * 0.7 + pipMcpLen * 0.3) * tune.sizeScale);

      // Nail center: move from tip toward pip
      const along = tune.offsetAlong;
      const cx = tipX + (pipX - tipX) * along * 0.65;
      const cy = tipY + (pipY - tipY) * along * 0.65;

      // Depth scale using z landmark
      const zBoost = 1 + Math.max(-0.12, Math.min(0.12, -(lm[tipI].z || 0) * 0.4));

      // Visibility fade for partially hidden fingers
      const vis = Math.min(1, tipPipLen / 28);

      const sm = smoothers.current[key].update({
        cx, cy, angle, w: nailW * zBoost,
      });

      drawNail(ctx, img, sm.cx, sm.cy, sm.angle, sm.w, tune.squish, vis);
    }

    ctx.restore();
  }, []);

  // ── Start/restart camera + hands when facing changes ──────────────────────
  useEffect(() => {
    if (!window.Hands || !window.Camera || !videoRef.current) return;

    mirrRef.current  = facing === "user";
    facingRef.current = facing;

    const hands = new window.Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.60,
      minTrackingConfidence: 0.50,
    });
    hands.onResults(onResults);

    const cam = new window.Camera(videoRef.current, {
      onFrame: async () => { await hands.send({ image: videoRef.current }); },
      width: 640, height: 480,
      facingMode: facing,
    });
    cam.start();
    cameraRef.current = cam;

    return () => { cam.stop(); hands.close(); };
  }, [facing, onResults]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const capture = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/jpeg", 0.93);
    a.download = `nail-ar-${Date.now()}.jpg`;
    a.click();
  };

  const shareImage = async () => {
    const c = canvasRef.current;
    if (!c) return;
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.93));
    if (navigator.share && blob) {
      try { await navigator.share({ files: [new File([blob], "nail.jpg", { type: "image/jpeg" })], title: "ลองเล็บแล้ว 💅" }); }
      catch {}
    }
  };

  const flip = () => setFacing(f => f === "user" ? "environment" : "user");

  return (
    <div style={S.wrap}>
      <div style={S.bar}>
        <Pill color={tracking ? "#22c55e" : "#f87171"}>{tracking ? "🟢 จับมือได้" : "🔴 ไม่พบมือ"}</Pill>
        {lowLight && <Pill color="#f59e0b">⚠️ แสงน้อย</Pill>}
        <span style={{ marginLeft: "auto" }}><Pill color="#4b5563">{fps} FPS</Pill></span>
      </div>

      <div style={S.canvasWrap}>
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas ref={canvasRef} width={640} height={480} style={S.canvas} />
        {!tracking && (
          <div style={S.noHand}>
            <div style={S.noHandInner}>
              ✋ ยกมือขึ้นให้กล้องเห็น<br />
              <small style={{ opacity: 0.75 }}>กางนิ้ว · พื้นหลังสีเรียบ · แสงพอ</small>
            </div>
          </div>
        )}
      </div>

      <div style={S.tips}>
        {["💡 แสงสว่าง ไม่ใช้แฟลช", "✋ กางนิ้ว อย่าบังกัน", "📏 ระยะ 30–50 ซม.", "🎨 พื้นขาว/เทา ดีสุด"].map(t =>
          <span key={t} style={S.tip}>{t}</span>
        )}
      </div>

      <div style={S.controls}>
        <button onClick={capture} style={S.btnPink}>📸 ถ่าย</button>
        <button onClick={flip}    style={S.btnGray}>🔄 สลับ</button>
        <button onClick={shareImage} style={S.btnGray}>📤 แชร์</button>
      </div>
    </div>
  );
}

function Pill({ children, color }) {
  return <span style={{ background: color, color: "#fff", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>{children}</span>;
}

const S = {
  wrap:       { display:"flex", flexDirection:"column", gap:10, background:"#111", borderRadius:18, padding:14, maxWidth:660, margin:"0 auto" },
  bar:        { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" },
  canvasWrap: { position:"relative", borderRadius:14, overflow:"hidden", background:"#000" },
  canvas:     { width:"100%", display:"block" },
  noHand:     { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)" },
  noHandInner:{ color:"#fff", textAlign:"center", fontSize:16, lineHeight:1.9, background:"rgba(0,0,0,0.45)", padding:"14px 28px", borderRadius:14 },
  tips:       { display:"flex", gap:7, flexWrap:"wrap" },
  tip:        { fontSize:11, color:"#9ca3af", background:"#1c1c1c", borderRadius:8, padding:"4px 10px" },
  controls:   { display:"flex", gap:10 },
  btnPink:    { flex:1, padding:"13px 0", background:"linear-gradient(135deg,#C9607A,#e0476a)", color:"#fff", border:"none", borderRadius:13, fontSize:15, fontWeight:600, cursor:"pointer" },
  btnGray:    { flex:1, padding:"13px 0", background:"#1e1e1e", color:"#d1d5db", border:"1px solid #374151", borderRadius:13, fontSize:14, cursor:"pointer" },
};
