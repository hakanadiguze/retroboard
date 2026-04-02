import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, onValue, off } from "firebase/database";

// ─── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCohdiGyd9fInWrrp846knAEFFFSxANUY8",
  authDomain:        "retroboard-hakan.firebaseapp.com",
  databaseURL:       "https://retroboard-hakan-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "retroboard-hakan",
  storageBucket:     "retroboard-hakan.firebasestorage.app",
  messagingSenderId: "529524880401",
  appId:             "1:529524880401:web:1a04e6c40c67b19b4eadb0",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

function uid()    { return Math.random().toString(36).slice(2, 10); }
function nowISO() { return new Date().toISOString(); }
function roomRef(id) { return ref(db, `rooms/${id}`); }
async function fbGet(id)       { const s = await get(roomRef(id)); return s.exists() ? s.val() : null; }
async function fbSet(id, data) { await set(roomRef(id), data); }

// ─── Palette ──────────────────────────────────────────────────────────────────
const T = {
  teal:"#0D9E9E", tealDark:"#076F6F", tealLight:"#7FDADA", tealBg:"#E6F7F7",
  orange:"#F07030", orangeDark:"#C05020", orangeLight:"#FAB080", orangeBg:"#FFF0E8",
  white:"#FFFFFF", offWhite:"#F8FAFA",
  gray50:"#F0F4F4", gray100:"#DDE8E8", gray300:"#9BB8B8",
  gray500:"#5A7878", gray700:"#2D4A4A", dark:"#0A2020",
};

const COLUMNS = ["Stop","Start","Continue"];
const COL_COLORS = { Stop:"#FF6B6B", Start:"#0D9E9E", Continue:"#F07030" };

const DEFAULT_QUESTIONS = [
  { id:"q1", label:"How is your Mood Level?",          low:"😞 Unhappy", high:"😄 Happy",  scale:5 },
  { id:"q2", label:"Where are you stress wise now?",   low:"😌 Low",     high:"😰 High",   scale:5 },
  { id:"q3", label:"How do you feel about your role?", low:"😞 Unhappy", high:"😄 Happy",  scale:5 },
];

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPDF(room) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const W=210, M=14, cW=W-M*2; let y=M;
  const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const sf=c=>doc.setFillColor(...hx(c));
  const sc=c=>doc.setTextColor(...hx(c));
  const colors=["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];

  // ── Header bar
  sf(T.teal); doc.rect(0,0,W,28,"F");
  sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(20);
  doc.text("Retrospective Results",M,13);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text(`Generated: ${new Date().toLocaleString()}   |   Room: ${room.id}`,M,22);
  y=36;

  const parts=Object.values(room.participants||{}).filter(p=>p.submitted);
  const questions=room.questions||DEFAULT_QUESTIONS;
  const avg=qid=>{ const v=parts.map(p=>p.scores?.[qid]).filter(Boolean); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):"-"; };

  // ── Section title
  sc(T.tealDark); doc.setFont("helvetica","bold"); doc.setFontSize(13);
  doc.text("Team Scores",M,y); y+=7;

  // ── Table layout: rows=questions, cols=participants + avg
  // Calculate column widths dynamically
  const qColW=58; // question label column
  const dataColW=Math.min(22, Math.floor((cW-qColW)/(parts.length+1)));
  const tableW=qColW+(parts.length+1)*dataColW;
  const rowH=9;

  // Header row — participant names
  sf(T.teal); doc.rect(M,y,tableW,rowH,"F");
  sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
  doc.text("Question",M+2,y+6);
  parts.forEach((p,i)=>{
    const x=M+qColW+i*dataColW;
    const name=(p.name||"").slice(0,8)+(p.name?.length>8?"…":"");
    doc.text(name,x+dataColW/2,y+6,{align:"center"});
  });
  // Avg header
  const avgX=M+qColW+parts.length*dataColW;
  sf("#076F6F"); doc.rect(avgX,y,dataColW,rowH,"F");
  sc(T.white); doc.text("Avg",avgX+dataColW/2,y+6,{align:"center"});
  y+=rowH;

  // Data rows — one per question
  questions.forEach((q,qi)=>{
    const c=colors[qi%colors.length];
    // alternating row bg
    if(qi%2===0){sf(T.offWhite);}else{sf(T.white);}
    doc.rect(M,y,tableW,rowH,"F");
    // left border color indicator
    sf(c); doc.rect(M,y,3,rowH,"F");
    // question label
    sc(T.dark); doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    const label=q.label.length>28?q.label.slice(0,27)+"…":q.label;
    doc.text(label,M+5,y+6);
    // scores per participant
    doc.setFont("helvetica","normal");
    parts.forEach((p,i)=>{
      const score=String(p.scores?.[q.id]??"-");
      const x=M+qColW+i*dataColW;
      sc(T.dark);
      doc.text(score,x+dataColW/2,y+6,{align:"center"});
    });
    // avg cell
    const avgVal=avg(q.id);
    sf(c); const ax=M+qColW+parts.length*dataColW;
    doc.rect(ax,y,dataColW,rowH,"F");
    sc(T.white); doc.setFont("helvetica","bold");
    doc.text(avgVal,ax+dataColW/2,y+6,{align:"center"});
    y+=rowH;
  });

  // border around table
  doc.setDrawColor(...hx(T.gray100));
  doc.setLineWidth(0.3);
  doc.rect(M,y-questions.length*rowH-rowH,tableW,questions.length*rowH+rowH);
  y+=10;

  // ── Board columns
  for(const col of COLUMNS){
    if(y>260){doc.addPage();y=M;}
    const cc=col==="Stop"?"#FF6B6B":col==="Start"?T.teal:T.orange;
    sf(cc); doc.rect(M,y,cW,8,"F");
    sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(11);
    doc.text(col,M+3,y+6); y+=10;

    (room.boardEntries||[]).filter(e=>e.column===col).forEach(e=>{
      if(y>270){doc.addPage();y=M;}
      sc(T.gray500); doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.text((e.participantName||"").slice(0,15)+":",M+3,y+4);
      sc(T.dark); doc.setFont("helvetica","normal");
      const lines=doc.splitTextToSize(e.text||"",cW-42);
      doc.text(lines,M+40,y+4); y+=Math.max(lines.length*5,5)+2;
    });

    const acts=(room.actions?.[col])||[];
    if(acts.length){
      if(y>265){doc.addPage();y=M;}
      sf(T.gray50); doc.rect(M+2,y,cW-4,6,"F");
      sc(T.tealDark); doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.text("Actions:",M+4,y+4); y+=6;
      acts.forEach(a=>{
        if(y>275){doc.addPage();y=M;}
        sc(T.dark); doc.setFont("helvetica","normal"); doc.setFontSize(8);
        const lines=doc.splitTextToSize("• "+(a.text||""),cW-8);
        doc.text(lines,M+6,y+4); y+=lines.length*5+1;
      });
    }
    y+=5;
  }
  doc.save(`retrospective-${room.id}-${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── ScoreRating ──────────────────────────────────────────────────────────────
function ScoreRating({ value, onChange, allow3, scale=5 }) {
  const all=[1,2,3,4,5].slice(0,scale);
  const scores=allow3?all:all.filter(n=>n!==3);
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      {scores.map(n=>(
        <button key={n} onClick={()=>onChange(n)} style={{
          width:44,height:44,borderRadius:10,border:"none",cursor:"pointer",
          fontWeight:800,fontSize:16,
          background:value===n?T.orange:T.gray100,
          color:value===n?T.white:T.gray500,
          boxShadow:value===n?`0 3px 10px ${T.orangeLight}`:"none",
          transform:value===n?"scale(1.12)":"scale(1)",
          transition:"all .15s",
        }}>{n}</button>
      ))}
      {!allow3&&scale>=3&&<span style={{fontSize:11,color:T.gray300,marginLeft:4}}>(3 disabled)</span>}
    </div>
  );
}

// ─── EntryList (input screen) ─────────────────────────────────────────────────
function EntryList({ entries, onAdd, onRemove, color }) {
  const [text,setText]=useState("");
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <input value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&text.trim()){onAdd(text.trim());setText("");}}}
          placeholder="Type and press Enter…"
          style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${color}30`,fontSize:14,outline:"none",color:T.dark}}/>
        <button onClick={()=>{if(text.trim()){onAdd(text.trim());setText("");}}}
          style={{padding:"8px 14px",borderRadius:8,border:"none",background:color,color:T.white,fontWeight:700,fontSize:14,cursor:"pointer"}}>+</button>
      </div>
      {entries.map(e=>(
        <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,background:T.white,borderRadius:8,padding:"7px 10px",marginBottom:6,border:`1.5px solid ${color}20`,fontSize:14,color:T.gray700}}>
          <span style={{flex:1}}>{e.text}</span>
          <button onClick={()=>onRemove(e.id)} style={{background:"none",border:"none",color:T.gray300,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── BoardColumn — multi-select cards, intra-column sort, linked actions ───────
function BoardColumn({ col, entries, onMove, onReorder, onAddAction, actions, selectedCardIds, onToggleCard }) {
  const [over,    setOver]    = useState(false);
  const [overIdx, setOverIdx] = useState(null);
  const [actText, setActText] = useState("");
  const c = COL_COLORS[col];

  // Cards in this column that are selected
  const selectedHere = entries.filter(e => selectedCardIds.has(e.id));
  const hasSelection = selectedHere.length > 0;

  function handleDragOver(e, idx) { e.preventDefault(); setOver(true); setOverIdx(idx); }

  function handleDrop(e) {
    e.preventDefault(); setOver(false);
    const entryId = e.dataTransfer.getData("entryId");
    const fromCol = e.dataTransfer.getData("fromCol");
    const fromIdx = parseInt(e.dataTransfer.getData("fromIdx")||"-1",10);
    if(!entryId) return;
    if(fromCol===col) {
      if(fromIdx>=0 && overIdx!==null && fromIdx!==overIdx) onReorder(col, fromIdx, overIdx);
    } else {
      onMove(entryId, col, overIdx);
    }
    setOverIdx(null);
  }

  function handleAddAction() {
    if(!actText.trim()) return;
    // linked card ids = selected cards IN THIS column
    const linkedIds = selectedHere.map(e=>e.id);
    onAddAction(col, actText.trim(), linkedIds.length>0 ? linkedIds : null);
    setActText("");
  }

  return (
    <div style={{flex:1,minWidth:280,background:T.white,borderRadius:16,boxShadow:`0 4px 20px ${T.teal}15`,overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:c,padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:T.white,fontWeight:800,fontSize:16}}>{col}</span>
        {hasSelection && (
          <span style={{background:"rgba(255,255,255,.3)",color:T.white,borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:700}}>
            {selectedHere.length} selected
          </span>
        )}
        <span style={{marginLeft:"auto",background:"rgba(255,255,255,.25)",color:T.white,borderRadius:20,padding:"2px 10px",fontSize:13,fontWeight:700}}>{entries.length}</span>
      </div>

      {/* Cards */}
      <div onDragOver={e=>handleDragOver(e,entries.length)}
        onDragLeave={()=>{setOver(false);setOverIdx(null);}}
        onDrop={handleDrop}
        style={{minHeight:160,padding:12,background:over?`${c}08`:"transparent",transition:"background .15s"}}>

        {entries.map((entry,idx)=>{
          const isSelected = selectedCardIds.has(entry.id);
          return (
            <div key={entry.id}>
              {over && overIdx===idx && (
                <div style={{height:3,background:c,borderRadius:4,marginBottom:6,opacity:.8}}/>
              )}
              <div draggable
                onDragStart={e=>{
                  e.dataTransfer.setData("entryId",entry.id);
                  e.dataTransfer.setData("fromCol",col);
                  e.dataTransfer.setData("fromIdx",String(idx));
                }}
                onDragOver={e=>handleDragOver(e,idx)}
                onClick={e=>{ e.stopPropagation(); onToggleCard(entry.id); }}
                style={{
                  background: isSelected?`${c}15`:T.offWhite,
                  borderRadius:10, padding:"10px 12px", marginBottom:8,
                  border: isSelected?`2px solid ${c}`:`1.5px solid ${c}18`,
                  cursor:"pointer",fontSize:14,
                  boxShadow: isSelected?`0 0 0 3px ${c}28, 0 3px 10px rgba(0,0,0,.08)`:"0 2px 6px rgba(0,0,0,.04)",
                  transition:"all .15s", userSelect:"none",
                }}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  {/* Checkbox indicator */}
                  <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
                    border:`2px solid ${isSelected?c:T.gray300}`,
                    background:isSelected?c:"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    {isSelected&&<span style={{color:"#fff",fontSize:10,lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{background:c,color:"#fff",borderRadius:10,padding:"1px 8px",fontSize:10,fontWeight:700}}>
                    {entry.participantName}
                  </span>
                </div>
                <div style={{color:T.dark,lineHeight:1.4,paddingLeft:22}}>{entry.text}</div>
              </div>
            </div>
          );
        })}

        {over && overIdx===entries.length && (
          <div style={{height:3,background:c,borderRadius:4,marginTop:2,opacity:.8}}/>
        )}
        {entries.length===0&&!over&&(
          <div style={{textAlign:"center",color:T.gray300,fontSize:13,paddingTop:32,paddingBottom:16}}>Drop items here</div>
        )}
      </div>

      {/* Actions */}
      <div style={{borderTop:`2px solid ${c}30`,padding:12,background:`${c}06`}}>
        <div style={{fontSize:12,fontWeight:800,color:c,letterSpacing:".5px",marginBottom:8}}>⚡ ACTIONS</div>
        {actions.map(a=>{
          // highlight if any of this action's linked cards are selected
          const linkedIds = a.linkedCardIds || (a.linkedCardId ? [a.linkedCardId] : []);
          const isHighlighted = linkedIds.some(id=>selectedCardIds.has(id));
          const linkedEntries = linkedIds.map(id=>entries.find(e=>e.id===id)).filter(Boolean);
          return (
            <div key={a.id} style={{
              background: isHighlighted?`${c}14`:T.white,
              borderRadius:8, padding:"7px 10px", marginBottom:6, fontSize:13,
              color:T.gray700, border: isHighlighted?`1.5px solid ${c}`:`1px solid ${c}15`,
              transition:"all .2s",
            }}>
              <span>• {a.text}</span>
              {linkedEntries.length>0&&(
                <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:4}}>
                  {linkedEntries.map(le=>(
                    <span key={le.id} style={{fontSize:10,color:c,fontWeight:700,background:`${c}18`,borderRadius:6,padding:"1px 7px",display:"flex",alignItems:"center",gap:3}}>
                      🔗 {le.participantName}: {le.text.slice(0,22)}{le.text.length>22?"…":""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Add action */}
        <div style={{marginTop:6}}>
          {hasSelection&&(
            <div style={{fontSize:11,color:c,fontWeight:700,marginBottom:5,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
              <span>🔗</span>
              <span>Will link to:</span>
              {selectedHere.map(e=>(
                <span key={e.id} style={{background:`${c}18`,borderRadius:6,padding:"1px 7px",fontSize:10}}>
                  {e.participantName}: {e.text.slice(0,20)}{e.text.length>20?"…":""}
                </span>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:6}}>
            <input value={actText} onChange={e=>setActText(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleAddAction()}
              placeholder={hasSelection?"Add linked action…":"Add action…"}
              style={{flex:1,padding:"7px 10px",borderRadius:8,fontSize:13,color:T.dark,outline:"none",
                border:`1.5px solid ${hasSelection?c+"90":c+"40"}`,
                background:hasSelection?`${c}08`:T.white}}/>
            <button onClick={handleAddAction}
              style={{padding:"7px 10px",borderRadius:8,border:"none",background:c,color:T.white,cursor:"pointer",fontWeight:700,fontSize:13}}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ScoresSummary ────────────────────────────────────────────────────────────
function ScoresSummary({ participants, questions }) {
  const parts=Object.values(participants||{}).filter(p=>p.submitted);
  const avg=qid=>{ const v=parts.map(p=>p.scores?.[qid]).filter(Boolean); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):"-"; };
  const colors=["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];

  return (
    <div>
      {/* Score cards — full label, always readable */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        {questions.map((q,i)=>(
          <div key={q.id} style={{flex:"1 1 140px",background:T.white,borderRadius:14,padding:"14px 16px",
            boxShadow:`0 3px 14px ${colors[i%colors.length]}20`,borderTop:`4px solid ${colors[i%colors.length]}`}}>
            <div style={{fontSize:11,color:T.gray500,fontWeight:600,marginBottom:6,lineHeight:1.4}}>{q.label}</div>
            <div style={{fontSize:30,fontWeight:900,color:colors[i%colors.length]}}>{avg(q.id)}</div>
            <div style={{fontSize:11,color:T.gray300,marginTop:2}}>avg / {q.scale||5}</div>
          </div>
        ))}
      </div>

      {/* Table: rows = questions, cols = participants + avg
          This way question labels are always fully visible in the first column */}
      <div style={{borderRadius:14,overflow:"hidden",boxShadow:`0 3px 14px ${T.teal}15`,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
          <thead>
            <tr style={{background:T.teal}}>
              <th style={{padding:"10px 16px",textAlign:"left",color:T.white,fontWeight:700,fontSize:13,whiteSpace:"nowrap",minWidth:180}}>
                Question
              </th>
              {parts.map(p=>(
                <th key={p.name} style={{padding:"10px 8px",textAlign:"center",color:T.white,fontWeight:700,fontSize:12,minWidth:60,whiteSpace:"nowrap"}}>
                  {p.name}
                </th>
              ))}
              <th style={{padding:"10px 8px",textAlign:"center",color:T.white,fontWeight:800,fontSize:12,minWidth:60,background:"rgba(0,0,0,.15)",whiteSpace:"nowrap"}}>
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q,qi)=>{
              const c=colors[qi%colors.length];
              return(
                <tr key={q.id} style={{background:qi%2===0?T.offWhite:T.white}}>
                  <td style={{padding:"10px 16px",fontWeight:600,color:T.dark,fontSize:13,borderLeft:`4px solid ${c}`}}>
                    {q.label}
                  </td>
                  {parts.map(p=>(
                    <td key={p.name} style={{padding:"10px 8px",textAlign:"center"}}>
                      <span style={{background:c,color:T.white,borderRadius:8,padding:"3px 10px",fontWeight:800,fontSize:14,display:"inline-block"}}>
                        {p.scores?.[q.id]??"-"}
                      </span>
                    </td>
                  ))}
                  <td style={{padding:"10px 8px",textAlign:"center",background:`${c}15`}}>
                    <span style={{background:c,color:T.white,borderRadius:8,padding:"3px 10px",fontWeight:900,fontSize:14,display:"inline-block"}}>
                      {avg(q.id)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SetupScreen (host configures questions before creating room) ──────────────
function SetupScreen({ hostName, onBack, onCreate }) {
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS.map(q=>({...q})));
  const [allow3, setAllow3]       = useState(false);

  function updateQ(idx, field, val) {
    setQuestions(qs=>qs.map((q,i)=>i===idx?{...q,[field]:val}:q));
  }
  function addQuestion() {
    if(questions.length>=5) return;
    setQuestions(qs=>[...qs,{id:`q${uid()}`,label:"New question",low:"Low",high:"High",scale:5}]);
  }
  function removeQuestion(idx) {
    if(questions.length<=1) return;
    setQuestions(qs=>qs.filter((_,i)=>i!==idx));
  }

  const inp={padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,color:T.dark,outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"24px 16px"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.teal,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
          ← Back
        </button>
        <div style={{background:T.white,borderRadius:20,padding:28,boxShadow:`0 6px 32px ${T.teal}15`,marginBottom:16}}>
          <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:900,color:T.tealDark}}>⚙️ Configure Retrospective</h2>
          <p style={{margin:"0 0 24px",color:T.gray500,fontSize:14}}>Hosting as <strong>{hostName}</strong></p>

          {/* Questions */}
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:14,color:T.dark,marginBottom:12}}>📊 Questions ({questions.length}/5)</div>
            {questions.map((q,idx)=>(
              <div key={q.id} style={{background:T.gray50,borderRadius:12,padding:14,marginBottom:10,border:`1.5px solid ${T.gray100}`}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <span style={{background:T.teal,color:"#fff",borderRadius:8,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{idx+1}</span>
                  <input value={q.label} onChange={e=>updateQ(idx,"label",e.target.value)}
                    style={{...inp,fontWeight:700,fontSize:14,flex:1}}/>
                  {questions.length>1&&(
                    <button onClick={()=>removeQuestion(idx)}
                      style={{background:"none",border:"none",color:T.gray300,cursor:"pointer",fontSize:20,lineHeight:1,padding:"0 4px"}}>×</button>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:T.gray500,marginBottom:3}}>Low label</div>
                    <input value={q.low} onChange={e=>updateQ(idx,"low",e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:T.gray500,marginBottom:3}}>High label</div>
                    <input value={q.high} onChange={e=>updateQ(idx,"high",e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:T.gray500,marginBottom:3}}>Scale</div>
                    <select value={q.scale||5} onChange={e=>updateQ(idx,"scale",parseInt(e.target.value))}
                      style={{...inp,width:70}}>
                      {[3,4,5].map(n=><option key={n} value={n}>1–{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {questions.length<5&&(
              <button onClick={addQuestion}
                style={{width:"100%",padding:"10px",borderRadius:10,border:`2px dashed ${T.gray100}`,background:"none",color:T.gray500,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                + Add Question (max 5)
              </button>
            )}
          </div>

          {/* Allow 3 toggle */}
          <div style={{borderTop:`1.5px solid ${T.gray100}`,paddingTop:18,marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:14,color:T.dark,marginBottom:12}}>⚙️ Scoring Options</div>
            <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:"12px 14px",background:T.gray50,borderRadius:10,border:`1.5px solid ${T.gray100}`}}>
              <div onClick={()=>setAllow3(v=>!v)}
                style={{width:42,height:24,borderRadius:12,position:"relative",cursor:"pointer",flexShrink:0,background:allow3?T.teal:T.gray100,transition:"background .2s"}}>
                <div style={{position:"absolute",top:3,left:allow3?21:3,width:18,height:18,borderRadius:"50%",background:T.white,boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s"}}/>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:T.dark}}>Allow score 3</div>
                <div style={{fontSize:11,color:T.gray500}}>By default 3 is disabled to avoid middle-ground answers</div>
              </div>
            </label>
          </div>

          <button onClick={()=>onCreate(questions,allow3)}
            style={{width:"100%",background:T.orange,color:T.white,border:"none",borderRadius:14,padding:"14px 0",fontWeight:700,fontSize:16,cursor:"pointer"}}>
            🚀 Create Session & Get Link →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
function HomeScreen({ onSetup, onJoin }) {
  const [hostName, setHostName] = useState("");
  const [joinId,   setJoinId]   = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [howOpen,  setHowOpen]  = useState(false);
  const [error,    setError]    = useState("");
  const MAX=15;
  const inp={width:"100%",padding:"12px 16px",borderRadius:12,border:`1.5px solid #DDE8E8`,fontSize:15,color:T.dark,outline:"none",boxSizing:"border-box",background:T.white};
  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px 16px"}}>
      <div style={{width:"100%",maxWidth:540,background:T.white,borderRadius:24,boxShadow:"0 8px 48px rgba(13,158,158,.13)",padding:"36px 32px",border:`1.5px solid ${T.tealLight}40`}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:50,marginBottom:8}}>🔄</div>
          <h1 style={{fontSize:30,fontWeight:900,color:"#1a2e2e",margin:"0 0 4px",letterSpacing:"-.5px"}}>RetroBoard</h1>
          <p style={{color:"#7a9a9a",margin:0,fontSize:14}}>Real-time retrospectives for agile teams</p>
        </div>

        {/* Quick Start */}
        <div style={{background:"#E8F8F5",borderRadius:16,padding:"20px 20px 22px",border:`1.5px solid ${T.tealLight}60`,marginBottom:10}}>
          <div style={{fontWeight:800,fontSize:15,color:T.tealDark,marginBottom:3}}>⚡ Quick Start</div>
          <div style={{color:"#7a9a9a",fontSize:13,marginBottom:14}}>Create instantly, share link, start your retro.</div>
          <div style={{position:"relative"}}>
            <input style={inp} placeholder="Your name (as host)" value={hostName} maxLength={MAX}
              onChange={e=>{setHostName(e.target.value.slice(0,MAX));setError("");}} autoFocus/>
            <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:hostName.length>=MAX?"#F07030":T.gray300}}>
              {hostName.length}/{MAX}
            </span>
          </div>
          {error&&!joinOpen&&<div style={{color:T.orange,fontSize:13,marginTop:8}}>{error}</div>}
          <button onClick={()=>{if(!hostName.trim()){setError("Please enter your name");return;}onSetup(hostName.trim());}}
            style={{marginTop:12,width:"100%",background:"#E8A870",color:T.white,border:"none",borderRadius:14,padding:"13px 0",fontWeight:700,fontSize:15,cursor:"pointer"}}>
            Configure & Create Session →
          </button>
        </div>

        {/* Join */}
        <div style={{border:`1.5px solid ${T.gray100}`,borderRadius:16,overflow:"hidden",marginBottom:10}}>
          <button onClick={()=>setJoinOpen(o=>!o)}
            style={{width:"100%",background:T.white,border:"none",padding:"14px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontWeight:700,fontSize:14,color:"#2a5a5a"}}>
            <span>👥</span><span>Join with Room ID</span>
            <span style={{marginLeft:"auto",color:T.gray300,fontSize:18,display:"inline-block",transform:joinOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>›</span>
          </button>
          {joinOpen&&(
            <div style={{padding:"0 20px 18px",borderTop:`1px solid ${T.gray100}`,background:"#fafefe"}}>
              <input style={{...inp,marginTop:14,marginBottom:8}} placeholder="Room ID or paste link" value={joinId} onChange={e=>setJoinId(e.target.value)}/>
              <div style={{position:"relative",marginBottom:10}}>
                <input style={inp} placeholder="Your name" value={joinName} maxLength={MAX}
                  onChange={e=>{setJoinName(e.target.value.slice(0,MAX));setError("");}}
                  onKeyDown={e=>{if(e.key==="Enter")onJoin(joinId,joinName,setError);}}/>
                <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:joinName.length>=MAX?"#F07030":T.gray300}}>
                  {joinName.length}/{MAX}
                </span>
              </div>
              {error&&joinOpen&&<div style={{color:T.orange,fontSize:13,marginBottom:8}}>{error}</div>}
              <button onClick={()=>onJoin(joinId,joinName,setError)}
                style={{width:"100%",background:T.teal,color:T.white,border:"none",borderRadius:14,padding:"13px 0",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                🔗 Join Session
              </button>
            </div>
          )}
        </div>

        {/* How does this work */}
        <div style={{border:`1.5px solid ${T.gray100}`,borderRadius:16,overflow:"hidden"}}>
          <button onClick={()=>setHowOpen(o=>!o)}
            style={{width:"100%",background:T.white,border:"none",padding:"14px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontWeight:600,fontSize:14,color:"#2a5a5a"}}>
            <span style={{color:"#e05050",fontWeight:900}}>?</span>
            <span>How does this work?</span>
            <span style={{marginLeft:"auto",color:T.gray300,fontSize:18,display:"inline-block",transform:howOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>›</span>
          </button>
          {howOpen&&(
            <div style={{padding:"4px 20px 16px",borderTop:`1px solid ${T.gray100}`,background:"#fafefe"}}>
              {[
                ["🚀","Create a session","Enter your name, configure your questions and scoring options, then get a shareable link."],
                ["🔗","Share the link","Send the link to your team. Everyone just opens it and enters their name — no account needed."],
                ["✍️","Fill in your retro","Rate each team health question and add items under Stop, Start, and Continue."],
                ["✅","Submit & wait","Once submitted, your answers are locked. Nobody sees anyone else's input until the host reveals."],
                ["🎉","Reveal & discuss","The host clicks Reveal — all scores, averages, and cards appear simultaneously for everyone."],
                ["↕️↔️","Drag & drop cards","Drag cards between Stop / Start / Continue columns, or drag them up and down to reorder within a column."],
                ["☑️","Select multiple cards","Click any card to select it (checkbox appears). Click multiple cards to build a selection — click again to deselect."],
                ["🔗","Link actions to cards","With one or more cards selected, type an action and press +. The action gets linked to all selected cards. When you click a card later, its linked actions are highlighted."],
                ["📥","Export PDF","Download a full PDF summary with team scores, all cards, and every action item."],
              ].map(([icon,title,desc])=>(
                <div key={title} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:`1px solid ${T.gray50}`}}>
                  <div style={{fontSize:15,width:28,flexShrink:0,marginTop:2}}>{icon}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:"#2a5a5a"}}>{title}</div>
                    <div style={{fontSize:12,color:"#7a9a9a",marginTop:2,lineHeight:1.5}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{marginTop:18,color:"#7a9a9a",fontSize:13}}>
        Built by <span style={{color:T.teal,fontWeight:700}}>Hakan</span>
      </div>
    </div>
  );
}

// ─── JoinScreen ───────────────────────────────────────────────────────────────
function JoinScreen({ onJoin, roomId }) {
  const [name,setName]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [isRevealed,setIsRevealed]=useState(null);
  const MAX=15;

  // Check if room is already revealed to show appropriate message
  useEffect(()=>{
    if(!roomId) return;
    fbGet(roomId).then(r=>{ if(r) setIsRevealed(!!r.revealed); });
  },[roomId]);

  async function handleClick(){
    setLoading(true);
    await onJoin(name, setError);
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:460,background:"#fff",borderRadius:24,boxShadow:"0 8px 48px rgba(13,158,158,.12)",padding:"36px 32px"}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{fontSize:46,marginBottom:8}}>{isRevealed?"🎉":"🔄"}</div>
          <h1 style={{fontSize:24,fontWeight:900,color:"#1a2e2e",margin:"0 0 4px"}}>
            {isRevealed?"View Results":"You're invited!"}
          </h1>
          <p style={{color:"#7a9a9a",margin:0,fontSize:14}}>
            {isRevealed
              ? "This retrospective has ended. Enter your name to view the results."
              : "Enter your name to join this retrospective."}
          </p>
        </div>
        {isRevealed&&(
          <div style={{background:"#E6F7F7",border:"1.5px solid #7FDADA",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:T.tealDark,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
            👁️ Read-only — the session is complete, results are visible to everyone.
          </div>
        )}
        <div style={{position:"relative"}}>
          <input value={name} onChange={e=>{setName(e.target.value.slice(0,MAX));setError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleClick()}
            placeholder="Your name" autoFocus maxLength={MAX}
            style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1.5px solid #DDE8E8",fontSize:15,color:"#0A2020",outline:"none",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:name.length>=MAX?"#F07030":T.gray300}}>
            {name.length}/{MAX}
          </span>
        </div>
        {error&&<div style={{color:"#F07030",fontSize:13,marginTop:6}}>{error}</div>}
        <button onClick={handleClick} disabled={loading}
          style={{marginTop:14,width:"100%",background:isRevealed?T.teal:"#F07030",color:"#fff",border:"none",borderRadius:14,padding:"14px 0",fontWeight:700,fontSize:15,cursor:"pointer",opacity:loading?.7:1}}>
          {loading?"Loading…": isRevealed?"👁️ View Results →":"Join Retrospective →"}
        </button>
      </div>
      <div style={{marginTop:18,color:"#7a9a9a",fontSize:13}}>
        Built by <span style={{color:T.teal,fontWeight:700}}>Hakan</span>
      </div>
    </div>
  );
}

// ─── SubmitButton ─────────────────────────────────────────────────────────────
function SubmitButton({ allScored, onSubmit, alreadySubmitted }) {
  const [error,setError]=useState("");
  return (
    <div>
      {error&&<div style={{color:"#F07030",fontWeight:600,marginBottom:10,textAlign:"center",fontSize:14}}>{error}</div>}
      <button onClick={()=>onSubmit(setError)}
        style={{width:"100%",background:alreadySubmitted?"#0D9E9E":"#F07030",color:"#fff",border:"none",borderRadius:14,padding:"15px 0",fontWeight:700,fontSize:16,cursor:allScored?"pointer":"default",opacity:allScored?1:.5,transition:"all .2s"}}
        disabled={!allScored}>
        {alreadySubmitted?"🔄 Update My Answers":"✅ Submit My Answers"}
      </button>
      {!allScored&&<div style={{textAlign:"center",color:"#9BB8B8",fontSize:12,marginTop:6}}>Rate all questions to submit</div>}
      {alreadySubmitted&&allScored&&<div style={{textAlign:"center",color:T.teal,fontSize:12,marginTop:6}}>You've already submitted — click to update your answers</div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view,       setView]       = useState("home");
  const [room,       setRoom]       = useState(null);
  const [roomId,     setRoomId]     = useState(null);
  const [myId,       setMyId]       = useState(null);
  const [myName,     setMyName]     = useState("");
  const [isHost,     setIsHost]     = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [scores,     setScores]     = useState({});
  const [entries,    setEntries]    = useState({ Stop:[], Start:[], Continue:[] });
  const [setupName,      setSetupName]      = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState(new Set()); // multi-select
  const unsubRef = useRef(null);

  // ── URL hash ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const hash=window.location.hash.replace("#","");
    if(hash.startsWith("retro-")){ setRoomId(hash.replace("retro-","")); setView("join"); }
  },[]);

  // ── Realtime listener ───────────────────────────────────────────────────────
  function listenRoom(id){
    if(unsubRef.current) unsubRef.current();
    const r=roomRef(id);
    const handler=snap=>{ if(snap.exists()) setRoom(snap.val()); };
    onValue(r,handler);
    unsubRef.current=()=>off(r,"value",handler);
  }
  useEffect(()=>()=>{ if(unsubRef.current) unsubRef.current(); },[]);

  useEffect(()=>{
    if(room?.revealed&&(view==="waiting"||view==="input")) setView("board");
  },[room?.revealed]);

  // ── Go to setup screen ──────────────────────────────────────────────────────
  function goSetup(name){ setSetupName(name); setView("setup"); }

  // ── Create room after setup ─────────────────────────────────────────────────
  async function handleCreate(questions, allow3){
    const id=uid(), pid=uid();
    const initScores={};
    questions.forEach(q=>{ initScores[q.id]=0; });
    const r={
      id, createdAt:nowISO(), hostName:setupName, revealed:false,
      allow3:!!allow3, questions,
      participants:{}, boardEntries:[],
      actions:{ Stop:[], Start:[], Continue:[] },
    };
    r.participants[pid]={ name:setupName, scores:{}, entries:{Stop:[],Start:[],Continue:[]}, submitted:false, joinedAt:nowISO() };
    await fbSet(id,r);
    setRoomId(id); setMyId(pid); setMyName(setupName);
    setIsHost(true); setRoom(r);
    setScores(initScores);
    window.location.hash=`retro-${id}`;
    listenRoom(id); setView("input");
  }

  // ── Join room ───────────────────────────────────────────────────────────────
  async function handleJoin(rawId, name, setError){
    if(!name.trim()){setError("Please enter your name");return;}
    const id=(rawId||"").trim().replace(/.*#retro-/,"").replace("retro-","")||roomId;
    if(!id){setError("Enter a valid room ID");return;}
    const r=await fbGet(id);
    if(!r){setError("Room not found. Check the ID.");return;}

    // If already revealed — join as viewer, no write needed
    if(r.revealed){
      const pid=uid();
      setRoomId(id);setMyId(pid);setMyName(name.trim());setIsHost(false);setRoom(r);
      window.location.hash=`retro-${id}`;
      listenRoom(id);setView("board");
      return;
    }

    const pid=uid();
    const initScores={};
    (r.questions||DEFAULT_QUESTIONS).forEach(q=>{ initScores[q.id]=0; });
    const updated={...r,participants:{...(r.participants||{}),[pid]:{name:name.trim(),scores:{},entries:{Stop:[],Start:[],Continue:[]},submitted:false,joinedAt:nowISO()}}};
    await fbSet(id,updated);
    setRoomId(id);setMyId(pid);setMyName(name.trim());setIsHost(false);setRoom(updated);
    setScores(initScores);
    window.location.hash=`retro-${id}`;
    listenRoom(id);setView("input");
  }

  async function handleJoinFromLink(name,setError){ await handleJoin(roomId,name,setError); }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submitAnswers(setError){
    const questions=room?.questions||DEFAULT_QUESTIONS;
    const allScored=questions.every(q=>scores[q.id]>0);
    if(!allScored){setError("Please rate all questions");return;}
    const patch={};
    patch[`participants/${myId}/scores`]=scores;
    patch[`participants/${myId}/entries`]=entries;
    patch[`participants/${myId}/submitted`]=true;
    await update(roomRef(roomId),patch);
    setView("waiting");
  }

  // ── Reveal ──────────────────────────────────────────────────────────────────
  async function revealResults(){
    const r=await fbGet(roomId);
    const boardEntries=[];
    Object.entries(r.participants||{}).forEach(([pid,p])=>{
      Object.entries(p.entries||{}).forEach(([col,list])=>{
        (list||[]).forEach((e,idx)=>boardEntries.push({id:uid(),participantId:pid,participantName:p.name,text:e.text,column:col,order:idx}));
      });
    });
    await update(roomRef(roomId),{revealed:true,boardEntries});
  }

  // ── Move card between columns ───────────────────────────────────────────────
  async function moveEntry(entryId, newCol, atIdx){
    const r=await fbGet(roomId);
    let entries=[...(r.boardEntries||[])];
    const entry=entries.find(e=>e.id===entryId);
    if(!entry) return;
    entries=entries.filter(e=>e.id!==entryId);
    const colEntries=entries.filter(e=>e.column===newCol);
    const others=entries.filter(e=>e.column!==newCol);
    const insertAt=atIdx!=null?Math.min(atIdx,colEntries.length):colEntries.length;
    colEntries.splice(insertAt,0,{...entry,column:newCol});
    const updated=[...others,...colEntries];
    await update(roomRef(roomId),{boardEntries:updated});
  }

  // ── Reorder within column ───────────────────────────────────────────────────
  async function reorderEntry(col, fromIdx, toIdx){
    const r=await fbGet(roomId);
    const all=[...(r.boardEntries||[])];
    const colEntries=all.filter(e=>e.column===col);
    const others=all.filter(e=>e.column!==col);
    const [moved]=colEntries.splice(fromIdx,1);
    colEntries.splice(toIdx,0,moved);
    await update(roomRef(roomId),{boardEntries:[...others,...colEntries]});
  }

  // ── Add action (linked to zero or more cards) ────────────────────────────────
  async function addAction(col, text, linkedCardIds){
    const r=await fbGet(roomId);
    const acts=[...(r.actions?.[col]||[]),{id:uid(),text,linkedCardIds:linkedCardIds||[]}];
    await update(roomRef(roomId),{[`actions/${col}`]:acts});
  }

  // ── Copy link ───────────────────────────────────────────────────────────────
  function copyLink(){
    const url=`${window.location.origin}${window.location.pathname}#retro-${roomId}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  }

  function addEntry(col,text){setEntries(p=>({...p,[col]:[...p[col],{id:uid(),text}]}));}
  function removeEntry(col,id){setEntries(p=>({...p,[col]:p[col].filter(e=>e.id!==id)}));}

  const base={minHeight:"100vh",background:"#E8F8F5",fontFamily:"'Segoe UI',system-ui,sans-serif",color:T.dark};
  const card=(ex={})=>({background:T.white,borderRadius:20,padding:28,boxShadow:`0 6px 32px ${T.teal}15`,...ex});
  const btn=(bg,color=T.white,ex={})=>({background:bg,color,border:"none",borderRadius:12,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",...ex});

  // ── Views ────────────────────────────────────────────────────────────────────
  if(view==="home")  return <HomeScreen onSetup={goSetup} onJoin={handleJoin}/>;
  if(view==="setup") return <SetupScreen hostName={setupName} onBack={()=>setView("home")} onCreate={handleCreate}/>;
  if(view==="join")  return <JoinScreen onJoin={handleJoinFromLink} roomId={roomId}/>;

  if(view==="input"){
    const questions=room?.questions||DEFAULT_QUESTIONS;
    const allow3=room?.allow3??false;
    const allScored=questions.every(q=>scores[q.id]>0);
    return(
      <div style={base}>
        <div style={{maxWidth:820,margin:"0 auto",padding:"20px 16px 60px"}}>
          {/* Topbar */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,background:T.white,borderRadius:16,padding:"12px 20px",boxShadow:`0 3px 14px ${T.teal}12`}}>
            <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.teal},${T.tealDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🔄</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:T.tealDark}}>RetroBoard</div>
              <div style={{fontSize:11,color:T.gray300}}>Room: {roomId}</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              {isHost&&<button onClick={copyLink} style={{...btn(T.gray100,T.gray500,{fontSize:12,padding:"7px 12px"})}}>{copied?"✅ Copied!":"🔗 Copy Link"}</button>}
              <div style={{background:T.tealBg,borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,color:T.tealDark}}>👤 {myName}</div>
            </div>
          </div>

          {/* Participant status */}
          {room&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
              {Object.values(room.participants||{}).map(p=>(
                <div key={p.name} style={{borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:600,background:p.submitted?T.teal:T.gray50,color:p.submitted?T.white:T.gray700,border:`1.5px solid ${p.submitted?T.teal:T.gray100}`}}>
                  {p.submitted?"✓ ":"○ "}{p.name}
                </div>
              ))}
            </div>
          )}

          {/* Score questions */}
          <div style={card({marginBottom:18})}>
            <h2 style={{fontSize:17,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:18}}>📊 Rate Your Team Experience</h2>
            {questions.map(q=>(
              <div key={q.id} style={{marginBottom:20}}>
                <div style={{fontWeight:700,color:T.dark,marginBottom:6,fontSize:14}}>{q.label}</div>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:T.gray500}}>1 – {q.low}</span>
                  <ScoreRating value={scores[q.id]||0} onChange={v=>setScores(s=>({...s,[q.id]:v}))} allow3={allow3} scale={q.scale||5}/>
                  <span style={{fontSize:12,color:T.gray500}}>{q.scale||5} – {q.high}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stop / Start / Continue */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:20}}>
            {COLUMNS.map(col=>{
              const c=COL_COLORS[col];
              const hints={
                Stop:  {icon:"🛑", desc:"What is slowing us down or causing frustration? What should we stop doing?"},
                Start: {icon:"🚀", desc:"What should we try that we're not doing yet? New ideas or practices to introduce."},
                Continue:{icon:"✅", desc:"What is working well and should continue? Things we're doing right."},
              }[col];
              return(
                <div key={col} style={card({padding:18})}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{fontSize:18}}>{hints.icon}</span>
                    <h3 style={{margin:0,fontSize:15,fontWeight:800,color:c}}>{col}</h3>
                  </div>
                  <div style={{fontSize:12,color:T.gray500,marginBottom:12,lineHeight:1.5,borderLeft:`3px solid ${c}40`,paddingLeft:8}}>{hints.desc}</div>
                  <EntryList entries={entries[col]} onAdd={t=>addEntry(col,t)} onRemove={id=>removeEntry(col,id)} color={c}/>
                </div>
              );
            })}
          </div>
          <SubmitButton allScored={allScored} onSubmit={submitAnswers} alreadySubmitted={room?.participants?.[myId]?.submitted||false}/>
        </div>
      </div>
    );
  }

  if(view==="waiting"){
    const parts=Object.values(room?.participants||{});
    const done=parts.filter(p=>p.submitted).length;
    const total=parts.length;
    const allDone=done===total&&total>0;
    return(
      <div style={base}>
        <div style={{maxWidth:520,margin:"0 auto",padding:"50px 16px",textAlign:"center"}}>
          <div style={{fontSize:60,marginBottom:14}}>⏳</div>
          <h1 style={{fontSize:26,fontWeight:900,color:T.tealDark,margin:"0 0 6px"}}>Waiting for everyone…</h1>
          <p style={{color:T.gray500,marginBottom:28}}>{done} of {total} submitted</p>
          <div style={card({padding:22,textAlign:"left"})}>
            {parts.map(p=>(
              <div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${T.gray100}`}}>
                <div style={{width:30,height:30,borderRadius:8,background:p.submitted?T.teal:T.gray100,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:p.submitted?T.white:T.gray300}}>
                  {p.submitted?"✓":"○"}
                </div>
                <span style={{fontWeight:600,fontSize:14,color:p.submitted?T.tealDark:T.gray500}}>{p.name}</span>
                <span style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:p.submitted?T.teal:T.gray300}}>{p.submitted?"Submitted":"In progress…"}</span>
              </div>
            ))}
          </div>
          {isHost&&(
            <button onClick={revealResults}
              style={{marginTop:20,width:"100%",background:allDone?T.orange:T.gray300,color:T.white,border:"none",borderRadius:14,padding:"14px 0",fontWeight:700,fontSize:15,cursor:allDone?"pointer":"default",opacity:allDone?1:.7}}
              disabled={!allDone}>
              {allDone?"🎉 Reveal Results!":`Waiting for ${total-done} more…`}
            </button>
          )}
          {!isHost&&<p style={{color:T.gray300,marginTop:18,fontSize:13}}>The host will reveal results when everyone is done.</p>}
          {/* Edit answers button — always visible before reveal */}
          <button onClick={()=>setView("input")}
            style={{marginTop:12,width:"100%",background:"none",color:T.gray500,border:`1.5px solid ${T.gray100}`,borderRadius:14,padding:"11px 0",fontWeight:600,fontSize:14,cursor:"pointer"}}>
            ✏️ Edit My Answers
          </button>
        </div>
      </div>
    );
  }

  if(view==="board"&&room){
    const boardEntries=room.boardEntries||[];
    const questions=room.questions||DEFAULT_QUESTIONS;
    const selCount=selectedCardIds.size;

    function toggleCard(id){
      setSelectedCardIds(prev=>{
        const next=new Set(prev);
        next.has(id)?next.delete(id):next.add(id);
        return next;
      });
    }

    return(
      <div style={base}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"14px 24px",display:"flex",alignItems:"center",gap:14,boxShadow:`0 4px 20px ${T.teal}40`}}>
          <div style={{fontSize:26}}>🔄</div>
          <div>
            <div style={{color:T.white,fontWeight:900,fontSize:19}}>RetroBoard Results</div>
            <div style={{color:T.tealLight,fontSize:12}}>Room {room.id} · {Object.values(room.participants||{}).filter(p=>p.submitted).length} participants</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            {selCount>0&&(
              <>
                <div style={{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"6px 12px",fontSize:12,color:T.white,fontWeight:600}}>
                  ☑️ {selCount} card{selCount>1?"s":""} selected — actions will be linked
                </div>
                <button onClick={()=>setSelectedCardIds(new Set())}
                  style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                  ✕ Clear
                </button>
              </>
            )}
            <button onClick={()=>exportPDF(room)}
              style={{background:T.orange,color:T.white,border:"none",borderRadius:12,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              📥 Download PDF
            </button>
          </div>
        </div>

        <div style={{maxWidth:1300,margin:"0 auto",padding:"22px 16px 60px"}}>
          {/* Scores */}
          <div style={card({marginBottom:24})}>
            <h2 style={{fontSize:17,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:16}}>📊 Team Scores</h2>
            <ScoresSummary participants={room.participants||{}} questions={questions}/>
          </div>

          {/* Board hint */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <h2 style={{fontSize:17,fontWeight:800,color:T.tealDark,margin:0}}>🗂 Team Board</h2>
            <div style={{fontSize:12,color:T.gray500,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>↔️ Drag between columns</span>
              <span>↕️ Drag to reorder</span>
              <span>☑️ Click to select cards</span>
              <span>🔗 Add action while cards selected = linked</span>
            </div>
          </div>

          <div style={{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
            {COLUMNS.map(col=>(
              <BoardColumn key={col} col={col}
                entries={boardEntries.filter(e=>e.column===col)}
                onMove={moveEntry}
                onReorder={reorderEntry}
                onAddAction={addAction}
                actions={room.actions?.[col]||[]}
                selectedCardIds={selectedCardIds}
                onToggleCard={toggleCard}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <div style={base}><div style={{padding:40,textAlign:"center",color:T.gray500}}>Loading…</div></div>;
}
