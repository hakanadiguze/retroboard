import { useState, useEffect, useCallback } from "react";
import { getAllRooms, getAllTeams, saveTeam, deleteTeam, deleteRoom, signOutUser, uid, nowISO } from "./firebase.js";

const T = {
  teal:"#0D9E9E", tealDark:"#076F6F", tealLight:"#7FDADA", tealBg:"#E6F7F7",
  orange:"#F07030", red:"#EF4444", redBg:"#FEF2F2",
  white:"#FFFFFF", offWhite:"#F8FAFA",
  gray50:"#F0F4F4", gray100:"#DDE8E8", gray300:"#9BB8B8",
  gray500:"#5A7878", gray700:"#2D4A4A", dark:"#0A2020",
};
const SCORE_COLORS = ["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];
const COL_COLORS   = { Stop:"#FF6B6B", Start:"#0D9E9E", Continue:"#F07030" };
const COLUMNS      = ["Stop","Start","Continue"];

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
          {/* Board */}
          <h3 style={{margin:"0 0 12px",color:T.tealDark,fontSize:15,fontWeight:800}}>🗂 Board</h3>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {COLUMNS.map(col=>{
              const c=COL_COLORS[col];
              const cards  =(room.boardEntries||[]).filter(e=>e.column===col);
              const actions=(room.actions?.[col])||[];
              return(
                <div key={col} style={{flex:"1 1 220px",borderRadius:14,overflow:"hidden",boxShadow:`0 2px 12px ${c}20`}}>
                  <div style={{background:c,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:T.white,fontWeight:800,fontSize:14}}>{col}</span>
                    <span style={{marginLeft:"auto",background:"rgba(255,255,255,.25)",color:T.white,borderRadius:12,padding:"1px 8px",fontSize:12,fontWeight:700}}>{cards.length}</span>
                  </div>
                  <div style={{background:T.offWhite,padding:10,minHeight:60}}>
                    {cards.map(card=>(
                      <div key={card.id} style={{background:T.white,borderRadius:8,padding:"7px 10px",marginBottom:6,border:`1px solid ${c}20`,fontSize:12}}>
                        <span style={{background:c,color:T.white,borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:700,marginRight:6}}>{card.participantName}</span>
                        {card.text}
                      </div>
                    ))}
                    {cards.length===0&&<div style={{textAlign:"center",color:T.gray300,fontSize:11,padding:"12px 0"}}>No cards</div>}
                  </div>
                  {actions.length>0&&(
                    <div style={{background:`${c}10`,padding:"8px 10px",borderTop:`1px solid ${c}25`}}>
                      <div style={{fontSize:10,fontWeight:800,color:c,marginBottom:4}}>⚡ ACTIONS</div>
                      {actions.map(a=><div key={a.id} style={{fontSize:11,color:T.gray700,marginBottom:3}}>• {a.text}</div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

// ─── SessionRow ───────────────────────────────────────────────────────────────
function SessionRow({ room, onView, onDelete, onRejoin }) {
  const parts = Object.values(room.participants||{}).filter(p=>p.submitted);
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:T.white,borderRadius:12,marginBottom:6,
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
      {!room.revealed&&(
        <button onClick={()=>onRejoin(room.id)}
          style={{flexShrink:0,background:T.tealBg,color:T.tealDark,border:`1px solid ${T.teal}40`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
          🔗 Rejoin
        </button>
      )}
      <button onClick={()=>onView(room)}
        style={{flexShrink:0,background:T.offWhite,color:T.gray500,border:`1px solid ${T.gray100}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:600,fontSize:12}}>
        View →
      </button>
      <button onClick={e=>{e.stopPropagation();onDelete(room);}}
        style={{flexShrink:0,background:"#FEF2F2",color:"#EF4444",border:"1px solid #EF444430",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
        🗑
      </button>
    </div>
  );
}

// ─── TeamSection ──────────────────────────────────────────────────────────────
function TeamSection({ team, rooms, onEditTeam, onDeleteTeam, onViewRoom, onDeleteRoom, onRejoinRoom }) {
  const [open, setOpen] = useState(true);
  const teamRooms = rooms.filter(r=>r.teamId===team.id);

  return (
    <div style={{background:T.offWhite,borderRadius:16,overflow:"hidden",marginBottom:12,border:`1.5px solid ${T.gray100}`}}>
      {/* Team header */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer",background:T.white}}
        onClick={()=>setOpen(o=>!o)}>
        <span style={{fontSize:18}}>👥</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,color:T.dark}}>{team.name}</div>
          {team.description&&<div style={{fontSize:12,color:T.gray500}}>{team.description}</div>}
        </div>
        <span style={{background:T.tealBg,color:T.tealDark,borderRadius:8,padding:"2px 10px",fontSize:12,fontWeight:700}}>{teamRooms.length} session{teamRooms.length!==1?"s":""}</span>
        <button onClick={e=>{e.stopPropagation();onEditTeam(team);}}
          style={{background:T.tealBg,color:T.tealDark,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>✏️</button>
        <button onClick={e=>{e.stopPropagation();onDeleteTeam(team);}}
          style={{background:T.redBg,color:T.red,border:`1px solid ${T.red}30`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>🗑</button>
        <span style={{color:T.gray300,fontSize:18,display:"inline-block",transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>›</span>
      </div>
      {/* Sessions */}
      {open&&(
        <div style={{padding:"10px 14px 14px"}}>
          {teamRooms.length===0
            ? <div style={{textAlign:"center",color:T.gray300,fontSize:13,padding:"16px 0"}}>No sessions yet</div>
            : teamRooms.map(r=><SessionRow key={r.id} room={r} onView={onViewRoom} onDelete={onDeleteRoom} onRejoin={onRejoinRoom}/>)
          }
        </div>
      )}
    </div>
  );
}

// ─── AdminPanel ───────────────────────────────────────────────────────────────
export default function AdminPanel({ user, onNewSession, onRejoinSession }) {
  const [rooms,        setRooms]        = useState([]);
  const [teams,        setTeams]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [teamModal,    setTeamModal]    = useState(null); // null | "new" | team obj
  const [confirm,      setConfirm]      = useState(null); // null | { message, onConfirm }
  const [search,       setSearch]       = useState("");

  const loadData = useCallback(async ()=>{
    setLoading(true);
    const [r,t] = await Promise.all([getAllRooms(user.uid), getAllTeams(user.uid)]);
    setRooms(r); setTeams(t); setLoading(false);
  },[user.uid]);

  useEffect(()=>{ loadData(); },[loadData]);

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
          <div style={{color:T.white,fontWeight:900,fontSize:20}}>RetroBoard Admin</div>
          <div style={{color:T.tealLight,fontSize:12}}>{user.displayName} · {user.email}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={onNewSession}
            style={{background:T.orange,color:T.white,border:"none",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>
            ⚡ New Session
          </button>
          <button onClick={handleNewTeam}
            style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            ➕ New Team
          </button>
          <button onClick={loadData}
            style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            🔄 Refresh
          </button>
          <button onClick={signOutUser}
            style={{background:"rgba(255,0,0,.2)",color:T.white,border:"1px solid rgba(255,100,100,.4)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px"}}>
        {/* Stats */}
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

        {/* Search */}
        <div style={{background:T.white,borderRadius:12,padding:"12px 16px",marginBottom:20,boxShadow:`0 2px 10px ${T.teal}10`}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Search sessions or teams…"
            style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,outline:"none",color:T.dark,boxSizing:"border-box"}}/>
        </div>

        {loading ? (
          <div style={{textAlign:"center",padding:"60px 0",color:T.gray300,fontSize:16}}>Loading…</div>
        ) : (
          <>
            {/* Teams with their sessions */}
            {filteredTeams.length>0&&(
              <div style={{marginBottom:8}}>
                <div style={{fontWeight:800,fontSize:13,color:T.gray500,marginBottom:10,letterSpacing:".5px"}}>TEAMS</div>
                {filteredTeams.map(team=>(
                  <TeamSection key={team.id} team={team} rooms={rooms}
                    onEditTeam={handleEditTeam} onDeleteTeam={handleDeleteTeam}
                    onViewRoom={setSelectedRoom} onDeleteRoom={handleDeleteRoom}
                    onRejoinRoom={onRejoinSession}/>
                ))}
              </div>
            )}

            {/* Unassigned sessions */}
            {filteredUnassigned.length>0&&(
              <div>
                <div style={{fontWeight:800,fontSize:13,color:T.gray500,marginBottom:10,letterSpacing:".5px"}}>SESSIONS WITHOUT A TEAM</div>
                <div style={{background:T.offWhite,borderRadius:16,padding:"10px 14px 14px",border:`1.5px solid ${T.gray100}`}}>
                  {filteredUnassigned.map(r=>(
                    <SessionRow key={r.id} room={r} onView={setSelectedRoom} onDelete={handleDeleteRoom} onRejoin={onRejoinSession}/>
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
      </div>

      {/* Modals */}
      {selectedRoom&&<RetroDetail room={selectedRoom} onClose={()=>setSelectedRoom(null)}/>}

      {teamModal&&(
        <TeamModal
          team={teamModal==="new"?null:teamModal}
          onSave={handleSaveTeam}
          onClose={()=>setTeamModal(null)}/>
      )}

      {confirm&&(
        <Confirm
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={()=>setConfirm(null)}/>
      )}
    </div>
  );
}
