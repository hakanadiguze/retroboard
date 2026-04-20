import { useEffect, useRef, useState } from "react";

// ─── Theme Definitions ────────────────────────────────────────────────────────
export const THEMES = [
  { id:"default",      name:"RetroBoard",           emoji:"🔄", desc:"Classic teal",           bg:"#E8F8F5" },
  { id:"matrix",       name:"Matrix",               emoji:"🟢", desc:"The code is everywhere",  bg:"#000800" },
  { id:"starwars",     name:"Star Wars",             emoji:"⭐", desc:"A long time ago…",        bg:"#000010" },
  { id:"jurassic",     name:"Jurassic Park",         emoji:"🦕", desc:"Life finds a way",        bg:"#0a1a0a" },
  { id:"jaws",         name:"Jaws",                  emoji:"🌊", desc:"You're gonna need a bigger board", bg:"#010d1a" },
  { id:"lotr",         name:"Lord of the Rings",     emoji:"💍", desc:"One board to rule them all", bg:"#1a1200" },
  { id:"airbender",    name:"Avatar: Last Airbender",emoji:"💨", desc:"The four elements unite", bg:"#020a14" },
  { id:"avatar",       name:"Avatar (Pandora)",      emoji:"🔵", desc:"I see you",               bg:"#000a14" },
  { id:"interstellar", name:"Interstellar",          emoji:"🚀", desc:"Do not go gentle…",       bg:"#000005" },
];

export const DEFAULT_THEME = "default";

export function getTheme() {
  return localStorage.getItem("retroboard_theme") || DEFAULT_THEME;
}
export function setTheme(id) {
  localStorage.setItem("retroboard_theme", id);
}

// ─── Canvas animators ─────────────────────────────────────────────────────────

function useCanvas(draw, deps=[]) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;
    function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);
    const state = draw(ctx, canvas);
    function loop(){ if(!running) return; state && state(); rafRef.current=requestAnimationFrame(loop); }
    loop();
    return ()=>{ running=false; cancelAnimationFrame(rafRef.current); window.removeEventListener("resize",resize); state?.cleanup?.(); };
  }, deps);
  return canvasRef;
}

// 🟢 Matrix — falling katakana/code
function MatrixCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const cols = Math.floor(canvas.width/14);
    const drops = Array(cols).fill(1);
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>{}[]|".split("");
    return ()=>{
      ctx.fillStyle="rgba(0,8,0,0.05)";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#00ff41";
      ctx.font="13px monospace";
      drops.forEach((y,i)=>{
        const char=chars[Math.floor(Math.random()*chars.length)];
        ctx.fillStyle = Math.random()>0.95?"#ffffff":"#00ff41";
        ctx.fillText(char, i*14, y*14);
        if(y*14>canvas.height && Math.random()>0.975) drops[i]=0;
        drops[i]++;
      });
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// ⭐ Star Wars — hyperspace
function StarWarsCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const stars = Array.from({length:300},()=>({
      x:(Math.random()-0.5)*canvas.width,
      y:(Math.random()-0.5)*canvas.height,
      z:Math.random()*canvas.width,
      pz:0,
    }));
    const cx=canvas.width/2, cy=canvas.height/2;
    return ()=>{
      ctx.fillStyle="rgba(0,0,16,0.2)";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      stars.forEach(s=>{
        s.pz=s.z;
        s.z-=6;
        if(s.z<=0){ s.x=(Math.random()-0.5)*canvas.width; s.y=(Math.random()-0.5)*canvas.height; s.z=canvas.width; s.pz=s.z; }
        const sx=cx+(s.x/s.z)*canvas.width;
        const sy=cy+(s.y/s.z)*canvas.height;
        const px=cx+(s.x/s.pz)*canvas.width;
        const py=cy+(s.y/s.pz)*canvas.height;
        const size=Math.max(0.5,2.5*(1-s.z/canvas.width));
        ctx.strokeStyle=`rgba(255,255,220,${1-s.z/canvas.width})`;
        ctx.lineWidth=size;
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(sx,sy); ctx.stroke();
      });
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// 🦕 Jurassic Park — rain + jungle
function JurassicCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const drops = Array.from({length:200},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,speed:8+Math.random()*6,len:15+Math.random()*20}));
    const leaves = Array.from({length:12},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:20+Math.random()*40,a:Math.random()*Math.PI*2,da:0.005+Math.random()*0.01,opacity:0.15+Math.random()*0.25}));
    return ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Rain
      ctx.strokeStyle="rgba(180,220,180,0.25)";
      ctx.lineWidth=1;
      drops.forEach(d=>{
        ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-2,d.y+d.len); ctx.stroke();
        d.y+=d.speed;
        if(d.y>canvas.height){d.y=-d.len;d.x=Math.random()*canvas.width;}
      });
      // Leaves silhouettes
      leaves.forEach(l=>{
        l.a+=l.da;
        ctx.save(); ctx.translate(l.x+Math.sin(l.a)*20,l.y+Math.cos(l.a)*10);
        ctx.rotate(l.a);
        ctx.fillStyle=`rgba(20,80,20,${l.opacity})`;
        ctx.beginPath();
        ctx.ellipse(0,0,l.r,l.r/2.5,0,0,Math.PI*2);
        ctx.fill(); ctx.restore();
      });
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// 🌊 Jaws — deep ocean waves + fin
function JawsCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    let t=0;
    const bubbles = Array.from({length:40},()=>({x:Math.random()*canvas.width,y:canvas.height+10,r:1+Math.random()*4,speed:0.5+Math.random()*1.5,wobble:Math.random()*Math.PI*2}));
    let finX = -100, finY = canvas.height*0.65, finDir = 1;
    return ()=>{
      t+=0.015;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Waves
      for(let w=3;w>=0;w--){
        const alpha=0.06+w*0.04;
        ctx.fillStyle=`rgba(0,40,120,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0,canvas.height);
        for(let x=0;x<=canvas.width;x+=10){
          const wave=Math.sin(x*0.01+t+w)*18+Math.sin(x*0.02-t*1.3+w)*10;
          ctx.lineTo(x, canvas.height*(0.55+w*0.1)+wave);
        }
        ctx.lineTo(canvas.width,canvas.height); ctx.closePath(); ctx.fill();
      }
      // Bubbles
      bubbles.forEach(b=>{
        b.y-=b.speed; b.wobble+=0.05;
        if(b.y<-10){b.y=canvas.height+10;b.x=Math.random()*canvas.width;}
        ctx.beginPath();
        ctx.arc(b.x+Math.sin(b.wobble)*3,b.y,b.r,0,Math.PI*2);
        ctx.strokeStyle="rgba(100,180,255,0.3)"; ctx.lineWidth=1; ctx.stroke();
      });
      // Shark fin
      finX += finDir * 1.2;
      if(finX>canvas.width+60) finDir=-1;
      if(finX<-60) finDir=1;
      ctx.fillStyle="rgba(20,30,50,0.7)";
      ctx.beginPath();
      ctx.moveTo(finX, finY+20);
      ctx.lineTo(finX+finDir*30, finY-30);
      ctx.lineTo(finX+finDir*55, finY+20);
      ctx.closePath(); ctx.fill();
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// 💍 Lord of the Rings — gold ring particles + mist
function LotrCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const particles = Array.from({length:80},()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:0.5+Math.random()*2, vx:(Math.random()-0.5)*0.4, vy:-0.2-Math.random()*0.5,
      opacity:Math.random(), life:Math.random(),
    }));
    let t=0;
    return ()=>{
      t+=0.005;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Mist layers
      for(let i=0;i<3;i++){
        const grd=ctx.createLinearGradient(0,canvas.height*(0.5+i*0.15),canvas.width,canvas.height*(0.5+i*0.15));
        grd.addColorStop(0,`rgba(80,60,0,0)`);
        grd.addColorStop(0.4+Math.sin(t+i)*0.1,`rgba(80,60,0,0.06)`);
        grd.addColorStop(1,`rgba(80,60,0,0)`);
        ctx.fillStyle=grd;
        ctx.fillRect(0,canvas.height*(0.4+i*0.15),canvas.width,canvas.height*0.2);
      }
      // Gold particles
      particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.life+=0.005;
        if(p.life>1||p.y<-10){
          p.x=Math.random()*canvas.width; p.y=canvas.height+10;
          p.life=0; p.opacity=0;
        }
        p.opacity=Math.sin(p.life*Math.PI)*0.8;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,200,50,${p.opacity})`; ctx.fill();
      });
      // Glowing ring pulse
      const rCx=canvas.width/2, rCy=canvas.height*0.5;
      const pulse=0.7+Math.sin(t*2)*0.3;
      const grd=ctx.createRadialGradient(rCx,rCy,30,rCx,rCy,120);
      grd.addColorStop(0,`rgba(255,180,0,0)`);
      grd.addColorStop(0.5,`rgba(255,180,0,${0.04*pulse})`);
      grd.addColorStop(1,`rgba(255,180,0,0)`);
      ctx.fillStyle=grd; ctx.fillRect(0,0,canvas.width,canvas.height);
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// 💨 Avatar: Last Airbender — wind spirals
function AirbenderCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const spirals = Array.from({length:6},(_,i)=>({
      cx:canvas.width*(0.1+i*0.16), cy:canvas.height*0.5,
      angle:i*Math.PI/3, speed:0.02+i*0.005, r:60+i*20,
    }));
    const particles = Array.from({length:120},()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2,
      life:Math.random(), size:1+Math.random()*3,
      hue: 180+Math.random()*60,
    }));
    return ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      spirals.forEach(s=>{
        s.angle+=s.speed;
        ctx.strokeStyle=`rgba(100,200,255,0.08)`;
        ctx.lineWidth=2;
        ctx.beginPath();
        for(let a=0;a<Math.PI*6;a+=0.1){
          const r=a*8;
          const x=s.cx+Math.cos(a+s.angle)*r;
          const y=s.cy+Math.sin(a+s.angle)*r*0.4;
          a===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.stroke();
      });
      particles.forEach(p=>{
        p.life+=0.008; p.x+=p.vx; p.y+=p.vy;
        if(p.life>1){p.life=0;p.x=Math.random()*canvas.width;p.y=Math.random()*canvas.height;}
        const op=Math.sin(p.life*Math.PI)*0.6;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle=`hsla(${p.hue},80%,70%,${op})`; ctx.fill();
      });
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// 🔵 Avatar Pandora — bioluminescent particles
function AvatarCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const orbs = Array.from({length:60},()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:2+Math.random()*8, phase:Math.random()*Math.PI*2,
      speed:0.01+Math.random()*0.02, color:`hsl(${180+Math.random()*80},100%,60%)`,
      vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3,
    }));
    const spores = Array.from({length:200},()=>({
      x:Math.random()*canvas.width, y:canvas.height+10,
      vx:(Math.random()-0.5)*0.5, vy:-0.3-Math.random()*0.8,
      r:1+Math.random()*2, hue:180+Math.random()*60,
      opacity:Math.random(),
    }));
    return ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Floating orbs
      orbs.forEach(o=>{
        o.phase+=o.speed; o.x+=o.vx; o.y+=o.vy;
        if(o.x<-20)o.x=canvas.width+20; if(o.x>canvas.width+20)o.x=-20;
        if(o.y<-20)o.y=canvas.height+20; if(o.y>canvas.height+20)o.y=-20;
        const alpha=0.3+Math.sin(o.phase)*0.25;
        const grd=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r*3);
        grd.addColorStop(0,o.color.replace(")",`,${alpha})`).replace("hsl","hsla"));
        grd.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(o.x,o.y,o.r*3,0,Math.PI*2); ctx.fill();
      });
      // Rising spores
      spores.forEach(s=>{
        s.y+=s.vy; s.x+=s.vx;
        if(s.y<-10){s.y=canvas.height+10;s.x=Math.random()*canvas.width;}
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`hsla(${s.hue},100%,70%,${s.opacity*0.5})`; ctx.fill();
      });
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// 🚀 Interstellar — black hole + wormhole
function InterstellarCanvas() {
  const ref = useCanvas((ctx, canvas)=>{
    const stars = Array.from({length:400},()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:Math.random()*1.5, twinkle:Math.random()*Math.PI*2,
    }));
    let t=0;
    return ()=>{
      t+=0.008;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Stars
      stars.forEach(s=>{
        s.twinkle+=0.03;
        const op=0.4+Math.sin(s.twinkle)*0.3;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(200,210,255,${op})`; ctx.fill();
      });
      // Accretion disk
      const cx=canvas.width/2, cy=canvas.height/2;
      for(let i=8;i>=0;i--){
        const r=80+i*18;
        const grd=ctx.createRadialGradient(cx,cy,r-15,cx,cy,r+15);
        const hue=25+i*8;
        grd.addColorStop(0,`hsla(${hue},100%,60%,0)`);
        grd.addColorStop(0.5,`hsla(${hue},100%,60%,${0.12-i*0.01})`);
        grd.addColorStop(1,`hsla(${hue},100%,60%,0)`);
        ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.28); ctx.translate(-cx,-cy);
        ctx.beginPath(); ctx.arc(cx,cy,r+15,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.fill(); ctx.restore();
      }
      // Event horizon
      const ehGrd=ctx.createRadialGradient(cx,cy,0,cx,cy,75);
      ehGrd.addColorStop(0,"rgba(0,0,0,1)");
      ehGrd.addColorStop(0.8,"rgba(0,0,0,0.95)");
      ehGrd.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx,cy,75,0,Math.PI*2);
      ctx.fillStyle=ehGrd; ctx.fill();
      // Gravitational lens glow
      const lensGrd=ctx.createRadialGradient(cx,cy,70,cx,cy,160);
      lensGrd.addColorStop(0,`rgba(255,140,40,${0.06+Math.sin(t)*0.02})`);
      lensGrd.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx,cy,160,0,Math.PI*2);
      ctx.fillStyle=lensGrd; ctx.fill();
    };
  });
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// ─── Theme Background Component ───────────────────────────────────────────────
export function ThemeBackground({ themeId }) {
  const theme = THEMES.find(t=>t.id===themeId) || THEMES[0];

  const overlays = {
    matrix:       "rgba(0,8,0,0.82)",
    starwars:     "rgba(0,0,16,0.75)",
    jurassic:     "rgba(5,20,5,0.80)",
    jaws:         "rgba(1,10,26,0.82)",
    lotr:         "rgba(20,14,0,0.80)",
    airbender:    "rgba(2,8,20,0.80)",
    avatar:       "rgba(0,8,20,0.78)",
    interstellar: "rgba(0,0,5,0.75)",
    default:      "transparent",
  };

  return (
    <>
      <div style={{position:"fixed",inset:0,zIndex:0,background:theme.bg,transition:"background 0.8s"}}/>
      {themeId==="matrix"       && <MatrixCanvas/>}
      {themeId==="starwars"     && <StarWarsCanvas/>}
      {themeId==="jurassic"     && <JurassicCanvas/>}
      {themeId==="jaws"         && <JawsCanvas/>}
      {themeId==="lotr"         && <LotrCanvas/>}
      {themeId==="airbender"    && <AirbenderCanvas/>}
      {themeId==="avatar"       && <AvatarCanvas/>}
      {themeId==="interstellar" && <InterstellarCanvas/>}
      {themeId!=="default" && (
        <div style={{position:"fixed",inset:0,zIndex:1,background:overlays[themeId],pointerEvents:"none"}}/>
      )}
    </>
  );
}

// ─── Theme Picker Modal ───────────────────────────────────────────────────────
export function ThemePicker({ current, onChange, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0a0a0a",borderRadius:20,padding:28,maxWidth:680,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.8)",border:"1px solid rgba(255,255,255,.1)"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
          <div style={{color:"#fff",fontWeight:900,fontSize:20}}>🎨 Choose Theme</div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"rgba(255,255,255,.1)",border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10}}>
          {THEMES.map(t=>{
            const sel=t.id===current;
            return(
              <button key={t.id} onClick={()=>{onChange(t.id);onClose();}}
                style={{background:sel?"rgba(255,255,255,.15)":"rgba(255,255,255,.05)",
                  border:`2px solid ${sel?"rgba(255,255,255,.6)":"rgba(255,255,255,.1)"}`,
                  borderRadius:14,padding:"14px 12px",cursor:"pointer",textAlign:"left",
                  transition:"all .2s",color:"#fff"}}>
                <div style={{fontSize:28,marginBottom:6}}>{t.emoji}</div>
                <div style={{fontWeight:800,fontSize:13,marginBottom:3}}>{t.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.5)",lineHeight:1.4}}>{t.desc}</div>
                {sel&&<div style={{marginTop:6,fontSize:10,color:"#0f0",fontWeight:700}}>✓ Active</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
