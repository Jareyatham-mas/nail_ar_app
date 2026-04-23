import { useEffect, useState } from "react";
import ARView from "./ARView";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [nails,        setNails]        = useState([]);
  const [selectedNail, setSelectedNail] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState("gallery"); // gallery | ar | booking | confirm
  const [bookingDone,  setBookingDone]  = useState(null);

  // booking form
  const [form, setForm] = useState({ name:"", phone:"", time:"" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/nails`)
      .then(r => r.json())
      .then(d => setNails(d))
      .catch(() => setNails(DEMO_NAILS))
      .finally(() => setLoading(false));
  }, []);

  const selectNail = (nail) => { setSelectedNail(nail); setView("ar"); };
  const goGallery  = ()     => { setSelectedNail(null);  setView("gallery"); };
  const goBooking  = ()     => setView("booking");
  const goAR       = ()     => setView("ar");

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.time) { alert("กรอกข้อมูลให้ครบก่อน"); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, nail_id: selectedNail.id, booking_time: form.time }),
      });
      if (r.ok) { setBookingDone({ ...form, nail: selectedNail.name }); setView("confirm"); setForm({ name:"", phone:"", time:"" }); }
      else alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } catch { alert("ไม่สามารถเชื่อมต่อ server ได้"); }
    finally { setSubmitting(false); }
  };

  // ── Confirm page ───────────────────────────────────────────────────────────
  if (view === "confirm" && bookingDone) return (
    <Screen>
      <div style={S.confirmIcon}>🎉</div>
      <h2 style={S.confirmTitle}>จองสำเร็จแล้ว!</h2>
      <div style={S.confirmCard}>
        {[["ลาย", bookingDone.nail], ["ชื่อ", bookingDone.name], ["เบอร์", bookingDone.phone], ["เวลา", new Date(bookingDone.time).toLocaleString("th-TH")]].map(([l,v]) =>
          <div key={l} style={S.confirmRow}><span style={S.confirmLabel}>{l}</span><span style={S.confirmVal}>{v}</span></div>
        )}
      </div>
      <button onClick={goGallery} style={{ ...S.btnPink, marginTop:20 }}>🏠 กลับหน้าหลัก</button>
    </Screen>
  );

  // ── Booking form ───────────────────────────────────────────────────────────
  if (view === "booking" && selectedNail) return (
    <Screen>
      <Header onBack={goAR} title={`จองคิว — ${selectedNail.name}`} />
      <div style={S.nailThumb}>
        {selectedNail.image_url && <img src={selectedNail.image_url} alt={selectedNail.name} style={S.thumbImg} />}
        <div>
          <div style={S.thumbName}>{selectedNail.name}</div>
          <div style={S.thumbPrice}>{selectedNail.price} บาท</div>
        </div>
      </div>
      <form onSubmit={handleBooking} style={S.form}>
        <FormField label="ชื่อ-นามสกุล" type="text" placeholder="กรอกชื่อ" value={form.name} onChange={v => setForm(f=>({...f,name:v}))} />
        <FormField label="เบอร์โทร" type="tel" placeholder="08X-XXX-XXXX" value={form.phone} onChange={v => setForm(f=>({...f,phone:v}))} />
        <FormField label="วันและเวลา" type="datetime-local" value={form.time} onChange={v => setForm(f=>({...f,time:v}))} />
        <button type="submit" style={S.btnPink} disabled={submitting}>
          {submitting ? "กำลังจอง..." : "💅 ยืนยันการจอง"}
        </button>
      </form>
    </Screen>
  );

  // ── AR view ────────────────────────────────────────────────────────────────
  if (view === "ar" && selectedNail) return (
    <Screen>
      <Header onBack={goGallery} title={`ลองลาย: ${selectedNail.name}`} />
      <ARView nail={selectedNail} />
      <button onClick={goBooking} style={{ ...S.btnPink, marginTop:12 }}>📅 จองคิวลายนี้</button>
    </Screen>
  );

  // ── Gallery ────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <div style={S.heroTop}>
        <div style={S.heroEmoji}>💅</div>
        <h1 style={S.heroTitle}>เลือกลายเล็บ</h1>
        <p style={S.heroSub}>ทดลองใส่ AR บนมือจริง</p>
      </div>

      {loading ? (
        <div style={S.loading}>กำลังโหลดลาย...</div>
      ) : (
        <div style={S.grid}>
          {nails.map(nail => <NailCard key={nail.id} nail={nail} onSelect={selectNail} />)}
        </div>
      )}
    </Screen>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Screen({ children }) {
  return <div style={S.screen}>{children}</div>;
}

function Header({ onBack, title }) {
  return (
    <div style={S.header}>
      <button onClick={onBack} style={S.backBtn}>← กลับ</button>
      <span style={S.headerTitle}>{title}</span>
      <div style={{ width:60 }} />
    </div>
  );
}

function NailCard({ nail, onSelect }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{ ...S.card, ...(hov ? S.cardHov : {}) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {nail.image_url
        ? <img src={nail.image_url} alt={nail.name} style={S.cardImg} />
        : <div style={{ ...S.cardImg, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>💅</div>
      }
      <div style={S.cardBody}>
        <div style={S.cardName}>{nail.name}</div>
        <div style={S.cardPrice}>{nail.price?.toLocaleString()} บาท</div>
        <button onClick={() => onSelect(nail)} style={S.btnPink}>
          ✨ ลองลายเล็บ
        </button>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, ...rest }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      <input style={S.input} value={value} onChange={e => onChange(e.target.value)} {...rest} />
    </div>
  );
}

// ── Demo data (fallback when API unavailable) ─────────────────────────────────
const DEMO_NAILS = [
  { id:1, name:"Nude Minimal",  price:350, image_url:null, thumb:"/\u0e40\u0e25\u0e47\u0e1a\u0e42\u0e1b\u0e49\u0e07.png", index_finger:"/\u0e40\u0e25\u0e47\u0e1a\u0e0a\u0e35\u0e49.png", middle_finger:"/\u0e40\u0e25\u0e47\u0e1a\u0e01\u0e25\u0e32\u0e07.png", ring_finger:"/\u0e40\u0e25\u0e47\u0e1a\u0e19\u0e32\u0e07.png", pinky:"/\u0e40\u0e25\u0e47\u0e1a\u0e01\u0e49\u0e2d\u0e22.png" },
  { id:2, name:"Red Marble",    price:420, image_url:null, thumb:"/\u0e40\u0e25\u0e47\u0e1a\u0e42\u0e1b\u0e49\u0e07.png", index_finger:"/\u0e40\u0e25\u0e47\u0e1a\u0e0a\u0e35\u0e49.png", middle_finger:"/\u0e40\u0e25\u0e47\u0e1a\u0e01\u0e25\u0e32\u0e07.png", ring_finger:"/\u0e40\u0e25\u0e47\u0e1a\u0e19\u0e32\u0e07.png", pinky:"/\u0e40\u0e25\u0e47\u0e1a\u0e01\u0e49\u0e2d\u0e22.png" },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  screen:     { minHeight:"100dvh", background:"#faf8f6", display:"flex", flexDirection:"column", maxWidth:700, margin:"0 auto", padding:16, gap:16 },
  heroTop:    { textAlign:"center", padding:"24px 0 8px" },
  heroEmoji:  { fontSize:48, marginBottom:8 },
  heroTitle:  { fontFamily:"Georgia,serif", fontSize:26, color:"#1a1a1a", margin:0 },
  heroSub:    { fontSize:14, color:"#888", marginTop:4 },
  loading:    { textAlign:"center", padding:60, color:"#aaa" },
  grid:       { display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 },
  card:       { background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.08)", transition:"transform .18s, box-shadow .18s", cursor:"pointer" },
  cardHov:    { transform:"translateY(-3px)", boxShadow:"0 8px 28px rgba(201,96,122,0.18)" },
  cardImg:    { width:"100%", aspectRatio:"1", objectFit:"cover" },
  cardBody:   { padding:"12px 14px 14px", display:"flex", flexDirection:"column", gap:6 },
  cardName:   { fontWeight:600, fontSize:14, color:"#1a1a1a" },
  cardPrice:  { fontSize:13, color:"#C9607A", fontWeight:500 },
  header:     { display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:8 },
  headerTitle:{ fontWeight:600, fontSize:15, color:"#1a1a1a" },
  backBtn:    { padding:"8px 14px", background:"#f3f4f6", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, color:"#555" },
  nailThumb:  { display:"flex", alignItems:"center", gap:14, background:"#fff", borderRadius:14, padding:14, boxShadow:"0 2px 10px rgba(0,0,0,0.07)" },
  thumbImg:   { width:64, height:64, borderRadius:10, objectFit:"cover", flexShrink:0 },
  thumbName:  { fontWeight:600, fontSize:15 },
  thumbPrice: { color:"#C9607A", fontSize:13, marginTop:4 },
  form:       { display:"flex", flexDirection:"column", gap:14 },
  field:      { display:"flex", flexDirection:"column", gap:6 },
  label:      { fontSize:13, color:"#555", fontWeight:500 },
  input:      { padding:"13px 14px", border:"1px solid #e5e7eb", borderRadius:12, fontSize:15, outline:"none", background:"#fff" },
  confirmIcon:{ fontSize:64, textAlign:"center", marginTop:40 },
  confirmTitle:{ textAlign:"center", fontFamily:"Georgia,serif", fontSize:22, color:"#1a1a1a", margin:"8px 0 20px" },
  confirmCard:{ background:"#fff", borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.08)" },
  confirmRow: { display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f3f4f6" },
  confirmLabel:{ color:"#888", fontSize:14 },
  confirmVal: { fontWeight:500, fontSize:14, color:"#1a1a1a" },
  btnPink:    { padding:"14px 0", background:"linear-gradient(135deg,#C9607A,#e0476a)", color:"#fff", border:"none", borderRadius:13, fontSize:15, fontWeight:600, cursor:"pointer", width:"100%", transition:"opacity .15s" },
};

export default App;
