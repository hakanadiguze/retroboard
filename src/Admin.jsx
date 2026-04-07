import { useState, useEffect } from "react";
import { getAllRooms, getAllTeams, saveTeam, signOutUser, uid, nowISO } from "./firebase.js";

const T = {
  teal:"#0D9E9E", tealDark:"#076F6F", tealLight:"#7FDADA", tealBg:"#E6F7F7",
  orange:"#F07030", orangeDark:"#C05020",
  white:"#FFFFFF", offWhite:"#F8FAFA",
  gray50:"#F0F4F4", gray100:"#DDE8E8", gray300:"#9BB8B8",
  gray500:"#5A7878", gray700:"#2D4A4A", dark:"#0A2020",
};
const COLORS = ["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];

function fmt(iso) {
  if(!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function avg(participants, qid) {
  const parts = Object.values(participants||{}).filter(p=>p.submitted);
  const vals = parts.map(p=>p.scores?.[qid]).filter(Boolean);
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "—";
}

// ─── RetroDetail modal ────────────────────────────────────────────────────────
function RetroDetail({ room, onClose }) {
  const parts    = Object.values(room.participants||{}).filter(p=>p.submitted);
  const questions = room.questions||[];
  const colors    = ["#0D9E9E","#F07030","#8B5CF6","#EC4899","#10B981"];
  const COLUMNS   = ["Stop","Start","Continue"];
  const COL_COLORS = { Stop:"#FF6B6B", Start:"#0D9E9E", Continue:"#F07030" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:100,overflowY:"auto",padding:"24px 16px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{maxWidth:900,margin:"0 auto",background:T.white,borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"20px 28px",display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{color:T.white,fontWeight:900,fontSize:20}}>Retro: {room.id}</div>
            <div style={{color:T.tealLight,fontSize:13,marginTop:2}}>
              {fmt(room.createdAt)} · Host: {room.hostName} · {parts.length} participant{parts.length!==1?"s":""}
              {room.teamName&&<span style={{marginLeft:8,background:"rgba(255,255,255,.2)",borderRadius:6,padding:"1px 8px"}}>{room.teamName}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",color:T.white,borderRadius:10,padding:"8px 14px",cursor:"pointer",fontWeight:700,fontSize:14}}>✕ Close</button>
        </div>

        <div style={{padding:28}}>
          {/* Score cards */}
          <h3 style={{margin:"0 0 14px",color:T.tealDark,fontSize:16,fontWeight:800}}>📊 Score Averages</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
            {questions.map((q,i)=>(
              <div key={q.id} style={{flex:"1 1 140px",borderRadius:12,padding:"12px 16px",borderTop:`4px solid ${colors[i%colors.length]}`,boxShadow:`0 2px 10px ${colors[i%colors.length]}20`,background:T.white}}>
                <div style={{fontSize:11,color:T.gray500,fontWeight:600,lineHeight:1.4,marginBottom:4}}>{q.label}</div>
                <div style={{fontSize:28,fontWeight:900,color:colors[i%colors.length]}}>{avg(room.participants,q.id)}</div>
                <div style={{fontSize:10,color:T.gray300}}>avg / {q.scale||5}</div>
              </div>
            ))}
          </div>

          {/* Scores table */}
          {parts.length>0&&(
            <>
              <h3 style={{margin:"0 0 12px",color:T.tealDark,fontSize:16,fontWeight:800}}>👥 Participant Scores</h3>
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
                      const c=colors[qi%colors.length];
                      return(
                        <tr key={q.id} style={{background:qi%2===0?T.offWhite:T.white}}>
                          <td style={{padding:"9px 14px",fontSize:12,fontWeight:600,color:T.dark,borderLeft:`4px solid ${c}`}}>{q.label}</td>
                          {parts.map(p=>(
                            <td key={p.name} style={{padding:"9px 8px",textAlign:"center"}}>
                              <span style={{background:c,color:T.white,borderRadius:6,padding:"2px 8px",fontWeight:800,fontSize:13}}>{p.scores?.[q.id]??"-"}</span>
                            </td>
                          ))}
                          <td style={{padding:"9px 8px",textAlign:"center",background:`${c}15`}}>
                            <span style={{background:c,color:T.white,borderRadius:6,padding:"2px 8px",fontWeight:900,fontSize:13}}>{avg(room.participants,q.id)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Board */}
          <h3 style={{margin:"0 0 12px",color:T.tealDark,fontSize:16,fontWeight:800}}>🗂 Board</h3>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
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

// ─── TeamManager ──────────────────────────────────────────────────────────────
function TeamManager({ teams, onSave, onClose }) {
  const [name,   setName]   = useState("");
  const [desc,   setDesc]   = useState("");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    if(!name.trim()) return;
    setSaving(true);
    await onSave({ id:uid(), name:name.trim(), description:desc.trim(), createdAt:nowISO() });
    setSaved(true); setSaving(false);
    setName(""); setDesc("");
    setTimeout(()=>setSaved(false),2000);
  }

  const inp = {width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${T.gray100}`,fontSize:14,color:T.dark,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",maxWidth:560,background:T.white,borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${T.tealDark},${T.teal})`,padding:"18px 24px",display:"flex",alignItems:"center"}}>
          <span style={{color:T.white,fontWeight:900,fontSize:18}}>👥 Teams</span>
          <button onClick={onClose} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",color:T.white,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
        <div style={{padding:24}}>
          {/* Existing teams */}
          {teams.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:13,color:T.gray500,marginBottom:8}}>Existing Teams</div>
              {teams.map((t,i)=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:i%2===0?T.offWhite:T.white,borderRadius:10,marginBottom:4,border:`1px solid ${T.gray100}`}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length],flexShrink:0}}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:T.dark}}>{t.name}</div>
                    {t.description&&<div style={{fontSize:12,color:T.gray500}}>{t.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Add new team */}
          <div style={{borderTop:teams.length>0?`1.5px solid ${T.gray100}`:"none",paddingTop:teams.length>0?20:0}}>
            <div style={{fontWeight:700,fontSize:13,color:T.gray500,marginBottom:10}}>Add New Team</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Team name *" style={{...inp,marginBottom:8}}/>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)" style={{...inp,marginBottom:14}}/>
            <button onClick={handleSave} disabled={saving||!name.trim()}
              style={{width:"100%",background:saved?"#10B981":T.teal,color:T.white,border:"none",borderRadius:12,padding:"12px 0",fontWeight:700,fontSize:14,cursor:"pointer",transition:"background .2s"}}>
              {saved?"✅ Saved!":saving?"Saving…":"+ Create Team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AdminPanel ───────────────────────────────────────────────────────────────
export default function AdminPanel({ user }) {
  const [rooms,        setRooms]        = useState([]);
  const [teams,        setTeams]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showTeams,    setShowTeams]    = useState(false);
  const [filterTeam,   setFilterTeam]   = useState("all");
  const [search,       setSearch]       = useState("");

  useEffect(()=>{
    Promise.all([getAllRooms(),getAllTeams()]).then(([r,t])=>{
      setRooms(r); setTeams(t); setLoading(false);
    });
  },[]);

  async function handleSaveTeam(team) {
    await saveTeam(team);
    setTeams(await getAllTeams());
  }

  const filtered = rooms.filter(r=>{
    const matchTeam   = filterTeam==="all" || r.teamId===filterTeam || (!r.teamId&&filterTeam==="none");
    const matchSearch = !search || r.id.includes(search)
      || r.hostName?.toLowerCase().includes(search.toLowerCase())
      || r.teamName?.toLowerCase().includes(search.toLowerCase());
    return matchTeam && matchSearch;
  });

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
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={()=>window.location.hash=""}
            style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            🏠 Home
          </button>
          <button onClick={()=>setShowTeams(true)}
            style={{background:"rgba(255,255,255,.15)",color:T.white,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            👥 Teams
          </button>
          <button onClick={signOutUser}
            style={{background:"rgba(255,0,0,.2)",color:T.white,border:"1px solid rgba(255,100,100,.4)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px"}}>
        {/* Stats */}
        <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
          {[
            {label:"Total Retros",       value:stats.total,                      color:T.teal,    icon:"🔄"},
            {label:"Completed",          value:stats.revealed,                   color:"#10B981", icon:"✅"},
            {label:"In Progress",        value:stats.total-stats.revealed,       color:T.orange,  icon:"⏳"},
            {label:"Total Participants", value:stats.participants,               color:"#8B5CF6", icon:"👥"},
          ].map(s=>(
            <div key={s.label} style={{flex:"1 1 140px",background:T.white,borderRadius:14,padding:"16px 20px",boxShadow:`0 3px 14px ${s.color}20`,borderTop:`4px solid ${s.color}`}}>
              <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,color:T.gray500,fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{background:T.white,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",boxShadow:`0 2px 10px ${T.teal}10`}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Search by Room ID, host or team…"
            style={{flex:"1 1 200px",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,outline:"none",color:T.dark}}/>
          <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}
            style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${T.gray100}`,fontSize:13,outline:"none",color:T.dark,background:T.white}}>
            <option value="all">All Teams</option>
            <option value="none">No Team</option>
            {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div style={{fontSize:13,color:T.gray500,whiteSpace:"nowrap"}}>{filtered.length} retro{filtered.length!==1?"s":""}</div>
        </div>

        {/* Retro list */}
        {loading?(
          <div style={{textAlign:"center",padding:"60px 0",color:T.gray300,fontSize:16}}>Loading…</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.length===0&&(
              <div style={{textAlign:"center",padding:"60px 0",color:T.gray300,fontSize:15}}>No retros found</div>
            )}
            {filtered.map(room=>{
              const parts=Object.values(room.participants||{}).filter(p=>p.submitted);
              return(
                <div key={room.id} onClick={()=>setSelectedRoom(room)}
                  style={{background:T.white,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,cursor:"pointer",
                    boxShadow:`0 2px 10px ${T.teal}10`,border:"1.5px solid transparent",transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.border=`1.5px solid ${T.teal}40`}
                  onMouseLeave={e=>e.currentTarget.style.border="1.5px solid transparent"}>
                  <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,background:room.revealed?"#10B981":T.orange}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:800,fontSize:15,color:T.dark,fontFamily:"monospace"}}>{room.id}</span>
                      {room.teamName&&(
                        <span style={{background:T.tealBg,color:T.tealDark,borderRadius:6,padding:"1px 8px",fontSize:11,fontWeight:700}}>{room.teamName}</span>
                      )}
                      <span style={{background:room.revealed?"#D1FAE5":"#FEF3C7",color:room.revealed?"#065F46":"#92400E",borderRadius:6,padding:"1px 8px",fontSize:11,fontWeight:700}}>
                        {room.revealed?"Completed":"In Progress"}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:T.gray500,marginTop:3}}>
                      Host: {room.hostName} · {fmt(room.createdAt)} · {parts.length} participant{parts.length!==1?"s":""}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:T.gray300,flexShrink:0}}>View →</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRoom&&<RetroDetail room={selectedRoom} onClose={()=>setSelectedRoom(null)}/>}
      {showTeams&&<TeamManager teams={teams} onSave={handleSaveTeam} onClose={()=>setShowTeams(false)}/>}
    </div>
  );
}
