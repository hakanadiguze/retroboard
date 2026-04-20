import { useEffect, useRef, useState } from "react";

export const THEMES = [
  { id:"default",      name:"RetroBoard",            emoji:"🔄", desc:"Classic teal",                bg:"#E8F8F5" },
  { id:"matrix",       name:"Matrix",                emoji:"🟢", desc:"The code is everywhere",       bg:"#000800" },
  { id:"starwars",     name:"Star Wars",              emoji:"⭐", desc:"A long time ago…",             bg:"#000010" },
  { id:"jurassic",     name:"Jurassic Park",          emoji:"🦕", desc:"Life finds a way",             bg:"#0a1a0a" },
  { id:"jaws",         name:"Jaws",                   emoji:"🌊", desc:"You're gonna need a bigger board", bg:"#010d1a" },
  { id:"lotr",         name:"Lord of the Rings",      emoji:"💍", desc:"One board to rule them all",   bg:"#1a1200" },
  { id:"airbender",    name:"Avatar: Last Airbender", emoji:"💨", desc:"The four elements unite",      bg:"#020a14" },
  { id:"avatar",       name:"Avatar (Pandora)",       emoji:"🔵", desc:"I see you",                    bg:"#000a14" },
  { id:"interstellar", name:"Interstellar",           emoji:"🚀", desc:"Do not go gentle…",            bg:"#000005" },
];

export const DEFAULT_THEME = "default";

export function getTheme() {
  try { return localStorage.getItem("retroboard_theme") || DEFAULT_THEME; }
  catch { return DEFAULT_THEME; }
}
export function setTheme(id) {
  try { localStorage.setItem("retroboard_theme", id); } catch {}
}

// ─── Single unified canvas that handles all themes ────────────────────────────
export function ThemeCanvas({ themeId }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || themeId === "default") return;
    const ctx = canvas.getContext("2d");
    let running = true;
    let rafId = null;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Init per-theme state
    const W = () => canvas.width;
    const H = () => canvas.height;

    function initState() {
      if (themeId === "matrix") {
        return {
          drops: Array.from({ length: Math.floor(W() / 14) }, () => 1),
          chars: "アイウエオカキクケコサシスセソ0123456789ABCDEF<>{}[]".split(""),
        };
      }
      if (themeId === "starwars") {
        return {
          stars: Array.from({ length: 300 }, () => ({
            x: (Math.random() - 0.5) * W(), y: (Math.random() - 0.5) * H(),
            z: Math.random() * W(), pz: 0,
          })),
        };
      }
      if (themeId === "jurassic") {
        return {
          drops: Array.from({ length: 200 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), speed: 8 + Math.random() * 6, len: 15 + Math.random() * 20 })),
          leaves: Array.from({ length: 12 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), r: 20 + Math.random() * 40, a: Math.random() * Math.PI * 2, da: 0.005 + Math.random() * 0.01, opacity: 0.15 + Math.random() * 0.25 })),
        };
      }
      if (themeId === "jaws") {
        return {
          t: 0,
          bubbles: Array.from({ length: 40 }, () => ({ x: Math.random() * W(), y: H() + 10, r: 1 + Math.random() * 4, speed: 0.5 + Math.random() * 1.5, wobble: Math.random() * Math.PI * 2 })),
          finX: -100, finDir: 1,
        };
      }
      if (themeId === "lotr") {
        return {
          t: 0,
          particles: Array.from({ length: 80 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), r: 0.5 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.4, vy: -0.2 - Math.random() * 0.5, opacity: Math.random(), life: Math.random() })),
        };
      }
      if (themeId === "airbender") {
        return {
          spirals: Array.from({ length: 6 }, (_, i) => ({ cx: W() * (0.1 + i * 0.16), cy: H() * 0.5, angle: i * Math.PI / 3, speed: 0.02 + i * 0.005 })),
          particles: Array.from({ length: 120 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: Math.random(), size: 1 + Math.random() * 3, hue: 180 + Math.random() * 60 })),
        };
      }
      if (themeId === "avatar") {
        return {
          orbs: Array.from({ length: 60 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), r: 2 + Math.random() * 8, phase: Math.random() * Math.PI * 2, speed: 0.01 + Math.random() * 0.02, hue: 180 + Math.random() * 80, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 })),
          spores: Array.from({ length: 200 }, () => ({ x: Math.random() * W(), y: H() + 10, vx: (Math.random() - 0.5) * 0.5, vy: -0.3 - Math.random() * 0.8, r: 1 + Math.random() * 2, hue: 180 + Math.random() * 60 })),
        };
      }
      if (themeId === "interstellar") {
        return {
          t: 0,
          stars: Array.from({ length: 400 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), r: Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2 })),
        };
      }
      return {};
    }

    stateRef.current = initState();

    function draw() {
      if (!running) return;
      const s = stateRef.current;
      const w = W(), h = H();

      if (themeId === "matrix") {
        ctx.fillStyle = "rgba(0,8,0,0.05)";
        ctx.fillRect(0, 0, w, h);
        ctx.font = "13px monospace";
        if (s.drops.length !== Math.floor(w / 14)) s.drops = Array.from({ length: Math.floor(w / 14) }, () => 1);
        s.drops.forEach((y, i) => {
          const char = s.chars[Math.floor(Math.random() * s.chars.length)];
          ctx.fillStyle = Math.random() > 0.95 ? "#ffffff" : "#00ff41";
          ctx.fillText(char, i * 14, y * 14);
          if (y * 14 > h && Math.random() > 0.975) s.drops[i] = 0;
          s.drops[i]++;
        });
      }

      else if (themeId === "starwars") {
        ctx.fillStyle = "rgba(0,0,16,0.2)";
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        s.stars.forEach(star => {
          star.pz = star.z; star.z -= 6;
          if (star.z <= 0) { star.x = (Math.random() - 0.5) * w; star.y = (Math.random() - 0.5) * h; star.z = w; star.pz = w; }
          const sx = cx + (star.x / star.z) * w, sy = cy + (star.y / star.z) * h;
          const px = cx + (star.x / star.pz) * w, py = cy + (star.y / star.pz) * h;
          const size = Math.max(0.5, 2.5 * (1 - star.z / w));
          ctx.strokeStyle = `rgba(255,255,220,${1 - star.z / w})`;
          ctx.lineWidth = size;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        });
      }

      else if (themeId === "jurassic") {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(180,220,180,0.25)"; ctx.lineWidth = 1;
        s.drops.forEach(d => {
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.len); ctx.stroke();
          d.y += d.speed;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
        });
        s.leaves.forEach(l => {
          l.a += l.da;
          ctx.save(); ctx.translate(l.x + Math.sin(l.a) * 20, l.y + Math.cos(l.a) * 10); ctx.rotate(l.a);
          ctx.fillStyle = `rgba(20,80,20,${l.opacity})`;
          ctx.beginPath(); ctx.ellipse(0, 0, l.r, l.r / 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });
      }

      else if (themeId === "jaws") {
        s.t += 0.015;
        ctx.clearRect(0, 0, w, h);
        for (let i = 3; i >= 0; i--) {
          ctx.fillStyle = `rgba(0,40,120,${0.06 + i * 0.04})`;
          ctx.beginPath(); ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 10) { ctx.lineTo(x, h * (0.55 + i * 0.1) + Math.sin(x * 0.01 + s.t + i) * 18); }
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        }
        s.bubbles.forEach(b => {
          b.y -= b.speed; b.wobble += 0.05;
          if (b.y < -10) { b.y = h + 10; b.x = Math.random() * w; }
          ctx.beginPath(); ctx.arc(b.x + Math.sin(b.wobble) * 3, b.y, b.r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(100,180,255,0.3)"; ctx.lineWidth = 1; ctx.stroke();
        });
        s.finX += s.finDir * 1.2;
        if (s.finX > w + 60) s.finDir = -1;
        if (s.finX < -60) s.finDir = 1;
        const fy = h * 0.65;
        ctx.fillStyle = "rgba(20,30,50,0.7)";
        ctx.beginPath(); ctx.moveTo(s.finX, fy + 20); ctx.lineTo(s.finX + s.finDir * 30, fy - 30); ctx.lineTo(s.finX + s.finDir * 55, fy + 20); ctx.closePath(); ctx.fill();
      }

      else if (themeId === "lotr") {
        s.t += 0.005;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 3; i++) {
          const grd = ctx.createLinearGradient(0, h * (0.5 + i * 0.15), w, h * (0.5 + i * 0.15));
          grd.addColorStop(0, "rgba(80,60,0,0)"); grd.addColorStop(0.4 + Math.sin(s.t + i) * 0.1, `rgba(80,60,0,0.06)`); grd.addColorStop(1, "rgba(80,60,0,0)");
          ctx.fillStyle = grd; ctx.fillRect(0, h * (0.4 + i * 0.15), w, h * 0.2);
        }
        s.particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.life += 0.005;
          if (p.life > 1 || p.y < -10) { p.x = Math.random() * w; p.y = h + 10; p.life = 0; }
          p.opacity = Math.sin(p.life * Math.PI) * 0.8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,50,${p.opacity})`; ctx.fill();
        });
        const rCx = w / 2, rCy = h * 0.5;
        const grd2 = ctx.createRadialGradient(rCx, rCy, 30, rCx, rCy, 120);
        grd2.addColorStop(0, "rgba(255,180,0,0)"); grd2.addColorStop(0.5, `rgba(255,180,0,${0.04 * (0.7 + Math.sin(s.t * 2) * 0.3)})`); grd2.addColorStop(1, "rgba(255,180,0,0)");
        ctx.fillStyle = grd2; ctx.fillRect(0, 0, w, h);
      }

      else if (themeId === "airbender") {
        ctx.clearRect(0, 0, w, h);
        s.spirals.forEach(sp => {
          sp.angle += sp.speed;
          ctx.strokeStyle = "rgba(100,200,255,0.08)"; ctx.lineWidth = 2; ctx.beginPath();
          for (let a = 0; a < Math.PI * 6; a += 0.1) {
            const r = a * 8;
            const x = sp.cx + Math.cos(a + sp.angle) * r, y = sp.cy + Math.sin(a + sp.angle) * r * 0.4;
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        s.particles.forEach(p => {
          p.life += 0.008; p.x += p.vx; p.y += p.vy;
          if (p.life > 1) { p.life = 0; p.x = Math.random() * w; p.y = Math.random() * h; }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},80%,70%,${Math.sin(p.life * Math.PI) * 0.6})`; ctx.fill();
        });
      }

      else if (themeId === "avatar") {
        ctx.clearRect(0, 0, w, h);
        s.orbs.forEach(o => {
          o.phase += o.speed; o.x += o.vx; o.y += o.vy;
          if (o.x < -20) o.x = w + 20; if (o.x > w + 20) o.x = -20;
          if (o.y < -20) o.y = h + 20; if (o.y > h + 20) o.y = -20;
          const alpha = 0.3 + Math.sin(o.phase) * 0.25;
          const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3);
          grd.addColorStop(0, `hsla(${o.hue},100%,60%,${alpha})`); grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 3, 0, Math.PI * 2); ctx.fill();
        });
        s.spores.forEach(sp => {
          sp.y += sp.vy; sp.x += sp.vx;
          if (sp.y < -10) { sp.y = h + 10; sp.x = Math.random() * w; }
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${sp.hue},100%,70%,0.4)`; ctx.fill();
        });
      }

      else if (themeId === "interstellar") {
        s.t += 0.008;
        ctx.clearRect(0, 0, w, h);
        s.stars.forEach(st => {
          st.twinkle += 0.03;
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,210,255,${0.4 + Math.sin(st.twinkle) * 0.3})`; ctx.fill();
        });
        const cx = w / 2, cy = h / 2;
        for (let i = 8; i >= 0; i--) {
          const r = 80 + i * 18, hue = 25 + i * 8;
          const grd = ctx.createRadialGradient(cx, cy, r - 15, cx, cy, r + 15);
          grd.addColorStop(0, `hsla(${hue},100%,60%,0)`); grd.addColorStop(0.5, `hsla(${hue},100%,60%,${0.12 - i * 0.01})`); grd.addColorStop(1, `hsla(${hue},100%,60%,0)`);
          ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.28); ctx.translate(-cx, -cy);
          ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill(); ctx.restore();
        }
        const ehGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75);
        ehGrd.addColorStop(0, "rgba(0,0,0,1)"); ehGrd.addColorStop(0.8, "rgba(0,0,0,0.95)"); ehGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, cy, 75, 0, Math.PI * 2); ctx.fillStyle = ehGrd; ctx.fill();
        const lGrd = ctx.createRadialGradient(cx, cy, 70, cx, cy, 160);
        lGrd.addColorStop(0, `rgba(255,140,40,${0.06 + Math.sin(s.t) * 0.02})`); lGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, cy, 160, 0, Math.PI * 2); ctx.fillStyle = lGrd; ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [themeId]);

  if (themeId === "default") return null;
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

const OVERLAYS = {
  matrix:"rgba(0,8,0,0.82)", starwars:"rgba(0,0,16,0.75)", jurassic:"rgba(5,20,5,0.80)",
  jaws:"rgba(1,10,26,0.82)", lotr:"rgba(20,14,0,0.80)", airbender:"rgba(2,8,20,0.80)",
  avatar:"rgba(0,8,20,0.78)", interstellar:"rgba(0,0,5,0.75)",
};

export function ThemeBackground({ themeId }) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:0, background:theme.bg, transition:"background 0.8s" }} />
      <ThemeCanvas themeId={themeId} />
      {themeId !== "default" && (
        <div style={{ position:"fixed", inset:0, zIndex:1, background:OVERLAYS[themeId]||"transparent", pointerEvents:"none" }} />
      )}
    </>
  );
}

export function ThemePicker({ current, onChange, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#0a0a0a", borderRadius:20, padding:28, maxWidth:680, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.8)", border:"1px solid rgba(255,255,255,.1)" }}>
        <div style={{ display:"flex", alignItems:"center", marginBottom:20 }}>
          <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>🎨 Choose Theme</div>
          <button onClick={onClose} style={{ marginLeft:"auto", background:"rgba(255,255,255,.1)", border:"none", color:"#fff", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontWeight:700 }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:10 }}>
          {THEMES.map(t => {
            const sel = t.id === current;
            return (
              <button key={t.id} onClick={() => { onChange(t.id); onClose(); }}
                style={{ background:sel?"rgba(255,255,255,.15)":"rgba(255,255,255,.05)", border:`2px solid ${sel?"rgba(255,255,255,.6)":"rgba(255,255,255,.1)"}`, borderRadius:14, padding:"14px 12px", cursor:"pointer", textAlign:"left", transition:"all .2s", color:"#fff" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{t.emoji}</div>
                <div style={{ fontWeight:800, fontSize:13, marginBottom:3 }}>{t.name}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", lineHeight:1.4 }}>{t.desc}</div>
                {sel && <div style={{ marginTop:6, fontSize:10, color:"#0f0", fontWeight:700 }}>✓ Active</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
