import { useState, useEffect, useRef } from "react";
import { onValue, off, update } from "firebase/database";
import { uid, nowISO, roomRef, fbGet, fbSet, signInWithGoogle, signOutUser, onAuth, getAllTeams, registerUser } from "./firebase.js";
import AdminPanel from "./Admin.jsx";

const VERSION = "v5";

const T = {
  teal:"#0D9E9E", tealDark:"#076F6F", tealLight:"#7FDADA", tealBg:"#E6F7F7",
  orange:"#F07030", orangeLight:"#FAB080",
  white:"#FFFFFF", offWhite:"#F8FAFA",
  gray50:"#F0F4F4", gray100:"#DDE8E8", gray300:"#9BB8B8",
  gray500:"#5A7878", gray700:"#2D4A4A", dark:"#0A2020",
};

const COL_COLORS = { Stop:"#FF6B6B", Start:"#34D399", Continue:"#60A5FA" };
const COL_BG     = { Stop:"#FFF5F5", Start:"#F0FFF8", Continue:"#EFF6FF" };
const COLUMNS    = ["Stop","Start","Continue"];
const REACTIONS  = ["👍","👎","❤️","🔥","💡"];

const COL_DESC = {
  Stop:     "What's hurting the team? What should we stop doing?",
  Start:    "What should we try that we're not doing yet?",
  Continue: "What's working well and should keep going?",
};

const DEFAULT_QUESTIONS = [
  { id:"q1", label:"How is your Mood Level?",          low:"😞 Unhappy", high:"😄 Happy", scale:5 },
  { id:"q2", label:"Where are you stress wise now?",   low:"😌 Low",     high:"😰 High",  scale:5 },
  { id:"q3", label:"How do you feel about your role?", low:"😞 Unhappy", high:"😄 Happy", scale:5 },
];

function totalReactions(card) {
  return Object.values(card.reactions||{}).reduce((s,v)=>s+Object.keys(v||{}).length,0);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPDF(room) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const W=210, M=12, cW=W-M*2; let y=M;
  const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const sf=c=>doc.setFillColor(...hx(c));
  const sc=c=>doc.setTextColor(...hx(c));
  const sd=c=>doc.setDrawColor(...hx(c));
  const qColors=["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];

  // ── Header ────────────────────────────────────────────────────────────────────
  sf(T.teal); doc.rect(0,0,W,28,"F");
  sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(20);
  doc.text("Retrospective Results",M,13);
  doc.setFontSize(8); doc.setFont("helvetica","normal");
  doc.text(`RetroBoard ${VERSION} · ${new Date().toLocaleString()} · Room: ${room.id}${room.sessionName?" · "+room.sessionName:""}${room.teamName?" · "+room.teamName:""}`,M,22);
  y=36;

  // ── Scores table ──────────────────────────────────────────────────────────────
  const parts=Object.values(room.participants||{}).filter(p=>p.submitted);
  const questions=room.questions||DEFAULT_QUESTIONS;
  const avg=qid=>{ const v=parts.map(p=>p.scores?.[qid]).filter(Boolean); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):"-"; };

  sc(T.tealDark); doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Team Scores",M,y); y+=6;

  const qColW=55, dataColW=Math.min(20,Math.floor((cW-qColW)/(parts.length+1)));
  const tableW=qColW+(parts.length+1)*dataColW, rowH=8;
  sf(T.teal); doc.rect(M,y,tableW,rowH,"F");
  sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(7);
  doc.text("Question",M+2,y+5.5);
  parts.forEach((p,i)=>{ doc.text((p.name||"").slice(0,9),M+qColW+i*dataColW+dataColW/2,y+5.5,{align:"center"}); });
  const avgX=M+qColW+parts.length*dataColW;
  sf("#076F6F"); doc.rect(avgX,y,dataColW,rowH,"F");
  sc(T.white); doc.text("Avg",avgX+dataColW/2,y+5.5,{align:"center"}); y+=rowH;

  questions.forEach((q,qi)=>{
    const c=qColors[qi%qColors.length];
    qi%2===0?sf(T.offWhite):sf(T.white); doc.rect(M,y,tableW,rowH,"F");
    sf(c); doc.rect(M,y,3,rowH,"F");
    sc(T.dark); doc.setFont("helvetica","bold"); doc.setFontSize(7);
    doc.text(q.label.slice(0,30)+(q.label.length>30?"…":""),M+5,y+5.5);
    doc.setFont("helvetica","normal");
    parts.forEach((p,i)=>{ sc(T.dark); doc.text(String(p.scores?.[q.id]??"-"),M+qColW+i*dataColW+dataColW/2,y+5.5,{align:"center"}); });
    sf(c); doc.rect(avgX,y,dataColW,rowH,"F");
    sc(T.white); doc.setFont("helvetica","bold"); doc.text(avg(q.id),avgX+dataColW/2,y+5.5,{align:"center"});
    y+=rowH;
  });
  y+=12;

  // ── Post-it Board ─────────────────────────────────────────────────────────────
  sc(T.tealDark); doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Team Board",M,y); y+=8;

  // Post-it card dimensions
  const CARD_W=54, CARD_H_BASE=28, COLS_PER_ROW=3, GAP=5;
  const colColors={ Stop:"#FF6B6B", Start:"#34D399", Continue:"#60A5FA" };
  const colBgHex={ Stop:"#FFF5F5", Start:"#F0FFF8", Continue:"#EFF6FF" };

  for(const col of COLUMNS){
    const colCards=[...(room.boardEntries||[])].filter(c=>c.column===col)
      .sort((a,b)=>totalReactions(b)-totalReactions(a));
    if(!colCards.length) continue;

    // Column header bar
    if(y>260){doc.addPage();y=M;}
    const cc=colColors[col];
    sf(cc); doc.rect(M,y,cW,7,"F");
    sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(10);
    doc.text(`${col}  (${colCards.length} cards)`,M+3,y+5); y+=10;

    // Cards in rows of COLS_PER_ROW
    let col_i=0;
    let rowStartY=y;

    colCards.forEach((card,idx)=>{
      const cx=M+(col_i*(CARD_W+GAP));

      // Estimate card height based on content
      doc.setFontSize(8);
      const textLines=doc.splitTextToSize(card.text||"",CARD_W-6);
      // Use text labels instead of emojis (jsPDF helvetica doesn't support emoji)
      const actionLines=(card.actions||[]).flatMap(a=>{
        const text=typeof a==="object"?a.text:a;
        const isDone=typeof a==="object"&&a.status==="done";
        const who=typeof a==="object"&&a.assignee?` @${a.assignee}`:"";
        return doc.splitTextToSize(`${isDone?"[done]":"*"} ${text}${who}`,CARD_W-8);
      });
      // Reaction summary as text: "+1:3 -1:1 <3:2" etc.
      const RX_LABELS={"👍":"+1","👎":"-1","❤️":"<3","🔥":"hot","💡":"idea"};
      const rxParts=Object.entries(card.reactions||{})
        .map(([emoji,voters])=>{ const n=Object.keys(voters||{}).length; return n>0?`${RX_LABELS[emoji]||"?"}:${n}`:null; })
        .filter(Boolean);
      const rxText=rxParts.join("  ");
      const CARD_H = CARD_H_BASE
        + Math.max(0,(textLines.length-2)*4)
        + (actionLines.length>0 ? 6+actionLines.length*4 : 0)
        + (rxText ? 5 : 0);

      if(rowStartY+CARD_H>275){
        doc.addPage(); y=M; rowStartY=M; col_i=0;
      }

      const cy=rowStartY;

      // Card shadow (light gray rect slightly offset)
      sf("#e0e0e0"); sd("#e0e0e0");
      doc.rect(cx+1.5,cy+1.5,CARD_W,CARD_H,"F");

      // Card background
      sf(colBgHex[col]); sd(cc);
      doc.setLineWidth(0.3);
      doc.rect(cx,cy,CARD_W,CARD_H,"FD");

      // Top color strip
      sf(cc); doc.rect(cx,cy,CARD_W,3,"F");

      // Column badge
      sf(cc); doc.roundedRect(cx+2,cy+4,14,4,1,1,"F");
      sc(T.white); doc.setFont("helvetica","bold"); doc.setFontSize(5);
      doc.text(col,cx+9,cy+7,{align:"center"});

      // Author
      sc(T.gray500); doc.setFont("helvetica","bold"); doc.setFontSize(6);
      doc.text((card.participantName||"").slice(0,12),cx+CARD_W-2,cy+7,{align:"right"});

      // Card text
      sc("#333333"); doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.text(textLines,cx+3,cy+13);
      let innerY=cy+13+textLines.length*4;

      // Reactions
      if(rxText){
        sc(T.gray500); doc.setFont("helvetica","normal"); doc.setFontSize(7);
        doc.text(rxText,cx+3,innerY+2);
        innerY+=5;
      }

      // Actions
      if(actionLines.length>0){
        // Divider
        sd(cc); doc.setLineWidth(0.2);
        doc.line(cx+2,innerY+1,cx+CARD_W-2,innerY+1);
        sc(cc); doc.setFont("helvetica","bold"); doc.setFontSize(6);
        doc.text("ACTIONS",cx+3,innerY+4);
        sc(T.dark); doc.setFont("helvetica","normal"); doc.setFontSize(7);
        actionLines.forEach((line,li)=>{
          doc.text(line,cx+3,innerY+8+li*4);
        });
      }

      col_i++;
      if(col_i>=COLS_PER_ROW){
        col_i=0;
        // Find max height in this row
        rowStartY+=CARD_H+GAP;
        y=rowStartY;
      }
    });

    // If last row wasn't full
    if(col_i>0){
      rowStartY+=CARD_H_BASE+GAP+16;
      y=rowStartY;
    }
    y+=6;
  }

  doc.save(`retro-${VERSION}-${room.id}-${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── ScoreRating ──────────────────────────────────────────────────────────────
function ScoreRating({ value, onChange, allow3, scale=5 }) {
  const all=[1,2,3,4,5].slice(0,scale);
  const scores=allow3?all:all.filter(n=>n!==3);
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      {scores.map(n=>(
        <button key={n} onClick={()=>onChange(n)} style={{
          width:44,height:44,borderRadius:10,border:"none",cursor:"pointer",fontWeight:800,fontSize:16,
          background:value===n?T.orange:T.gray100,color:value===n?T.white:T.gray500,
          boxShadow:value===n?`0 3px 10px ${T.orangeLight}`:"none",
          transform:value===n?"scale(1.12)":"scale(1)",transition:"all .15s",
        }}>{n}</button>
      ))}
      {!allow3&&scale>=3&&<span style={{fontSize:11,color:T.gray300}}>(3 disabled)</span>}
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
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {questions.map((q,i)=>(
          <div key={q.id} style={{flex:"1 1 130px",background:T.white,borderRadius:14,padding:"12px 16px",
            boxShadow:`0 2px 10px ${colors[i%colors.length]}20`,borderTop:`4px solid ${colors[i%colors.length]}`}}>
            <div style={{fontSize:11,color:T.gray500,fontWeight:600,lineHeight:1.4,marginBottom:4}}>{q.label}</div>
            <div style={{fontSize:28,fontWeight:900,color:colors[i%colors.length]}}>{avg(q.id)}</div>
            <div style={{fontSize:10,color:T.gray300}}>avg / {q.scale||5}</div>
          </div>
        ))}
      </div>
      <div style={{borderRadius:12,overflow:"hidden",overflowX:"auto",boxShadow:`0 2px 12px ${T.teal}15`}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:T.teal}}>
              <th style={{padding:"9px 14px",textAlign:"left",color:T.white,fontSize:12,fontWeight:700,minWidth:160}}>Question</th>
              {parts.map(p=><th key={p.name} style={{padding:"9px 8px",textAlign:"center",color:T.white,fontSize:11,fontWeight:700,minWidth:55,whiteSpace:"nowrap"}}>{p.name}</th>)}
              <th style={{padding:"9px 8px",textAlign:"center",color:T.white,fontSize:11,fontWeight:800,minWidth:50,background:"rgba(0,0,0,.15)"}}>Avg</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q,qi)=>{
              const c=colors[qi%colors.length];
              return (
                <tr key={q.id} style={{background:qi%2===0?T.offWhite:T.white}}>
                  <td style={{padding:"9px 14px",fontSize:12,fontWeight:600,color:T.dark,borderLeft:`4px solid ${c}`}}>{q.label}</td>
                  {parts.map(p=>(
                    <td key={p.name} style={{padding:"9px 8px",textAlign:"center"}}>
                      <span style={{background:c,color:T.white,borderRadius:6,padding:"2px 8px",fontWeight:800,fontSize:13}}>{p.scores?.[q.id]??"-"}</span>
                    </td>
                  ))}
                  <td style={{padding:"9px 8px",textAlign:"center",background:`${c}15`}}>
                    <span style={{background:c,color:T.white,borderRadius:6,padding:"2px 8px",fontWeight:900,fontSize:13}}>{avg(q.id)}</span>
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

// ─── PostItCard ───────────────────────────────────────────────────────────────
function PostItCard({ card, myId, onDragStart, onReact, onAddAction, revealed }) {
  const [showAction, setShowAction] = useState(false);
  const [actText,    setActText]    = useState("");
  const [assignee,   setAssignee]   = useState("");
  const [dueDate,    setDueDate]    = useState("");
  const c  = COL_COLORS[card.column]||"#aaa";
  const bg = COL_BG[card.column]||"#fffde7";
  const rxTotal = totalReactions(card);
  const actions = card.actions||[];
  const openCount = actions.filter(a=>typeof a==="object"?a.status!=="done":true).length;

  function submitAction() {
    if(!actText.trim()) return;
    onAddAction(card.id, {
      id: Math.random().toString(36).slice(2,8),
      text: actText.trim(),
      assignee: assignee.trim(),
      dueDate: dueDate,
      status: "open",
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
    setActText(""); setAssignee(""); setDueDate(""); setShowAction(false);
  }

  return (
    <div
      draggable
      onDragStart={e=>onDragStart(e,card)}
      onDoubleClick={e=>{ e.stopPropagation(); if(revealed) setShowAction(v=>!v); }}
      style={{
        position:"absolute", left:card.x||100, top:card.y||100, width:190,
        background:bg, borderRadius:4,
        boxShadow:`3px 3px 10px rgba(0,0,0,.18), inset 0 -3px 0 ${c}60`,
        borderTop:`4px solid ${c}`, padding:"10px 12px 8px",
        cursor:"grab", userSelect:"none", zIndex:card.z||1,
        fontFamily:"'Segoe UI',sans-serif",
      }}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
        <span style={{background:c,color:"#fff",borderRadius:6,padding:"1px 7px",fontSize:9,fontWeight:800}}>{card.column}</span>
        <span style={{fontSize:10,color:T.gray500,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.participantName}</span>
      </div>
      <div style={{fontSize:13,color:"#333",lineHeight:1.4,marginBottom:8,wordBreak:"break-word"}}>{card.text}</div>

      {/* Reactions */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
        {REACTIONS.map(r=>{
          const voters=card.reactions?.[r]||{};
          const count=Object.keys(voters).length;
          const voted=!!voters[myId];
          return (
            <button key={r} onClick={e=>{e.stopPropagation();onReact(card.id,r);}}
              style={{background:voted?`${c}30`:"rgba(0,0,0,.05)",border:voted?`1.5px solid ${c}`:"1.5px solid transparent",
                borderRadius:10,padding:"2px 5px",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:2,
                color:voted?c:T.gray500,fontWeight:voted?700:400,transition:"all .15s"}}>
              {r}{count>0&&<span style={{fontSize:10,fontWeight:800}}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Actions list */}
      {actions.length>0&&(
        <div style={{borderTop:`1px solid ${c}30`,marginTop:4,paddingTop:4}}>
          {actions.map((a,i)=>{
            const isDone = typeof a==="object" ? a.status==="done" : false;
            const text   = typeof a==="object" ? a.text : a;
            const who    = typeof a==="object" && a.assignee ? a.assignee : null;
            const due    = typeof a==="object" && a.dueDate  ? a.dueDate  : null;
            return(
              <div key={i} style={{fontSize:10,color:isDone?T.gray300:T.gray700,marginBottom:3,
                textDecoration:isDone?"line-through":"none",display:"flex",alignItems:"flex-start",gap:3}}>
                <span style={{color:isDone?"#10B981":c,flexShrink:0}}>{isDone?"✓":"⚡"}</span>
                <span>
                  {text}
                  {who&&<span style={{color:T.gray300}}> @{who}</span>}
                  {due&&<span style={{color:T.gray300}}> · {due}</span>}
                </span>
              </div>
            );
          })}
          {actions.length>0&&(
            <div style={{fontSize:9,color:openCount===0?"#10B981":c,fontWeight:700,marginTop:3}}>
              {openCount===0?"✅ All done":`${actions.length-openCount}/${actions.length} done`}
            </div>
          )}
        </div>
      )}

      {/* Add action form */}
      {revealed&&showAction&&(
        <div style={{marginTop:6,borderTop:`1px solid ${c}30`,paddingTop:6}} onClick={e=>e.stopPropagation()}>
          <input autoFocus value={actText} onChange={e=>setActText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Escape")setShowAction(false);}}
            placeholder="Action…"
            style={{width:"100%",padding:"4px 8px",borderRadius:6,border:`1.5px solid ${c}`,fontSize:12,outline:"none",boxSizing:"border-box",background:"#fff",marginBottom:4}}/>
          <input value={assignee} onChange={e=>setAssignee(e.target.value)}
            placeholder="Assignee (optional)"
            style={{width:"100%",padding:"4px 8px",borderRadius:6,border:`1.5px solid ${T.gray100}`,fontSize:11,outline:"none",boxSizing:"border-box",background:"#fff",marginBottom:4}}/>
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
            style={{width:"100%",padding:"4px 8px",borderRadius:6,border:`1.5px solid ${T.gray100}`,fontSize:11,outline:"none",boxSizing:"border-box",background:"#fff",marginBottom:6}}/>
          <div style={{display:"flex",gap:4}}>
            <button onClick={submitAction} disabled={!actText.trim()}
              style={{flex:1,background:c,color:"#fff",border:"none",borderRadius:6,padding:"4px 0",cursor:"pointer",fontSize:11,fontWeight:700,opacity:actText.trim()?1:.5}}>Add</button>
            <button onClick={()=>setShowAction(false)}
              style={{flex:1,background:"#eee",color:T.gray500,border:"none",borderRadius:6,padding:"4px 0",cursor:"pointer",fontSize:11}}>Cancel</button>
          </div>
        </div>
      )}

      {revealed&&!actions.length&&!showAction&&(
        <div style={{fontSize:9,color:`${c}90`,marginTop:4,textAlign:"center",fontStyle:"italic"}}>
          ✦ double-click to add action
        </div>
      )}
      {rxTotal>0&&(
        <div style={{position:"absolute",top:-8,right:-8,background:c,color:"#fff",borderRadius:"50%",width:20,height:20,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,boxShadow:"0 2px 4px rgba(0,0,0,.2)"}}>
          {rxTotal}
        </div>
      )}
    </div>
  );
}

// ─── PostItBoard ──────────────────────────────────────────────────────────────
function PostItBoard({ cards, myId, myName, onAddCard, onMoveCard, onReact, onAddAction, revealed }) {
  const boardRef  = useRef(null);
  const dragCard  = useRef(null);
  const dragOff   = useRef({x:0,y:0});
  const [modal,   setModal]   = useState(null);
  const [newText, setNewText] = useState("");
  const [newCol,  setNewCol]  = useState("Continue");

  const sorted = [...cards].sort((a,b)=>totalReactions(a)-totalReactions(b));
  const BOARD_W = cards.length>0 ? Math.max(600, ...cards.map(c=>(c.x||0)+200)) : 600;
  const BOARD_H = cards.length>0 ? Math.max(500, ...cards.map(c=>(c.y||0)+260)) : 500;

  function openModal(x,y){ setModal({x,y}); setNewText(""); setNewCol("Continue"); }

  function handleBoardDblClick(e){
    if(e.target!==boardRef.current&&!e.target.classList.contains("board-bg")) return;
    const rect=boardRef.current.getBoundingClientRect();
    openModal(e.clientX-rect.left-90, e.clientY-rect.top-60);
  }

  function submitCard(){
    if(!newText.trim()) return;
    onAddCard({ id:uid(), text:newText.trim(), column:newCol, participantName:myName,
      participantId:myId, x:modal.x, y:modal.y, z:Date.now(), reactions:{}, actions:[] });
    setModal(null); setNewText("");
  }

  function handleDragStart(e,card){
    dragCard.current=card;
    const rect=e.currentTarget.getBoundingClientRect();
    dragOff.current={x:e.clientX-rect.left, y:e.clientY-rect.top};
    e.dataTransfer.effectAllowed="move";
  }

  function handleDrop(e){
    e.preventDefault();
    if(!dragCard.current) return;
    const rect=boardRef.current.getBoundingClientRect();
    const x=Math.max(0,e.clientX-rect.left-dragOff.current.x);
    const y=Math.max(0,e.clientY-rect.top-dragOff.current.y);
    onMoveCard(dragCard.current.id, x, y);
    dragCard.current=null;
  }

  return (
    <div style={{position:"relative"}}>
      {/* Legend with descriptions */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        {COLUMNS.map(col=>(
          <div key={col} style={{flex:"1 1 180px",background:COL_BG[col],border:`2px solid ${COL_COLORS[col]}`,borderRadius:12,padding:"10px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <div style={{width:10,height:10,borderRadius:2,background:COL_COLORS[col],flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:800,color:COL_COLORS[col]}}>{col}</span>
            </div>
            <div style={{fontSize:11,color:T.gray500,lineHeight:1.4}}>{COL_DESC[col]}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <button onClick={()=>openModal(60+Math.random()*200, 60+Math.random()*140)}
          style={{background:T.teal,color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>
          + Add Post-it
        </button>
        <span style={{fontSize:11,color:T.gray300}}>or double-click the board</span>
        {revealed&&<span style={{fontSize:11,color:T.gray500,marginLeft:"auto"}}>Double-click a card to add an action</span>}
      </div>

      {/* Board — fills container, scrolls only if cards overflow */}
      <div style={{overflowX:"auto",overflowY:"visible",borderRadius:16,border:`1.5px solid ${T.gray100}`}}>
      <div ref={boardRef} className="board-bg"
        onDoubleClick={handleBoardDblClick}
        onDragOver={e=>e.preventDefault()}
        onDrop={handleDrop}
        style={{
          position:"relative",
          minWidth:"100%",
          width:BOARD_W > 500 ? BOARD_W : "100%",
          height:BOARD_H,
          background:"repeating-linear-gradient(0deg,transparent,transparent 24px,#e0e8e840 24px,#e0e8e840 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#e0e8e840 24px,#e0e8e840 25px)",
          backgroundColor:"#f0f6f6",
        }}>
        {sorted.map((card,i)=>(
          <PostItCard key={card.id} card={{...card,z:i+1}} myId={myId}
            onDragStart={handleDragStart} onReact={onReact}
            onAddAction={onAddAction} revealed={revealed}/>
        ))}

        {/* New card modal */}
        {modal&&(
          <div style={{position:"absolute",left:Math.min(modal.x, BOARD_H>0?600:modal.x),top:modal.y,width:220,
            background:"#fff",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.2)",padding:16,zIndex:9999}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:800,fontSize:14,color:T.dark,marginBottom:10}}>New Post-it</div>
            <textarea value={newText} onChange={e=>setNewText(e.target.value)} autoFocus
              placeholder="What's on your mind?"
              style={{width:"100%",height:72,padding:"8px",borderRadius:8,border:`1.5px solid ${T.gray100}`,
                fontSize:13,resize:"none",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:6,margin:"8px 0"}}>
              {COLUMNS.map(col=>(
                <button key={col} onClick={()=>setNewCol(col)}
                  style={{flex:1,padding:"5px 0",borderRadius:8,border:`2px solid ${newCol===col?COL_COLORS[col]:T.gray100}`,
                    background:newCol===col?COL_BG[col]:"#fff",color:COL_COLORS[col],fontWeight:700,fontSize:10,cursor:"pointer"}}>
                  {col}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={submitCard} disabled={!newText.trim()}
                style={{flex:1,background:COL_COLORS[newCol],color:"#fff",border:"none",borderRadius:8,padding:"8px 0",
                  fontWeight:700,fontSize:13,cursor:newText.trim()?"pointer":"default",opacity:newText.trim()?1:.5}}>
                Post it!
              </button>
              <button onClick={()=>setModal(null)}
                style={{background:"#eee",color:T.gray500,border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:13}}>✕</button>
            </div>
          </div>
        )}
      </div>
      </div>{/* end scroll wrapper */}
    </div>
  );
}

// ─── SetupScreen ──────────────────────────────────────────────────────────────
function SetupScreen({ hostName, onBack, onCreate, teams, isAdmin }) {
  const [questions,setQuestions]     = useState(DEFAULT_QUESTIONS.map(q=>({...q})));
  const [allow3,setAllow3]           = useState(false);
  const [teamId,setTeamId]           = useState("");
  const [sessionName,setSessionName] = useState("");

  function updateQ(i,f,v){ setQuestions(qs=>qs.map((q,j)=>j===i?{...q,[f]:v}:q)); }
  function addQ(){ if(questions.length>=5)return; setQuestions(qs=>[...qs,{id:`q${uid()}`,label:"New question",low:"Low",high:"High",scale:5}]); }
  function delQ(i){ if(questions.length<=1)return; setQuestions(qs=>qs.filter((_,j)=>j!==i)); }

  const sel=teams.find(t=>t.id===teamId);
  const inp={padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,color:T.dark,outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"24px 16px"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.teal,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>← Back</button>
        <div style={{background:T.white,borderRadius:20,padding:28,boxShadow:`0 6px 32px ${T.teal}15`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <h2 style={{margin:0,fontSize:20,fontWeight:900,color:T.tealDark}}>⚙️ Configure Retrospective</h2>
            <span style={{background:T.tealBg,color:T.tealDark,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{VERSION}</span>
          </div>
          <p style={{margin:"0 0 24px",color:T.gray500,fontSize:14}}>Hosting as <strong>{hostName}</strong></p>

          {isAdmin&&(
            <div style={{marginBottom:20}}>
              <div style={{fontWeight:800,fontSize:14,color:T.dark,marginBottom:8}}>📝 Session Name <span style={{color:T.gray300,fontWeight:400,fontSize:12}}>(optional)</span></div>
              <input value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="e.g. Sprint 42 Retro…" style={{...inp,fontSize:14,padding:"10px 14px"}}/>
            </div>
          )}

          {isAdmin&&teams.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{fontWeight:800,fontSize:14,color:T.dark,marginBottom:10}}>👥 Team (optional)</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>setTeamId("")} style={{padding:"7px 14px",borderRadius:10,border:`2px solid ${!teamId?T.teal:T.gray100}`,background:!teamId?T.tealBg:"#fff",color:!teamId?T.tealDark:T.gray500,fontWeight:700,fontSize:13,cursor:"pointer"}}>No Team</button>
                {teams.map(t=>(
                  <button key={t.id} onClick={()=>setTeamId(t.id)}
                    style={{padding:"7px 14px",borderRadius:10,border:`2px solid ${teamId===t.id?T.teal:T.gray100}`,background:teamId===t.id?T.tealBg:"#fff",color:teamId===t.id?T.tealDark:T.gray500,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:14,color:T.dark,marginBottom:12}}>📊 Questions ({questions.length}/5)</div>
            {questions.map((q,i)=>(
              <div key={q.id} style={{background:T.gray50,borderRadius:12,padding:14,marginBottom:10,border:`1.5px solid ${T.gray100}`}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <span style={{background:T.teal,color:"#fff",borderRadius:8,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{i+1}</span>
                  <input value={q.label} onChange={e=>updateQ(i,"label",e.target.value)} style={{...inp,fontWeight:700,fontSize:14,flex:1}}/>
                  {questions.length>1&&<button onClick={()=>delQ(i)} style={{background:"none",border:"none",color:T.gray300,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8}}>
                  <div><div style={{fontSize:11,color:T.gray500,marginBottom:3}}>Low</div><input value={q.low} onChange={e=>updateQ(i,"low",e.target.value)} style={inp}/></div>
                  <div><div style={{fontSize:11,color:T.gray500,marginBottom:3}}>High</div><input value={q.high} onChange={e=>updateQ(i,"high",e.target.value)} style={inp}/></div>
                  <div><div style={{fontSize:11,color:T.gray500,marginBottom:3}}>Scale</div>
                    <select value={q.scale||5} onChange={e=>updateQ(i,"scale",parseInt(e.target.value))} style={{...inp,width:70}}>
                      {[3,4,5].map(n=><option key={n} value={n}>1–{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {questions.length<5&&<button onClick={addQ} style={{width:"100%",padding:"10px",borderRadius:10,border:`2px dashed ${T.gray100}`,background:"none",color:T.gray500,fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add Question (max 5)</button>}
          </div>

          <div style={{borderTop:`1.5px solid ${T.gray100}`,paddingTop:18,marginBottom:20}}>
            <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:"12px 14px",background:T.gray50,borderRadius:10,border:`1.5px solid ${T.gray100}`}}>
              <div onClick={()=>setAllow3(v=>!v)} style={{width:42,height:24,borderRadius:12,position:"relative",cursor:"pointer",flexShrink:0,background:allow3?T.teal:T.gray100,transition:"background .2s"}}>
                <div style={{position:"absolute",top:3,left:allow3?21:3,width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s"}}/>
              </div>
              <div><div style={{fontWeight:700,fontSize:13,color:T.dark}}>Allow score 3</div><div style={{fontSize:11,color:T.gray500}}>By default 3 is disabled to avoid middle-ground answers</div></div>
            </label>
          </div>

          <button onClick={()=>onCreate(questions,allow3,teamId,sel?.name||"",sessionName.trim())}
            style={{width:"100%",background:T.orange,color:"#fff",border:"none",borderRadius:14,padding:"14px 0",fontWeight:700,fontSize:16,cursor:"pointer"}}>
            🚀 Create Session & Get Link →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
function HomeScreen({ onSetup, onJoin, onAdminLogin, adminUser, prefilledName="" }) {
  const [hostName,setHostName]=useState(prefilledName.slice(0,15));
  const [joinId,setJoinId]=useState(""); const [joinName,setJoinName]=useState("");
  const [joinOpen,setJoinOpen]=useState(false); const [howOpen,setHowOpen]=useState(false);
  const [error,setError]=useState("");
  const MAX=15;
  const inp={width:"100%",padding:"12px 16px",borderRadius:12,border:`1.5px solid #DDE8E8`,fontSize:15,color:T.dark,outline:"none",boxSizing:"border-box",background:"#fff"};
  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px 16px"}}>
      <div style={{width:"100%",maxWidth:540,background:"#fff",borderRadius:24,boxShadow:"0 8px 48px rgba(13,158,158,.13)",padding:"36px 32px",border:`1.5px solid ${T.tealLight}40`}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:6}}>🔄</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}>
            <h1 style={{fontSize:30,fontWeight:900,color:"#1a2e2e",margin:0}}>RetroBoard</h1>
            <span style={{background:T.tealBg,color:T.tealDark,borderRadius:8,padding:"3px 10px",fontSize:13,fontWeight:800}}>{VERSION}</span>
          </div>
          <p style={{color:"#7a9a9a",margin:0,fontSize:14}}>Real-time retrospectives for agile teams</p>
        </div>

        <div style={{background:"#E8F8F5",borderRadius:16,padding:"20px 20px 22px",border:`1.5px solid ${T.tealLight}60`,marginBottom:10}}>
          <div style={{fontWeight:800,fontSize:15,color:T.tealDark,marginBottom:3}}>⚡ Quick Start</div>
          <div style={{color:"#7a9a9a",fontSize:13,marginBottom:14}}>Create instantly, share link, start your retro.</div>
          <div style={{position:"relative"}}>
            <input style={inp} placeholder="Your name (as host)" value={hostName} maxLength={MAX}
              onChange={e=>{setHostName(e.target.value.slice(0,MAX));setError("");}} autoFocus/>
            <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:hostName.length>=MAX?"#F07030":T.gray300}}>{hostName.length}/{MAX}</span>
          </div>
          {error&&!joinOpen&&<div style={{color:T.orange,fontSize:13,marginTop:8}}>{error}</div>}
          <button onClick={()=>{if(!hostName.trim()){setError("Please enter your name");return;}onSetup(hostName.trim());}}
            style={{marginTop:12,width:"100%",background:"#E8A870",color:"#fff",border:"none",borderRadius:14,padding:"13px 0",fontWeight:700,fontSize:15,cursor:"pointer"}}>
            Configure & Create Session →
          </button>
        </div>

        <div style={{border:`1.5px solid ${T.gray100}`,borderRadius:16,overflow:"hidden",marginBottom:10}}>
          <button onClick={()=>setJoinOpen(o=>!o)} style={{width:"100%",background:"#fff",border:"none",padding:"14px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontWeight:700,fontSize:14,color:"#2a5a5a"}}>
            <span>👥</span><span>Join with Room ID</span>
            <span style={{marginLeft:"auto",color:T.gray300,fontSize:18,transform:joinOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>›</span>
          </button>
          {joinOpen&&(
            <div style={{padding:"0 20px 18px",borderTop:`1px solid ${T.gray100}`,background:"#fafefe"}}>
              <input style={{...inp,marginTop:14,marginBottom:8}} placeholder="Room ID or paste link" value={joinId} onChange={e=>setJoinId(e.target.value)}/>
              <div style={{position:"relative",marginBottom:10}}>
                <input style={inp} placeholder="Your name" value={joinName} maxLength={MAX}
                  onChange={e=>{setJoinName(e.target.value.slice(0,MAX));setError("");}}
                  onKeyDown={e=>{if(e.key==="Enter")onJoin(joinId,joinName,setError);}}/>
                <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:joinName.length>=MAX?"#F07030":T.gray300}}>{joinName.length}/{MAX}</span>
              </div>
              {error&&joinOpen&&<div style={{color:T.orange,fontSize:13,marginBottom:8}}>{error}</div>}
              <button onClick={()=>onJoin(joinId,joinName,setError)} style={{width:"100%",background:T.teal,color:"#fff",border:"none",borderRadius:14,padding:"13px 0",fontWeight:700,fontSize:14,cursor:"pointer"}}>🔗 Join Session</button>
            </div>
          )}
        </div>

        <div style={{border:`1.5px solid ${T.gray100}`,borderRadius:16,overflow:"hidden",marginBottom:10}}>
          <button onClick={()=>setHowOpen(o=>!o)} style={{width:"100%",background:"#fff",border:"none",padding:"14px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontWeight:600,fontSize:14,color:"#2a5a5a"}}>
            <span style={{color:"#e05050",fontWeight:900}}>?</span><span>How does this work?</span>
            <span style={{marginLeft:"auto",color:T.gray300,fontSize:18,transform:howOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>›</span>
          </button>
          {howOpen&&(
            <div style={{padding:"4px 20px 16px",borderTop:`1px solid ${T.gray100}`,background:"#fafefe"}}>
              {[
                ["🚀","Create","Configure questions and get a shareable link."],
                ["🔗","Share","Team opens the link — no sign-up needed."],
                ["🗒️","Post-its","Add cards to the shared board in real-time. Choose Stop 🔴 / Start 🟢 / Continue 🔵 for each."],
                ["📊","Rate","Rate team health questions (mood, stress, role)."],
                ["✅","Submit","Submit your scores. Post-its are already visible to everyone."],
                ["🎉","Reveal","Host reveals scores — everyone sees the results."],
                ["👍","React","React to cards with 👍👎❤️🔥💡 — most reacted float to top."],
                ["⚡","Actions","Double-click a card to add an action item."],
                ["📥","PDF","Download full PDF of results."],
              ].map(([icon,title,desc])=>(
                <div key={title} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.gray50}`}}>
                  <div style={{fontSize:15,width:26,flexShrink:0,marginTop:2}}>{icon}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:"#2a5a5a"}}>{title}</div>
                    <div style={{fontSize:12,color:"#7a9a9a",marginTop:1,lineHeight:1.5}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{borderTop:`1.5px solid ${T.gray100}`,paddingTop:14,textAlign:"center"}}>
          {adminUser?(
            <button onClick={()=>window.location.hash="admin"}
              style={{background:T.tealBg,color:T.tealDark,border:`1.5px solid ${T.teal}40`,borderRadius:12,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8,margin:"0 auto"}}>
              <img src={adminUser.photoURL} alt="" style={{width:22,height:22,borderRadius:"50%"}}/>
              Admin Panel →
            </button>
          ):(
            <button onClick={onAdminLogin} style={{background:"none",color:T.gray500,border:`1.5px solid ${T.gray100}`,borderRadius:12,padding:"10px 20px",fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8,margin:"0 auto"}}>
              <span style={{fontSize:16}}>🔐</span> Admin Login (Google)
            </button>
          )}
        </div>
      </div>
      <div style={{marginTop:18,color:"#7a9a9a",fontSize:13}}>Built by <span style={{color:T.teal,fontWeight:700}}>Hakan</span> · RetroBoard {VERSION}</div>
    </div>
  );
}

// ─── JoinScreen ───────────────────────────────────────────────────────────────
function JoinScreen({ onJoin, roomId }) {
  const [name,setName]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const [isRevealed,setIsRevealed]=useState(null);
  const MAX=15;
  useEffect(()=>{ if(!roomId)return; fbGet(roomId).then(r=>{ if(r)setIsRevealed(!!r.revealed); }); },[roomId]);
  async function go(){ setLoading(true); await onJoin(name,setError); setLoading(false); }
  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:460,background:"#fff",borderRadius:24,boxShadow:"0 8px 48px rgba(13,158,158,.12)",padding:"36px 32px"}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{fontSize:46,marginBottom:8}}>{isRevealed?"🎉":"🔄"}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}>
            <h1 style={{fontSize:22,fontWeight:900,color:"#1a2e2e",margin:0}}>{isRevealed?"View Results":"You're invited!"}</h1>
            <span style={{background:T.tealBg,color:T.tealDark,borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:800}}>{VERSION}</span>
          </div>
          <p style={{color:"#7a9a9a",margin:0,fontSize:14}}>{isRevealed?"Session complete — enter your name to view.":"Enter your name to join."}</p>
        </div>
        {isRevealed&&<div style={{background:"#E6F7F7",border:"1.5px solid #7FDADA",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:T.tealDark,fontWeight:600}}>👁️ Read-only — results are visible to everyone.</div>}
        <div style={{position:"relative"}}>
          <input value={name} onChange={e=>{setName(e.target.value.slice(0,MAX));setError("");}} onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="Your name" autoFocus maxLength={MAX}
            style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1.5px solid #DDE8E8",fontSize:15,color:"#0A2020",outline:"none",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:name.length>=MAX?"#F07030":T.gray300}}>{name.length}/{MAX}</span>
        </div>
        {error&&<div style={{color:"#F07030",fontSize:13,marginTop:6}}>{error}</div>}
        <button onClick={go} disabled={loading}
          style={{marginTop:14,width:"100%",background:isRevealed?T.teal:T.orange,color:"#fff",border:"none",borderRadius:14,padding:"14px 0",fontWeight:700,fontSize:15,cursor:"pointer",opacity:loading?.7:1}}>
          {loading?"Loading…":isRevealed?"👁️ View Results →":"Join Retrospective →"}
        </button>
      </div>
      <div style={{marginTop:18,color:"#7a9a9a",fontSize:13}}>Built by <span style={{color:T.teal,fontWeight:700}}>Hakan</span> · RetroBoard {VERSION}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view,        setView]        = useState("home");
  const [room,        setRoom]        = useState(null);
  const [roomId,      setRoomId]      = useState(null);
  const [myId,        setMyId]        = useState(null);
  const [myName,      setMyName]      = useState("");
  const [isHost,      setIsHost]      = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [scores,      setScores]      = useState({});
  const [submitError, setSubmitError] = useState("");
  const [setupName,   setSetupName]   = useState("");
  const [adminUser,   setAdminUser]   = useState(null);
  const [teams,       setTeams]       = useState([]);
  const skipHashRef = useRef(false);
  const unsubRef    = useRef(null);

  useEffect(()=>onAuth(u=>setAdminUser(u)),[]);
  useEffect(()=>{ if(adminUser?.uid)getAllTeams(adminUser.uid).then(setTeams); else setTeams([]); },[adminUser?.uid]);

  useEffect(()=>{
    function handleHash(){
      if(skipHashRef.current){skipHashRef.current=false;return;}
      const hash=window.location.hash.replace("#","");
      if(hash==="admin"){setView("admin");return;}
      if(hash.startsWith("retro-")){setRoomId(hash.replace("retro-",""));setView("join");return;}
      if(hash===""){setView("home");return;}
    }
    handleHash();
    window.addEventListener("hashchange",handleHash);
    return ()=>window.removeEventListener("hashchange",handleHash);
  },[]);

  function listenRoom(id){
    if(unsubRef.current)unsubRef.current();
    const r=roomRef(id);
    const h=snap=>{if(snap.exists())setRoom(snap.val());};
    onValue(r,h);
    unsubRef.current=()=>off(r,"value",h);
  }
  useEffect(()=>()=>{if(unsubRef.current)unsubRef.current();},[]);
  useEffect(()=>{if(room?.revealed&&(view==="waiting"||view==="input"))setView("board");},[room?.revealed]);

  async function handleAdminLogin(){
    try{
      const result = await signInWithGoogle();
      await registerUser(result.user);
      window.location.hash="admin";
    }catch(e){console.error(e);}
  }
  function goSetup(name){setSetupName(name);setView("setup");}

  async function handleCreate(questions,allow3,teamId,teamName,sessionName){
    const id=uid(),pid=uid();
    const r={id,createdAt:nowISO(),hostName:setupName,hostId:pid,revealed:false,allow3:!!allow3,questions,
      teamId:teamId||"",teamName:teamName||"",sessionName:sessionName||"",createdBy:adminUser?.uid||"",
      participants:{},boardEntries:[],};
    r.participants[pid]={name:setupName,scores:{},submitted:false,joinedAt:nowISO()};
    await fbSet(id,r);
    const init={};questions.forEach(q=>{init[q.id]=0;});
    setRoomId(id);setMyId(pid);setMyName(setupName);setIsHost(true);setRoom(r);setScores(init);
    skipHashRef.current=true;
    window.location.hash=`retro-${id}`;
    listenRoom(id);setView("input");
  }

  async function handleJoin(rawId,name,setError,forceHost=false){
    if(!name.trim()){setError("Please enter your name");return;}
    const id=(rawId||"").trim().replace(/.*#retro-/,"").replace("retro-","")||roomId;
    if(!id){setError("Enter a valid room ID");return;}
    const r=await fbGet(id);
    if(!r){setError("Room not found.");return;}
    const pid=uid();
    if(r.revealed){
      setRoomId(id);setMyId(pid);setMyName(name.trim());setIsHost(forceHost);setRoom(r);
      skipHashRef.current=true;window.location.hash=`retro-${id}`;listenRoom(id);setView("board");return;
    }
    const init={};(r.questions||DEFAULT_QUESTIONS).forEach(q=>{init[q.id]=0;});
    // Check if rejoining as host
    const isRejoinHost = forceHost || (adminUser && r.createdBy===adminUser.uid);
    const updated={...r,participants:{...(r.participants||{}),[pid]:{name:name.trim(),scores:{},submitted:false,joinedAt:nowISO()}}};
    await fbSet(id,updated);
    setRoomId(id);setMyId(pid);setMyName(name.trim());setIsHost(isRejoinHost);setRoom(updated);setScores(init);
    skipHashRef.current=true;window.location.hash=`retro-${id}`;listenRoom(id);setView("input");
  }

  async function handleJoinFromLink(name,setError){ await handleJoin(roomId,name,setError); }

  // Admin rejoin: called from Admin panel with roomId
  function handleAdminRejoin(rid){
    setRoomId(rid);
    setSetupName(adminUser?.displayName?.split(" ")[0]||"Admin");
    setView("join");
    skipHashRef.current=true;
    window.location.hash=`retro-${rid}`;
  }

  async function submitAnswers(setError){
    const questions=room?.questions||DEFAULT_QUESTIONS;
    if(!questions.every(q=>scores[q.id]>0)){setError("Please rate all questions");return;}
    await update(roomRef(roomId),{[`participants/${myId}/scores`]:scores,[`participants/${myId}/submitted`]:true});
    setView("waiting");
  }

  async function revealResults(){
    await update(roomRef(roomId),{revealed:true});
  }

  // ── Board card operations (real-time, stored in boardEntries always) ─────────
  async function handleAddCard(card){
    const r=await fbGet(roomId);
    const entries=[...(r.boardEntries||[]),{...card,participantId:myId,participantName:myName}];
    await update(roomRef(roomId),{boardEntries:entries});
  }

  async function handleMoveCard(cardId,x,y){
    const r=await fbGet(roomId);
    const updated=(r.boardEntries||[]).map(c=>c.id===cardId?{...c,x,y,z:Date.now()}:c);
    await update(roomRef(roomId),{boardEntries:updated});
  }

  async function handleReact(cardId,emoji){
    const r=await fbGet(roomId);
    const entries=r.boardEntries||[];
    const card=entries.find(c=>c.id===cardId);
    if(!card) return;
    const voters={...(card.reactions?.[emoji]||{})};
    if(voters[myId]) delete voters[myId]; else voters[myId]=true;
    const updated=entries.map(c=>c.id===cardId?{...c,reactions:{...(c.reactions||{}),[emoji]:voters}}:c);
    await update(roomRef(roomId),{boardEntries:updated});
  }

  async function handleAddAction(cardId, actionObj){
    const r=await fbGet(roomId);
    const updated=(r.boardEntries||[]).map(c=>c.id===cardId?{...c,actions:[...(c.actions||[]),actionObj]}:c);
    await update(roomRef(roomId),{boardEntries:updated});
  }

  async function handleToggleAction(cardId, actionId){
    const r=await fbGet(roomId);
    const updated=(r.boardEntries||[]).map(c=>{
      if(c.id!==cardId) return c;
      const actions=(c.actions||[]).map(a=>{
        if(typeof a!=="object"||a.id!==actionId) return a;
        return a.status==="done"
          ? {...a, status:"open", completedAt:null}
          : {...a, status:"done", completedAt:new Date().toISOString()};
      });
      return {...c, actions};
    });
    await update(roomRef(roomId),{boardEntries:updated});
  }

  function copyLink(){ navigator.clipboard.writeText(`${location.origin}${location.pathname}#retro-${roomId}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}); }

  const base={minHeight:"100vh",background:"#E8F8F5",fontFamily:"'Segoe UI',system-ui,sans-serif",color:T.dark};
  const card=(ex={})=>({background:T.white,borderRadius:20,padding:24,boxShadow:`0 6px 32px ${T.teal}15`,...ex});
  const btn=(bg,color=T.white,ex={})=>({background:bg,color,border:"none",borderRadius:12,padding:"10px 20px",fontWeight:700,fontSize:14,cursor:"pointer",...ex});

  function Topbar(){
    const link=`${location.origin}${location.pathname}#retro-${roomId}`;
    return (
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,background:T.white,borderRadius:"16px 16px 0 0",padding:"12px 20px",boxShadow:`0 2px 8px ${T.teal}10`}}>
          <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.teal},${T.tealDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🔄</div>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:T.tealDark,display:"flex",alignItems:"center",gap:6}}>
              {room?.sessionName||"RetroBoard"}
              <span style={{background:T.tealBg,color:T.tealDark,borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:800}}>{VERSION}</span>
              {room?.teamName&&<span style={{fontSize:12,color:T.gray500,fontWeight:600}}>· {room.teamName}</span>}
            </div>
            <div style={{fontSize:11,color:T.gray300}}>Room: {roomId}</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            {isHost&&<button onClick={copyLink} style={{...btn(T.gray100,T.gray500,{fontSize:12,padding:"7px 12px"})}}>{copied?"✅ Copied!":"🔗 Copy Link"}</button>}
            {adminUser&&(
              <button onClick={()=>{skipHashRef.current=true;window.location.hash="admin";setView("admin");}}
                style={{...btn(T.tealBg,T.tealDark,{fontSize:12,padding:"7px 12px"})}}>
                ← Admin
              </button>
            )}
            <div style={{background:T.tealBg,borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,color:T.tealDark}}>👤 {myName}</div>
          </div>
        </div>
        {/* Session link bar — always visible */}
        <div style={{background:T.tealBg,borderRadius:"0 0 16px 16px",padding:"8px 20px",display:"flex",alignItems:"center",gap:10,borderTop:`1px solid ${T.gray100}`}}>
          <span style={{fontSize:11,color:T.tealDark,fontWeight:600,flexShrink:0}}>🔗 Link:</span>
          <a href={link} target="_blank" rel="noreferrer"
            style={{fontSize:12,color:T.teal,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:"none"}}>
            {link}
          </a>
          <button onClick={copyLink}
            style={{flexShrink:0,background:T.teal,color:"#fff",border:"none",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontWeight:700,fontSize:11}}>
            {copied?"✅":"Copy"}
          </button>
        </div>
      </div>
    );
  }

  // ── Views ─────────────────────────────────────────────────────────────────────
  if(view==="admin") return adminUser
    ? <AdminPanel user={adminUser}
        onNewSession={()=>{skipHashRef.current=true;window.location.hash="";setView("home");}}
        onRejoinSession={handleAdminRejoin}/>
    : <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <div style={{fontSize:48}}>🔐</div>
        <div style={{fontWeight:700,color:T.tealDark,fontSize:18}}>Admin login required</div>
        <button onClick={handleAdminLogin} style={{...btn(T.teal),fontSize:15,padding:"12px 28px"}}>G Sign in with Google</button>
        <button onClick={()=>window.location.hash=""} style={{...btn("none",T.gray500,{border:`1px solid ${T.gray100}`})}}>← Home</button>
      </div>;

  if(view==="home")  return <HomeScreen onSetup={goSetup} onJoin={handleJoin} onAdminLogin={handleAdminLogin} adminUser={adminUser} prefilledName={adminUser?.displayName?.split(" ")[0]||""}/>;
  if(view==="setup") return <SetupScreen hostName={setupName} onBack={()=>setView("home")} onCreate={handleCreate} teams={teams} isAdmin={!!adminUser}/>;
  if(view==="join")  return <JoinScreen onJoin={handleJoinFromLink} roomId={roomId}/>;

  const boardCards = room?.boardEntries||[];

  if(view==="input"){
    const questions=room?.questions||DEFAULT_QUESTIONS;
    const allow3=room?.allow3??false;
    const allScored=questions.every(q=>scores[q.id]>0);
    return (
      <div style={base}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px 60px"}}>
          <Topbar/>
          {room&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {Object.values(room.participants||{}).map(p=>(
                <div key={p.name} style={{borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:600,background:p.submitted?T.teal:T.gray50,color:p.submitted?T.white:T.gray700,border:`1.5px solid ${p.submitted?T.teal:T.gray100}`}}>
                  {p.submitted?"✓ ":"○ "}{p.name}
                </div>
              ))}
            </div>
          )}
          <div style={card({marginBottom:20})}>
            <h2 style={{fontSize:16,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:16}}>📊 Rate Your Team Experience</h2>
            {questions.map(q=>(
              <div key={q.id} style={{marginBottom:18}}>
                <div style={{fontWeight:700,color:T.dark,marginBottom:6,fontSize:14}}>{q.label}</div>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:T.gray500}}>1 – {q.low}</span>
                  <ScoreRating value={scores[q.id]||0} onChange={v=>setScores(s=>({...s,[q.id]:v}))} allow3={allow3} scale={q.scale||5}/>
                  <span style={{fontSize:12,color:T.gray500}}>{q.scale||5} – {q.high}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={card({marginBottom:20,padding:20})}>
            <h2 style={{fontSize:16,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:4}}>🗒️ Team Board</h2>
            <p style={{fontSize:12,color:T.gray500,margin:"0 0 16px"}}>Post-its are visible to everyone in real-time. Add yours and react to others!</p>
            <PostItBoard
              cards={boardCards} myId={myId} myName={myName}
              onAddCard={handleAddCard} onMoveCard={handleMoveCard}
              onReact={handleReact} onAddAction={handleAddAction}
              revealed={false}/>
          </div>
          <div>
            {submitError&&<div style={{color:T.orange,fontWeight:600,marginBottom:10,textAlign:"center",fontSize:14}}>{submitError}</div>}
            <button onClick={()=>submitAnswers(setSubmitError)} disabled={!allScored}
              style={{width:"100%",background:room?.participants?.[myId]?.submitted?T.teal:T.orange,color:"#fff",border:"none",borderRadius:14,padding:"15px 0",fontWeight:700,fontSize:16,cursor:allScored?"pointer":"default",opacity:allScored?1:.5}}>
              {room?.participants?.[myId]?.submitted?"🔄 Update My Scores":"✅ Submit My Scores"}
            </button>
            {!allScored&&<div style={{textAlign:"center",color:T.gray300,fontSize:12,marginTop:6}}>Rate all questions to submit</div>}
          </div>
        </div>
      </div>
    );
  }

  if(view==="waiting"){
    const parts=Object.values(room?.participants||{});
    const done=parts.filter(p=>p.submitted).length, total=parts.length;
    const allDone=done===total&&total>0;
    return(
      <div style={base}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px 60px"}}>
          <Topbar/>
          <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
            {/* Left: status + reveal */}
            <div style={{flex:"0 0 280px",minWidth:240}}>
              <div style={card({padding:20,marginBottom:12})}>
                <h2 style={{fontSize:15,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:12}}>
                  ⏳ {done} / {total} submitted
                </h2>
                {parts.map(p=>(
                  <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.gray100}`}}>
                    <div style={{width:26,height:26,borderRadius:7,background:p.submitted?T.teal:T.gray100,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:p.submitted?"#fff":T.gray300}}>{p.submitted?"✓":"○"}</div>
                    <span style={{fontWeight:600,fontSize:13,color:p.submitted?T.tealDark:T.gray500}}>{p.name}</span>
                  </div>
                ))}
              </div>
              {isHost&&(
                <button onClick={revealResults}
                  style={{width:"100%",background:T.orange,color:"#fff",border:"none",borderRadius:14,padding:"13px 0",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:8}}>
                  🎉 Reveal Results
                </button>
              )}
              {!isHost&&<p style={{color:T.gray300,textAlign:"center",fontSize:13}}>Host will reveal when ready.</p>}
              <button onClick={()=>setView("input")} style={{width:"100%",background:"none",color:T.gray500,border:`1.5px solid ${T.gray100}`,borderRadius:14,padding:"11px 0",fontWeight:600,fontSize:14,cursor:"pointer"}}>✏️ Edit My Scores</button>
            </div>
            {/* Right: live board */}
            <div style={{flex:1,minWidth:0}}>
              <div style={card({padding:20})}>
                <h2 style={{fontSize:15,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:12}}>🗒️ Team Board (live)</h2>
                <PostItBoard
                  cards={boardCards} myId={myId} myName={myName}
                  onAddCard={handleAddCard} onMoveCard={handleMoveCard}
                  onReact={handleReact} onAddAction={()=>{}}
                  revealed={false}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if(view==="board"&&room){
    const questions=room.questions||DEFAULT_QUESTIONS;
    const sorted=[...boardCards].sort((a,b)=>totalReactions(b)-totalReactions(a));
    return(
      <div style={base}>
        <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"14px 24px",display:"flex",alignItems:"center",gap:14,boxShadow:`0 4px 20px ${T.teal}40`}}>
          <div style={{fontSize:26}}>🔄</div>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:19,display:"flex",alignItems:"center",gap:8}}>
              {room.sessionName||"RetroBoard Results"}
              <span style={{background:"rgba(255,255,255,.2)",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{VERSION}</span>
            </div>
            <div style={{color:T.tealLight,fontSize:12}}>Room {room.id}{room.teamName?` · ${room.teamName}`:""} · {Object.values(room.participants||{}).filter(p=>p.submitted).length} participants</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            {adminUser&&(
              <button onClick={()=>{skipHashRef.current=true;window.location.hash="admin";setView("admin");}}
                style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:12,padding:"9px 14px",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                ← Admin Panel
              </button>
            )}
            <button onClick={()=>exportPDF(room)} style={{background:T.orange,color:"#fff",border:"none",borderRadius:12,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer"}}>📥 PDF</button>
          </div>
        </div>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"22px 16px 60px"}}>
          <div style={card({marginBottom:24})}>
            <h2 style={{fontSize:16,fontWeight:800,color:T.tealDark,marginTop:0,marginBottom:16}}>📊 Team Scores</h2>
            <ScoresSummary participants={room.participants||{}} questions={questions}/>
          </div>
          <div style={card({padding:20})}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <h2 style={{fontSize:16,fontWeight:800,color:T.tealDark,margin:0}}>🗒️ Team Board</h2>
              <span style={{fontSize:12,color:T.gray300}}>Drag cards · React with emojis · Double-click to add action</span>
            </div>
            <PostItBoard
              cards={sorted} myId={myId} myName={myName}
              onAddCard={()=>{}} onMoveCard={handleMoveCard}
              onReact={handleReact} onAddAction={handleAddAction}
              revealed={true}/>
          </div>
        </div>
      </div>
    );
  }

  return <div style={base}><div style={{padding:40,textAlign:"center",color:T.gray500}}>Loading…</div></div>;
}
