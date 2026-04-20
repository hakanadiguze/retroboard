import { useState, useEffect, useCallback } from "react";
import { getAllRooms, getAllRoomsAll, getAllTeams, getAllUsers, saveTeam, deleteTeam, deleteRoom, signOutUser, uid, nowISO, SUPERADMIN_EMAIL } from "./firebase.js";

const T = {
  teal:"#0D9E9E", tealDark:"#076F6F", tealLight:"#7FDADA", tealBg:"#E6F7F7",
  orange:"#F07030", red:"#EF4444", redBg:"#FEF2F2",
  white:"#FFFFFF", offWhite:"#F8FAFA",
  gray50:"#F0F4F4", gray100:"#DDE8E8", gray300:"#9BB8B8",
  gray500:"#5A7878", gray700:"#2D4A4A", dark:"#0A2020",
};
const SCORE_COLORS = ["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];
const COL_COLORS   = { Stop:"#FF6B6B", Start:"#34D399", Continue:"#60A5FA" };
const COL_BG       = { Stop:"#FFF5F5", Start:"#F0FFF8", Continue:"#EFF6FF" };
const COLUMNS      = ["Stop","Start","Continue"];
const REACTIONS    = ["👍","👎","❤️","🔥","💡"];

function totalReactions(card) {
  return Object.values(card.reactions||{}).reduce((s,v)=>s+Object.keys(v||{}).length,0);
}

function fmt(iso) {
  if(!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function scoreAvg(participants, qid) {
  const vals = Object.values(participants||{}).filter(p=>p.submitted).map(p=>p.scores?.[qid]).filter(Boolean);
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "—";
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function Confirm({ message, onConfirm, onCancel }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.white,borderRadius:16,padding:28,maxWidth:360,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{fontSize:22,marginBottom:10}}>⚠️</div>
        <div style={{fontWeight:700,color:T.dark,fontSize:15,marginBottom:20,lineHeight:1.5}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${T.gray100}`,background:T.white,color:T.gray500,fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",background:T.red,color:T.white,fontWeight:700,cursor:"pointer",fontSize:14}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── RetroDetail modal ────────────────────────────────────────────────────────
function RetroDetail({ room, onClose }) {
  const parts    = Object.values(room.participants||{}).filter(p=>p.submitted);
  const questions = room.questions||[];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:100,overflowY:"auto",padding:"24px 16px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{maxWidth:920,margin:"0 auto",background:T.white,borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"20px 28px",display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{color:T.white,fontWeight:900,fontSize:20}}>
              {room.sessionName||`Room: ${room.id}`}
              {room.sessionName&&<span style={{fontSize:13,fontWeight:400,marginLeft:8,opacity:.8}}>#{room.id}</span>}
            </div>
            <div style={{color:T.tealLight,fontSize:13,marginTop:2}}>
              {fmt(room.createdAt)} · Host: {room.hostName} · {parts.length} participant{parts.length!==1?"s":""}
              {room.teamName&&<span style={{marginLeft:8,background:"rgba(255,255,255,.2)",borderRadius:6,padding:"1px 8px"}}>{room.teamName}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",color:T.white,borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:14}}>✕ Close</button>
        </div>
        {/* Session link */}
        <div style={{background:T.tealBg,padding:"10px 28px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.gray100}`}}>
          <span style={{fontSize:12,color:T.tealDark,fontWeight:600}}>🔗 Session link:</span>
          <a href={`${window.location.origin}${window.location.pathname}#retro-${room.id}`}
            target="_blank" rel="noreferrer"
            style={{fontSize:13,color:T.teal,fontWeight:700,wordBreak:"break-all",textDecoration:"none"}}>
            {window.location.origin}{window.location.pathname}#retro-{room.id}
          </a>
          <button onClick={()=>navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#retro-${room.id}`)}
            style={{flexShrink:0,background:T.teal,color:T.white,border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:12,marginLeft:"auto"}}>
            Copy
          </button>
        </div>
        <div style={{padding:28}}>
          {/* Score averages */}
          {questions.length>0&&(
            <>
              <h3 style={{margin:"0 0 12px",color:T.tealDark,fontSize:15,fontWeight:800}}>📊 Score Averages</h3>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
                {questions.map((q,i)=>(
                  <div key={q.id} style={{flex:"1 1 130px",borderRadius:12,padding:"12px 16px",borderTop:`4px solid ${SCORE_COLORS[i%SCORE_COLORS.length]}`,boxShadow:`0 2px 10px ${SCORE_COLORS[i%SCORE_COLORS.length]}20`,background:T.white}}>
                    <div style={{fontSize:11,color:T.gray500,fontWeight:600,lineHeight:1.4,marginBottom:4}}>{q.label}</div>
                    <div style={{fontSize:28,fontWeight:900,color:SCORE_COLORS[i%SCORE_COLORS.length]}}>{scoreAvg(room.participants,q.id)}</div>
                    <div style={{fontSize:10,color:T.gray300}}>avg / {q.scale||5}</div>
                  </div>
                ))}
              </div>
              {/* Scores table */}
              {parts.length>0&&(
                <>
                  <h3 style={{margin:"0 0 10px",color:T.tealDark,fontSize:15,fontWeight:800}}>👥 Participant Scores</h3>
                  <div style={{borderRadius:12,overflow:"hidden",boxShadow:`0 2px 12px ${T.teal}15`,marginBottom:24,overflowX:"auto"}}>
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
                          const c=SCORE_COLORS[qi%SCORE_COLORS.length];
                          return(
                            <tr key={q.id} style={{background:qi%2===0?T.offWhite:T.white}}>
                              <td style={{padding:"9px 14px",fontSize:12,fontWeight:600,color:T.dark,borderLeft:`4px solid ${c}`}}>{q.label}</td>
                              {parts.map(p=>(
                                <td key={p.name} style={{padding:"9px 8px",textAlign:"center"}}>
                                  <span style={{background:c,color:T.white,borderRadius:6,padding:"2px 8px",fontWeight:800,fontSize:13}}>{p.scores?.[q.id]??"-"}</span>
                                </td>
                              ))}
                              <td style={{padding:"9px 8px",textAlign:"center",background:`${c}15`}}>
                                <span style={{background:c,color:T.white,borderRadius:6,padding:"2px 8px",fontWeight:900,fontSize:13}}>{scoreAvg(room.participants,q.id)}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
          {/* Board — post-it style list grouped by column */}
          <h3 style={{margin:"0 0 12px",color:T.tealDark,fontSize:15,fontWeight:800}}>🗒️ Board</h3>
          {COLUMNS.map(col=>{
            const c=COL_COLORS[col];
            const bg=COL_BG[col];
            const colCards=(room.boardEntries||[]).filter(e=>e.column===col)
              .sort((a,b)=>totalReactions(b)-totalReactions(a));
            if(!colCards.length) return null;
            return(
              <div key={col} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:12,height:12,borderRadius:3,background:c}}/>
                  <span style={{fontWeight:800,fontSize:14,color:c}}>{col}</span>
                  <span style={{background:`${c}20`,color:c,borderRadius:8,padding:"1px 8px",fontSize:11,fontWeight:700}}>{colCards.length}</span>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {colCards.map(card=>{
                    const rx=totalReactions(card);
                    const rxText=REACTIONS.filter(r=>card.reactions?.[r]&&Object.keys(card.reactions[r]).length>0)
                      .map(r=>`${r}${Object.keys(card.reactions[r]).length}`).join(" ");
                    return(
                      <div key={card.id} style={{width:160,background:bg,borderRadius:4,
                        boxShadow:`2px 2px 8px rgba(0,0,0,.12),inset 0 -3px 0 ${c}50`,
                        borderTop:`4px solid ${c}`,padding:"10px 10px 8px",position:"relative",flexShrink:0}}>
                        {rx>0&&(
                          <div style={{position:"absolute",top:-8,right:-8,background:c,color:"#fff",borderRadius:"50%",
                            width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>
                            {rx}
                          </div>
                        )}
                        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:5}}>
                          <span style={{background:c,color:"#fff",borderRadius:5,padding:"1px 6px",fontSize:8,fontWeight:800}}>{col}</span>
                          <span style={{fontSize:9,color:T.gray500,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{card.participantName}</span>
                        </div>
                        <div style={{fontSize:12,color:"#333",lineHeight:1.4,marginBottom:rxText?5:0,wordBreak:"break-word"}}>{card.text}</div>
                        {rxText&&<div style={{fontSize:10,color:T.gray500,marginBottom:4}}>{rxText}</div>}
                        {(card.actions||[]).length>0&&(
                          <div style={{borderTop:`1px solid ${c}30`,paddingTop:4,marginTop:4}}>
                            <div style={{fontSize:9,fontWeight:800,color:c,marginBottom:2}}>ACTIONS</div>
                            {(card.actions||[]).map((a,i)=>{
                              const text=typeof a==="object"?a.text:a;
                              const isDone=typeof a==="object"&&a.status==="done";
                              const who=typeof a==="object"&&a.assignee?a.assignee:null;
                              const due=typeof a==="object"&&a.dueDate?a.dueDate:null;
                              return(
                                <div key={i} style={{fontSize:10,color:isDone?T.gray300:T.gray700,marginBottom:2,textDecoration:isDone?"line-through":"none"}}>
                                  {isDone?"✓":"⚡"} {text}
                                  {who&&<span style={{color:T.gray300}}> @{who}</span>}
                                  {due&&<span style={{color:T.gray300}}> · {due}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TeamModal — add / edit team ──────────────────────────────────────────────
function TeamModal({ team, onSave, onClose }) {
  const [name, setName] = useState(team?.name||"");
  const [desc, setDesc] = useState(team?.description||"");
  const [saving, setSaving] = useState(false);
  const isEdit = !!team;

  async function handleSave() {
    if(!name.trim()) return;
    setSaving(true);
    await onSave({ ...(team||{}), id: team?.id||uid(), name:name.trim(), description:desc.trim(), createdAt: team?.createdAt||nowISO() });
    onClose();
  }

  const inp={width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${T.gray100}`,fontSize:14,color:T.dark,outline:"none",boxSizing:"border-box",background:T.white};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",maxWidth:460,background:T.white,borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"18px 24px",display:"flex",alignItems:"center"}}>
          <span style={{color:T.white,fontWeight:900,fontSize:18}}>{isEdit?"✏️ Edit Team":"➕ New Team"}</span>
          <button onClick={onClose} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",color:T.white,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
        <div style={{padding:24}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:T.gray500,display:"block",marginBottom:5}}>Team Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Platform Team" autoFocus style={inp}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:700,color:T.gray500,display:"block",marginBottom:5}}>Description (optional)</label>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. Backend & infra squad" style={inp}/>
          </div>
          <button onClick={handleSave} disabled={saving||!name.trim()}
            style={{width:"100%",background:T.teal,color:T.white,border:"none",borderRadius:12,padding:"12px 0",fontWeight:700,fontSize:14,cursor:name.trim()?"pointer":"default",opacity:name.trim()?1:.5}}>
            {saving?"Saving…": isEdit?"Save Changes":"Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ActionsModal ─────────────────────────────────────────────────────────────
function ActionsModal({ room, onClose, onToggleAction }) {
  const allActions = (room.boardEntries||[]).flatMap(card=>
    (card.actions||[]).filter(a=>typeof a==="object").map(a=>({...a, cardText:card.text, cardColumn:card.column, cardId:card.id}))
  );
  const total  = allActions.length;
  const done   = allActions.filter(a=>a.status==="done").length;
  const COL_C  = { Stop:"#FF6B6B", Start:"#34D399", Continue:"#60A5FA" };

  function fmtDate(iso){
    if(!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:100,overflowY:"auto",padding:"24px 16px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{maxWidth:860,margin:"0 auto",background:"#fff",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,#076F6F,#0D9E9E)`,padding:"18px 24px",display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:18}}>
              ⚡ Actions — {room.sessionName||room.id}
            </div>
            <div style={{color:"#7FDADA",fontSize:12,marginTop:2}}>
              {done}/{total} completed · {room.teamName||"No team"}
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:done===total&&total>0?"#10B981":"#F59E0B",color:"#fff",borderRadius:8,padding:"4px 12px",fontWeight:800,fontSize:13}}>
              {done===total&&total>0?"✅ All Done":`${done}/${total} Done`}
            </span>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:14}}>✕</button>
          </div>
        </div>

        {/* Table */}
        <div style={{padding:24}}>
          {allActions.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:"#9BB8B8",fontSize:15}}>No actions yet</div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#E6F7F7"}}>
                  {["Action","Status","Card","Assignee","Due Date","Created","Completed"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:800,color:"#076F6F",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                  <th style={{padding:"10px 12px"}}/>
                </tr>
              </thead>
              <tbody>
                {allActions.map((a,i)=>{
                  const isDone=a.status==="done";
                  const cc=COL_C[a.cardColumn]||"#aaa";
                  return(
                    <tr key={a.id||i} style={{background:i%2===0?"#F8FAFA":"#fff",borderBottom:"1px solid #DDE8E8"}}>
                      <td style={{padding:"10px 12px",fontSize:13,color:isDone?"#9BB8B8":"#0A2020",textDecoration:isDone?"line-through":"none",maxWidth:200}}>
                        {a.text}
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{background:isDone?"#D1FAE5":"#FEF3C7",color:isDone?"#065F46":"#92400E",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
                          {isDone?"Done":"Open"}
                        </span>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{background:`${cc}20`,color:cc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                          {a.cardColumn}
                        </span>
                        <div style={{fontSize:10,color:"#9BB8B8",marginTop:2,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.cardText}</div>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#5A7878"}}>{a.assignee||"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,color:a.dueDate&&!isDone&&new Date(a.dueDate)<new Date()?"#EF4444":"#5A7878",fontWeight:a.dueDate&&!isDone&&new Date(a.dueDate)<new Date()?700:400}}>
                        {a.dueDate||"—"}
                      </td>
                      <td style={{padding:"10px 12px",fontSize:11,color:"#9BB8B8",whiteSpace:"nowrap"}}>{fmtDate(a.createdAt)}</td>
                      <td style={{padding:"10px 12px",fontSize:11,color:"#9BB8B8",whiteSpace:"nowrap"}}>{fmtDate(a.completedAt)}</td>
                      <td style={{padding:"10px 8px",whiteSpace:"nowrap"}}>
                        <button onClick={()=>onToggleAction(room.id, a.cardId, a.id)}
                          style={{background:isDone?"#FEF3C7":"#D1FAE5",color:isDone?"#92400E":"#065F46",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                          {isDone?"Reopen":"Complete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SessionRow ───────────────────────────────────────────────────────────────
function SessionRow({ room, onView, onDelete, onRejoin, onActions }) {
  const parts = Object.values(room.participants||{}).filter(p=>p.submitted);
  const allActions=(room.boardEntries||[]).flatMap(c=>(c.actions||[]).filter(a=>typeof a==="object"));
  const totalAct=allActions.length;
  const doneAct=allActions.filter(a=>a.status==="done").length;
  const allDone=totalAct>0&&doneAct===totalAct;

  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:T.white,borderRadius:12,marginBottom:6,
      border:"1.5px solid transparent",transition:"border .15s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=`${T.teal}40`}
      onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
      <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:room.revealed?"#10B981":T.orange}}/>
      <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>onView(room)}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {room.sessionName&&<span style={{fontWeight:800,fontSize:14,color:T.dark}}>{room.sessionName}</span>}
          <span style={{fontWeight:room.sessionName?400:800,fontSize:room.sessionName?12:13,color:room.sessionName?T.gray500:T.dark,fontFamily:"monospace"}}>
            {room.sessionName?"(":""}#{room.id}{room.sessionName?")":""}
          </span>
          <span style={{background:room.revealed?"#D1FAE5":"#FEF3C7",color:room.revealed?"#065F46":"#92400E",borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}}>
            {room.revealed?"Completed":"In Progress"}
          </span>
        </div>
        <div style={{fontSize:11,color:T.gray500,marginTop:2}}>
          Host: {room.hostName} · {fmt(room.createdAt)} · {parts.length} participant{parts.length!==1?"s":""}
        </div>
      </div>
      {/* Actions button */}
      {totalAct>0&&(
        <button onClick={e=>{e.stopPropagation();onActions(room);}}
          style={{flexShrink:0,background:allDone?"#D1FAE5":"#FEF3C7",
            color:allDone?"#065F46":"#92400E",
            border:`1px solid ${allDone?"#10B98140":"#F59E0B40"}`,
            borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:11,
            display:"flex",alignItems:"center",gap:5}}>
          ⚡ {doneAct}/{totalAct}
        </button>
      )}
      {!room.revealed&&(
        <button onClick={()=>onRejoin(room.id)}
          style={{flexShrink:0,background:T.tealBg,color:T.tealDark,border:`1px solid ${T.teal}40`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
          🔗 Join Board
        </button>
      )}
      {room.revealed&&(
        <button onClick={()=>onRejoin(room.id)}
          style={{flexShrink:0,background:"#EFF6FF",color:"#60A5FA",border:"1px solid #60A5FA40",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
          👁 View Board
        </button>
      )}
      <button onClick={()=>onView(room)}
        style={{flexShrink:0,background:T.offWhite,color:T.gray500,border:`1px solid ${T.gray100}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:600,fontSize:12}}>
        📋 Summary
      </button>
      <button onClick={e=>{e.stopPropagation();onDelete(room);}}
        style={{flexShrink:0,background:"#FEF2F2",color:"#EF4444",border:"1px solid #EF444430",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
        🗑
      </button>
    </div>
  );
}

// ─── TeamActionsModal ─────────────────────────────────────────────────────────
function TeamActionsModal({ team, rooms, onClose, onToggleAction }) {
  const [filter, setFilter] = useState("all"); // all | open | done
  const teamRooms = rooms.filter(r=>r.teamId===team.id);

  const allActions = teamRooms.flatMap(room=>
    (room.boardEntries||[]).flatMap(card=>
      (card.actions||[]).filter(a=>typeof a==="object").map(a=>({
        ...a, cardText:card.text, cardColumn:card.column, cardId:card.id,
        roomId:room.id, sessionName:room.sessionName||room.id, roomCreatedAt:room.createdAt,
      }))
    )
  );

  const filtered = filter==="all" ? allActions
    : filter==="open" ? allActions.filter(a=>a.status!=="done")
    : allActions.filter(a=>a.status==="done");

  const total=allActions.length, done=allActions.filter(a=>a.status==="done").length;
  const COL_C = { Stop:"#FF6B6B", Start:"#34D399", Continue:"#60A5FA" };

  function fmtDate(iso){ if(!iso) return "—"; return new Date(iso).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:100,overflowY:"auto",padding:"24px 16px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{maxWidth:960,margin:"0 auto",background:"#fff",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,#076F6F,#0D9E9E)`,padding:"18px 24px",display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{color:"#fff",fontWeight:900,fontSize:18}}>👥 Team Actions — {team.name}</div>
            <div style={{color:"#7FDADA",fontSize:12,marginTop:2}}>
              {done}/{total} completed · {teamRooms.length} session{teamRooms.length!==1?"s":""}
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            {["all","open","done"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{background:filter===f?"rgba(255,255,255,.3)":"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontWeight:filter===f?800:500,fontSize:12}}>
                {f==="all"?`All (${total})`:f==="open"?`Open (${total-done})`:`Done (${done})`}
              </button>
            ))}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:14}}>✕</button>
          </div>
        </div>
        <div style={{padding:24}}>
          {filtered.length===0 ? (
            <div style={{textAlign:"center",padding:"40px 0",color:"#9BB8B8",fontSize:15}}>No actions</div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#E6F7F7"}}>
                  {["Action","Status","Session","Card","Assignee","Due Date","Created","Completed"].map(h=>(
                    <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:800,color:"#076F6F",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                  <th style={{padding:"9px 10px"}}/>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a,i)=>{
                  const isDone=a.status==="done";
                  const cc=COL_C[a.cardColumn]||"#aaa";
                  const overdue=a.dueDate&&!isDone&&new Date(a.dueDate)<new Date();
                  return(
                    <tr key={`${a.roomId}-${a.id||i}`} style={{background:i%2===0?"#F8FAFA":"#fff",borderBottom:"1px solid #DDE8E8"}}>
                      <td style={{padding:"9px 10px",fontSize:13,color:isDone?"#9BB8B8":"#0A2020",textDecoration:isDone?"line-through":"none",maxWidth:180}}>{a.text}</td>
                      <td style={{padding:"9px 10px"}}>
                        <span style={{background:isDone?"#D1FAE5":"#FEF3C7",color:isDone?"#065F46":"#92400E",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{isDone?"Done":"Open"}</span>
                      </td>
                      <td style={{padding:"9px 10px",fontSize:11,color:"#5A7878",whiteSpace:"nowrap"}}>{a.sessionName}</td>
                      <td style={{padding:"9px 10px"}}>
                        <span style={{background:`${cc}20`,color:cc,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700}}>{a.cardColumn}</span>
                        <div style={{fontSize:9,color:"#9BB8B8",marginTop:1,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.cardText}</div>
                      </td>
                      <td style={{padding:"9px 10px",fontSize:12,color:"#5A7878"}}>{a.assignee||"—"}</td>
                      <td style={{padding:"9px 10px",fontSize:12,color:overdue?"#EF4444":"#5A7878",fontWeight:overdue?700:400}}>{a.dueDate||"—"}</td>
                      <td style={{padding:"9px 10px",fontSize:11,color:"#9BB8B8",whiteSpace:"nowrap"}}>{fmtDate(a.createdAt)}</td>
                      <td style={{padding:"9px 10px",fontSize:11,color:"#9BB8B8",whiteSpace:"nowrap"}}>{fmtDate(a.completedAt)}</td>
                      <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>
                        <button onClick={()=>onToggleAction(a.roomId, a.cardId, a.id)}
                          style={{background:isDone?"#FEF3C7":"#D1FAE5",color:isDone?"#92400E":"#065F46",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                          {isDone?"Reopen":"Complete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TeamSection ──────────────────────────────────────────────────────────────
function TeamSection({ team, rooms, onEditTeam, onDeleteTeam, onViewRoom, onDeleteRoom, onRejoinRoom, onActionsRoom, onTeamActions }) {
  const [open, setOpen] = useState(true);
  const teamRooms = rooms.filter(r=>r.teamId===team.id);
  const teamAllActions = teamRooms.flatMap(r=>(r.boardEntries||[]).flatMap(c=>(c.actions||[]).filter(a=>typeof a==="object")));
  const teamDone = teamAllActions.filter(a=>a.status==="done").length;
  const teamTotal = teamAllActions.length;
  const allDone = teamTotal>0 && teamDone===teamTotal;

  return (
    <div style={{background:T.offWhite,borderRadius:16,overflow:"hidden",marginBottom:12,border:`1.5px solid ${T.gray100}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",cursor:"pointer",background:T.white}}
        onClick={()=>setOpen(o=>!o)}>
        <span style={{fontSize:18}}>👥</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,color:T.dark}}>{team.name}</div>
          {team.description&&<div style={{fontSize:12,color:T.gray500}}>{team.description}</div>}
        </div>
        <span style={{background:T.tealBg,color:T.tealDark,borderRadius:8,padding:"2px 10px",fontSize:12,fontWeight:700}}>{teamRooms.length} session{teamRooms.length!==1?"s":""}</span>
        {teamTotal>0&&(
          <button onClick={e=>{e.stopPropagation();onTeamActions(team);}}
            style={{background:allDone?"#D1FAE5":"#FEF3C7",color:allDone?"#065F46":"#92400E",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
            ⚡ Team Actions {teamDone}/{teamTotal}
          </button>
        )}
        <button onClick={e=>{e.stopPropagation();onEditTeam(team);}}
          style={{background:T.tealBg,color:T.tealDark,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>✏️</button>
        <button onClick={e=>{e.stopPropagation();onDeleteTeam(team);}}
          style={{background:T.redBg,color:T.red,border:`1px solid ${T.red}30`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>🗑</button>
        <span style={{color:T.gray300,fontSize:18,display:"inline-block",transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>›</span>
      </div>
      {open&&(
        <div style={{padding:"10px 14px 14px"}}>
          {teamRooms.length===0
            ? <div style={{textAlign:"center",color:T.gray300,fontSize:13,padding:"16px 0"}}>No sessions yet</div>
            : teamRooms.map(r=><SessionRow key={r.id} room={r} onView={onViewRoom} onDelete={onDeleteRoom} onRejoin={onRejoinRoom} onActions={onActionsRoom}/>)
          }
        </div>
      )}
    </div>
  );
}

// ─── AdminPanel ───────────────────────────────────────────────────────────────
export default function AdminPanel({ user, onNewSession, onRejoinSession, onOpenThemePicker }) {
  const isSuperAdmin = user.email === SUPERADMIN_EMAIL;
  const [tab,           setTab]           = useState("my");
  const [rooms,         setRooms]         = useState([]);
  const [allRooms,      setAllRooms]      = useState([]);
  const [teams,         setTeams]         = useState([]);
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedRoom,  setSelectedRoom]  = useState(null);
  const [actionsRoom,   setActionsRoom]   = useState(null);
  const [teamActionsData, setTeamActionsData] = useState(null); // {team, rooms}
  const [teamModal,     setTeamModal]     = useState(null);
  const [confirm,       setConfirm]       = useState(null);
  const [search,        setSearch]        = useState("");
  const [superSearch,   setSuperSearch]   = useState("");

  const loadData = useCallback(async ()=>{
    setLoading(true);
    const promises = [getAllRooms(user.uid), getAllTeams(user.uid)];
    if(isSuperAdmin) promises.push(getAllRoomsAll(), getAllUsers());
    const [r,t,all,usr] = await Promise.all(promises);
    setRooms(r); setTeams(t);
    if(isSuperAdmin){ setAllRooms(all||[]); setUsers(usr||[]); }
    setLoading(false);
  },[user.uid, isSuperAdmin]);

  useEffect(()=>{ loadData(); },[loadData]);

  async function handleToggleAction(roomId, cardId, actionId){
    const { ref: fbRef, get: fbGet2, update: fbUpdate } = await import("firebase/database");
    const { db: fbDb } = await import("./firebase.js");
    const snap = await fbGet2(fbRef(fbDb,`rooms/${roomId}`));
    if(!snap.exists()) return;
    const r = snap.val();
    const updatedEntries=(r.boardEntries||[]).map(c=>{
      if(c.id!==cardId) return c;
      const actions=(c.actions||[]).map(a=>{
        if(typeof a!=="object"||a.id!==actionId) return a;
        return a.status==="done"
          ? {...a,status:"open",completedAt:null}
          : {...a,status:"done",completedAt:new Date().toISOString()};
      });
      return {...c,actions};
    });
    await fbUpdate(fbRef(fbDb,`rooms/${roomId}`),{boardEntries:updatedEntries});

    // Update all local state that might reference this room
    const patchRoom = room => room.id===roomId ? {...room,boardEntries:updatedEntries} : room;

    setRooms(prev=>prev.map(patchRoom));
    setAllRooms(prev=>prev.map(patchRoom));
    setActionsRoom(prev=>prev?.id===roomId ? {...prev,boardEntries:updatedEntries} : prev);
    setTeamActionsData(prev=>prev ? {...prev, rooms: prev.rooms.map(patchRoom)} : prev);
  }

  // ── Team CRUD
  async function handleSaveTeam(team) {
    await saveTeam({ ...team, createdBy: user.uid });
    await loadData();
  }

  function handleEditTeam(team)   { setTeamModal(team); }
  function handleNewTeam()        { setTeamModal("new"); }

  function handleDeleteTeam(team) {
    setConfirm({
      message: `Delete team "${team.name}"? Sessions assigned to this team will become unassigned.`,
      onConfirm: async ()=>{
        await deleteTeam(team.id);
        await loadData();
        setConfirm(null);
      }
    });
  }

  // ── Room CRUD
  function handleDeleteRoom(room) {
    setConfirm({
      message: `Delete session "${room.id}" hosted by ${room.hostName}? This cannot be undone.`,
      onConfirm: async ()=>{
        await deleteRoom(room.id);
        setRooms(prev=>prev.filter(r=>r.id!==room.id));
        setConfirm(null);
      }
    });
  }

  // ── Filter
  const unassignedRooms = rooms.filter(r=>!r.teamId||!teams.find(t=>t.id===r.teamId));
  const filteredUnassigned = search
    ? unassignedRooms.filter(r=>r.id.includes(search)||r.hostName?.toLowerCase().includes(search.toLowerCase()))
    : unassignedRooms;
  const filteredTeams = search
    ? teams.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())||rooms.some(r=>r.teamId===t.id&&(r.id.includes(search)||r.hostName?.toLowerCase().includes(search.toLowerCase()))))
    : teams;

  const stats = {
    total:        rooms.length,
    revealed:     rooms.filter(r=>r.revealed).length,
    participants: rooms.reduce((s,r)=>s+Object.values(r.participants||{}).filter(p=>p.submitted).length,0),
  };

  return (
    <div style={{minHeight:"100vh",background:"#E8F8F5",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"16px 28px",display:"flex",alignItems:"center",gap:16,boxShadow:`0 4px 20px ${T.teal}40`}}>
        <div style={{fontSize:28}}>🔄</div>
        <div>
          <div style={{color:T.white,fontWeight:900,fontSize:20,display:"flex",alignItems:"center",gap:8}}>
            RetroBoard Admin
            {isSuperAdmin&&<span style={{background:"#F59E0B",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>⭐ SuperAdmin</span>}
          </div>
          <div style={{color:T.tealLight,fontSize:12}}>{user.displayName} · {user.email}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={onNewSession} style={{background:T.orange,color:T.white,border:"none",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>⚡ New Session</button>
          <button onClick={handleNewTeam} style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>➕ New Team</button>
          <button onClick={loadData} style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>🔄 Refresh</button>
          {onOpenThemePicker&&<button onClick={onOpenThemePicker} style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>🎨 Theme</button>}
          <button onClick={signOutUser} style={{background:"rgba(255,0,0,.2)",color:T.white,border:"1px solid rgba(255,100,100,.4)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>Sign Out</button>
        </div>
      </div>

      {/* Tabs — only shown to superadmin */}
      {isSuperAdmin&&(
        <div style={{background:T.white,borderBottom:`2px solid ${T.gray100}`,display:"flex",gap:0}}>
          {[
            {id:"my",    label:"My Sessions"},
            {id:"super", label:"⭐ All Sessions (SuperAdmin)"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"12px 28px",border:"none",borderBottom:tab===t.id?`3px solid ${T.teal}`:"3px solid transparent",
                background:"none",fontWeight:tab===t.id?800:500,fontSize:14,
                color:tab===t.id?T.tealDark:T.gray500,cursor:"pointer",transition:"all .15s",marginBottom:-2}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px"}}>
        {tab==="super" ? (
          /* ── SuperAdmin view ── */
          <>
            <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
              {[
                {label:"Total Sessions",    value:allRooms.length,                         color:T.teal,    icon:"🔄"},
                {label:"Completed",         value:allRooms.filter(r=>r.revealed).length,   color:"#10B981", icon:"✅"},
                {label:"In Progress",       value:allRooms.filter(r=>!r.revealed).length,  color:T.orange,  icon:"⏳"},
                {label:"Total Participants",value:allRooms.reduce((s,r)=>s+Object.values(r.participants||{}).filter(p=>p.submitted).length,0), color:"#8B5CF6", icon:"👥"},
                {label:"Admin Members",     value:users.length,                            color:"#EC4899", icon:"🧑‍💼"},
              ].map(s=>(
                <div key={s.label} style={{flex:"1 1 130px",background:T.white,borderRadius:14,padding:"14px 18px",boxShadow:`0 3px 14px ${s.color}20`,borderTop:`4px solid ${s.color}`}}>
                  <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:26,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:T.gray500,fontWeight:600}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Members list */}
            {users.length>0&&(
              <div style={{background:T.white,borderRadius:16,padding:"16px 20px",marginBottom:20,boxShadow:`0 2px 10px ${T.teal}10`}}>
                <div style={{fontWeight:800,fontSize:13,color:T.gray500,marginBottom:12,letterSpacing:".5px"}}>🧑‍💼 ADMIN MEMBERS ({users.length})</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {users.map(u=>{
                    const userRooms=allRooms.filter(r=>r.createdBy===u.uid);
                    return(
                      <div key={u.uid} style={{display:"flex",alignItems:"center",gap:10,background:T.offWhite,borderRadius:12,padding:"10px 14px",minWidth:220,border:`1.5px solid ${T.gray100}`}}>
                        {u.photoURL
                          ? <img src={u.photoURL} alt="" style={{width:36,height:36,borderRadius:"50%",flexShrink:0}}/>
                          : <div style={{width:36,height:36,borderRadius:"50%",background:T.teal,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16,flexShrink:0}}>{(u.displayName||u.email||"?")[0].toUpperCase()}</div>
                        }
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:T.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.displayName||"—"}</div>
                          <div style={{fontSize:11,color:T.gray500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                          <div style={{fontSize:10,color:T.gray300,marginTop:1}}>{userRooms.length} session{userRooms.length!==1?"s":""}</div>
                        </div>
                        {u.email===SUPERADMIN_EMAIL&&<span style={{background:"#F59E0B",color:"#fff",borderRadius:5,padding:"1px 6px",fontSize:9,fontWeight:800,flexShrink:0}}>⭐</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{background:T.white,borderRadius:12,padding:"12px 16px",marginBottom:16,boxShadow:`0 2px 10px ${T.teal}10`}}>
              <input value={superSearch} onChange={e=>setSuperSearch(e.target.value)}
                placeholder="🔍 Search by room ID, host, session name or team…"
                style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,outline:"none",color:T.dark,boxSizing:"border-box"}}/>
            </div>
            {loading?(
              <div style={{textAlign:"center",padding:"60px 0",color:T.gray300}}>Loading…</div>
            ):(
              <div style={{background:T.offWhite,borderRadius:16,padding:"10px 14px 14px",border:`1.5px solid ${T.gray100}`}}>
                {allRooms
                  .filter(r=>!superSearch||r.id.includes(superSearch)||r.hostName?.toLowerCase().includes(superSearch.toLowerCase())||r.sessionName?.toLowerCase().includes(superSearch.toLowerCase())||r.teamName?.toLowerCase().includes(superSearch.toLowerCase()))
                  .map(r=>{
                    const parts=Object.values(r.participants||{}).filter(p=>p.submitted);
                    const allActs=(r.boardEntries||[]).flatMap(c=>(c.actions||[]).filter(a=>typeof a==="object"));
                    const doneActs=allActs.filter(a=>a.status==="done").length;
                    return(
                      <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",background:T.white,borderRadius:12,marginBottom:6,border:"1.5px solid transparent",transition:"border .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=`${T.teal}40`}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
                        <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:r.revealed?"#10B981":T.orange}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            {r.sessionName&&<span style={{fontWeight:800,fontSize:14,color:T.dark}}>{r.sessionName}</span>}
                            <span style={{fontSize:12,color:T.gray500,fontFamily:"monospace"}}>#{r.id}</span>
                            {r.teamName&&<span style={{background:T.tealBg,color:T.tealDark,borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}}>{r.teamName}</span>}
                            <span style={{background:r.revealed?"#D1FAE5":"#FEF3C7",color:r.revealed?"#065F46":"#92400E",borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}}>
                              {r.revealed?"Completed":"In Progress"}
                            </span>
                          </div>
                          <div style={{fontSize:11,color:T.gray500,marginTop:2}}>
                            Host: <strong>{r.hostName}</strong> · {fmt(r.createdAt)} · {parts.length} participant{parts.length!==1?"s":""}
                            {r.createdBy&&<span style={{marginLeft:8,color:T.gray300}}>by {r.createdBy.slice(0,8)}…</span>}
                            {allActs.length>0&&<span style={{marginLeft:8,color:allActs.length===doneActs?"#10B981":"#F59E0B",fontWeight:700}}>⚡ {doneActs}/{allActs.length} actions</span>}
                          </div>
                        </div>
                        {/* Actions btn */}
                        {allActs.length>0&&(
                          <button onClick={()=>setActionsRoom(r)}
                            style={{flexShrink:0,background:doneActs===allActs.length?"#D1FAE5":"#FEF3C7",color:doneActs===allActs.length?"#065F46":"#92400E",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                            ⚡ {doneActs}/{allActs.length}
                          </button>
                        )}
                        <button onClick={()=>setSelectedRoom(r)}
                          style={{flexShrink:0,background:T.offWhite,color:T.gray500,border:`1px solid ${T.gray100}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:600,fontSize:12}}>
                          📋 Summary
                        </button>
                        <button onClick={()=>onRejoinSession(r.id)}
                          style={{flexShrink:0,background:r.revealed?"#EFF6FF":"#E6F7F7",color:r.revealed?"#60A5FA":T.tealDark,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
                          {r.revealed?"👁 View Board":"🔗 Join Board"}
                        </button>
                        <button onClick={()=>setConfirm({message:`Delete session #${r.id}?`,onConfirm:async()=>{await deleteRoom(r.id);setAllRooms(p=>p.filter(x=>x.id!==r.id));setConfirm(null);}})}
                          style={{flexShrink:0,background:"#FEF2F2",color:"#EF4444",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>🗑</button>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </>
        ) : (
          /* ── My Sessions view ── */
          <>
            <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
              {[
                {label:"Total Sessions",     value:stats.total,              color:T.teal,    icon:"🔄"},
                {label:"Completed",          value:stats.revealed,           color:"#10B981", icon:"✅"},
                {label:"In Progress",        value:stats.total-stats.revealed, color:T.orange, icon:"⏳"},
                {label:"Total Participants", value:stats.participants,       color:"#8B5CF6", icon:"👥"},
                {label:"Teams",              value:teams.length,             color:"#EC4899", icon:"👥"},
              ].map(s=>(
                <div key={s.label} style={{flex:"1 1 130px",background:T.white,borderRadius:14,padding:"14px 18px",boxShadow:`0 3px 14px ${s.color}20`,borderTop:`4px solid ${s.color}`}}>
                  <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:26,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:T.gray500,fontWeight:600}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:T.white,borderRadius:12,padding:"12px 16px",marginBottom:20,boxShadow:`0 2px 10px ${T.teal}10`}}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="🔍 Search sessions or teams…"
                style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,outline:"none",color:T.dark,boxSizing:"border-box"}}/>
            </div>
            {loading ? (
              <div style={{textAlign:"center",padding:"60px 0",color:T.gray300,fontSize:16}}>Loading…</div>
            ) : (
              <>
                {filteredTeams.length>0&&(
                  <div style={{marginBottom:8}}>
                    <div style={{fontWeight:800,fontSize:13,color:T.gray500,marginBottom:10,letterSpacing:".5px"}}>TEAMS</div>
                    {filteredTeams.map(team=>(
                      <TeamSection key={team.id} team={team} rooms={rooms}
                        onEditTeam={handleEditTeam} onDeleteTeam={handleDeleteTeam}
                        onViewRoom={setSelectedRoom} onDeleteRoom={handleDeleteRoom}
                        onRejoinRoom={onRejoinSession} onActionsRoom={setActionsRoom}
                        onTeamActions={t=>setTeamActionsData({team:t, rooms})}/>
                    ))}
                  </div>
                )}
                {filteredUnassigned.length>0&&(
                  <div>
                    <div style={{fontWeight:800,fontSize:13,color:T.gray500,marginBottom:10,letterSpacing:".5px"}}>SESSIONS WITHOUT A TEAM</div>
                    <div style={{background:T.offWhite,borderRadius:16,padding:"10px 14px 14px",border:`1.5px solid ${T.gray100}`}}>
                      {filteredUnassigned.map(r=>(
                        <SessionRow key={r.id} room={r} onView={setSelectedRoom} onDelete={handleDeleteRoom} onRejoin={onRejoinSession} onActions={setActionsRoom}/>
                      ))}
                    </div>
                  </div>
                )}
                {filteredTeams.length===0&&filteredUnassigned.length===0&&(
                  <div style={{textAlign:"center",padding:"60px 0",color:T.gray300,fontSize:15}}>
                    {search?"No results found":"No sessions or teams yet"}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selectedRoom&&<RetroDetail room={selectedRoom} onClose={()=>setSelectedRoom(null)}/>}
      {actionsRoom&&<ActionsModal room={actionsRoom} onClose={()=>setActionsRoom(null)} onToggleAction={handleToggleAction}/>}
      {teamActionsData&&<TeamActionsModal team={teamActionsData.team} rooms={teamActionsData.rooms} onClose={()=>setTeamActionsData(null)} onToggleAction={handleToggleAction}/>}
      {teamModal&&<TeamModal team={teamModal==="new"?null:teamModal} onSave={handleSaveTeam} onClose={()=>setTeamModal(null)}/>}
      {confirm&&<Confirm message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}
