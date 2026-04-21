// ─── Retro Methods ────────────────────────────────────────────────────────────
// Each method defines its columns with colors, backgrounds, and descriptions.
// Adding a new method = add one entry here, nothing else changes.

export const RETRO_METHODS = [
  {
    id: "ssc",
    name: "Stop / Start / Continue",
    emoji: "🔄",
    desc: "Classic agile retrospective format. Identify what to stop, start, and keep doing.",
    columns: [
      { id:"Stop",     label:"Stop",     emoji:"🛑", color:"#FF6B6B", bg:"#FFF5F5", desc:"What should we stop doing? What's hurting the team?" },
      { id:"Start",    label:"Start",    emoji:"🚀", color:"#34D399", bg:"#F0FFF8", desc:"What should we start doing that we're not doing yet?" },
      { id:"Continue", label:"Continue", emoji:"✅", color:"#60A5FA", bg:"#EFF6FF", desc:"What's working well and should keep going?" },
    ],
  },
  {
    id: "msg",
    name: "Mad / Sad / Glad",
    emoji: "😤",
    desc: "Emotion-based retrospective. Surface feelings to improve team health and morale.",
    columns: [
      { id:"Mad",  label:"Mad",  emoji:"😠", color:"#F87171", bg:"#FFF1F1", desc:"What made you frustrated or angry this sprint?" },
      { id:"Sad",  label:"Sad",  emoji:"😢", color:"#818CF8", bg:"#F0F0FF", desc:"What disappointed you or made you feel down?" },
      { id:"Glad", label:"Glad", emoji:"😄", color:"#FCD34D", bg:"#FFFBEB", desc:"What made you happy or proud this sprint?" },
    ],
  },
  {
    id: "sailboat",
    name: "Sailboat",
    emoji: "⛵",
    desc: "Metaphor-based format. Navigate toward your island while dealing with anchors and rocks.",
    columns: [
      { id:"Island", label:"Island",  emoji:"🏝️", color:"#2DD4BF", bg:"#F0FFFE", desc:"Our goal — where do we want to be?" },
      { id:"Wind",   label:"Wind",    emoji:"💨", color:"#38BDF8", bg:"#F0F9FF", desc:"What's pushing us forward? What's going well?" },
      { id:"Anchor", label:"Anchor",  emoji:"⚓", color:"#A78BFA", bg:"#F5F3FF", desc:"What's slowing us down or holding us back?" },
      { id:"Rocks",  label:"Rocks",   emoji:"🪨", color:"#FB923C", bg:"#FFF7ED", desc:"What risks or obstacles lie ahead?" },
    ],
  },
  {
    id: "starfish",
    name: "Starfish",
    emoji: "⭐",
    desc: "Five-point format for nuanced action. More granular than Stop/Start/Continue.",
    columns: [
      { id:"Keep",  label:"Keep",  emoji:"💎", color:"#34D399", bg:"#F0FFF8", desc:"What are we doing well that we must keep?" },
      { id:"Less",  label:"Less",  emoji:"📉", color:"#F472B6", bg:"#FFF0F7", desc:"What should we do less of, but not stop entirely?" },
      { id:"More",  label:"More",  emoji:"📈", color:"#818CF8", bg:"#F0F0FF", desc:"What should we do more of that's already working?" },
      { id:"Stop",  label:"Stop",  emoji:"🛑", color:"#F87171", bg:"#FFF1F1", desc:"What should we stop doing completely?" },
      { id:"Start", label:"Start", emoji:"🚀", color:"#FCD34D", bg:"#FFFBEB", desc:"What new things should we try?" },
    ],
  },
  {
    id: "4ls",
    name: "4Ls",
    emoji: "📚",
    desc: "Learning-focused format. Reflect on what was liked, learned, lacked, and longed for.",
    columns: [
      { id:"Liked",     label:"Liked",     emoji:"❤️",  color:"#34D399", bg:"#F0FFF8", desc:"What did you enjoy or appreciate this sprint?" },
      { id:"Learned",   label:"Learned",   emoji:"🧠",  color:"#38BDF8", bg:"#F0F9FF", desc:"What new things did you learn?" },
      { id:"Lacked",    label:"Lacked",    emoji:"❌",  color:"#F87171", bg:"#FFF1F1", desc:"What was missing or could have been better?" },
      { id:"LongedFor", label:"Longed For",emoji:"🌟",  color:"#FCD34D", bg:"#FFFBEB", desc:"What do you wish you had or could do?" },
    ],
  },
  {
    id: "daki",
    name: "DAKI",
    emoji: "🔧",
    desc: "Action-oriented format. Decide what to Drop, Add, Keep, and Improve.",
    columns: [
      { id:"Drop",    label:"Drop",    emoji:"🗑️", color:"#F87171", bg:"#FFF1F1", desc:"What should we completely stop doing?" },
      { id:"Add",     label:"Add",     emoji:"➕", color:"#34D399", bg:"#F0FFF8", desc:"What new practices should we introduce?" },
      { id:"Keep",    label:"Keep",    emoji:"💎", color:"#60A5FA", bg:"#EFF6FF", desc:"What's working well and should stay?" },
      { id:"Improve", label:"Improve", emoji:"⚡", color:"#FB923C", bg:"#FFF7ED", desc:"What exists but needs to get better?" },
    ],
  },
];

// Helper — get method by id, fallback to SSC
export function getMethod(id) {
  return RETRO_METHODS.find(m => m.id === id) || RETRO_METHODS[0];
}

// Helper — get columns for a method id
export function getColumns(methodId) {
  return getMethod(methodId).columns;
}

// Helper — get a single column definition
export function getColumn(methodId, colId) {
  return getColumns(methodId).find(c => c.id === colId);
}

// Legacy compat — old rooms without method field use SSC
export function getRoomMethod(room) {
  return getMethod(room?.method || "ssc");
}
