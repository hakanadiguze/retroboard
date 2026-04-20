import { useState, useEffect } from "react";

const STORAGE_KEY = "retroboard_bg_url";

export function getBgUrl() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; }
  catch { return ""; }
}
export function saveBgUrl(url) {
  try { localStorage.setItem(STORAGE_KEY, url); } catch {}
}

// ─── Background layer — shown on all screens ─────────────────────────────────
export function ThemeBackground({ url }) {
  if (!url) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: `url(${url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}>
      {/* Dark overlay so text stays readable */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.55)",
      }}/>
    </div>
  );
}

// ─── Theme Picker — URL input + reset ────────────────────────────────────────
export function ThemePicker({ currentUrl, onChange, onClose }) {
  const [input, setInput]     = useState(currentUrl || "");
  const [preview, setPreview] = useState(currentUrl || "");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function handleApply() {
    const url = input.trim();
    if (!url) {
      onChange("");
      onClose();
      return;
    }
    setLoading(true);
    setError("");
    const img = new Image();
    img.onload  = () => { setLoading(false); setPreview(url); onChange(url); onClose(); };
    img.onerror = () => { setLoading(false); setError("Could not load image. Check the URL."); };
    img.src = url;
  }

  function handleReset() {
    setInput("");
    setPreview("");
    onChange("");
    onClose();
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: "#111", borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#076F6F,#0D9E9E)",
          padding: "16px 22px",
          display: "flex", alignItems: "center",
        }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>🎨 Background Image</span>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.2)",
            border: "none", color: "#fff", borderRadius: 8,
            padding: "5px 12px", cursor: "pointer", fontWeight: 700,
          }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Preview */}
          <div style={{
            width: "100%", height: 180, borderRadius: 12, marginBottom: 16,
            background: preview
              ? `url(${preview}) center/cover no-repeat`
              : "rgba(255,255,255,0.05)",
            border: "1.5px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {preview && <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.3)" }}/>}
            {!preview && (
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                Preview will appear here
              </span>
            )}
          </div>

          {/* URL input */}
          <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Image URL
          </label>
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleApply()}
            placeholder="https://example.com/image.jpg"
            autoFocus
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 10,
              border: error ? "1.5px solid #EF4444" : "1.5px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)", color: "#fff",
              fontSize: 13, outline: "none", boxSizing: "border-box",
              fontFamily: "monospace",
            }}
          />
          {error && (
            <div style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{error}</div>
          )}

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
            Paste any direct image URL. Works with Unsplash, Imgur, and most image hosts.
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleReset}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: "1.5px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
              🔄 Classic (Reset)
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              style={{
                flex: 2, padding: "11px 0", borderRadius: 10,
                border: "none",
                background: input.trim() ? "linear-gradient(135deg,#0D9E9E,#076F6F)" : "rgba(255,255,255,0.1)",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? "Loading…" : "✅ Apply Background"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
