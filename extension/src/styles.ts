/** All panel CSS, injected into a Shadow root so Axiom's styles can't leak in. */
export const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }

.launcher {
  position: fixed; right: 18px; bottom: 18px; z-index: 2147483646;
  display: flex; align-items: center; gap: 8px;
  background: #7c3aed; color: #fff; border: none; border-radius: 999px;
  padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,.45);
}
.launcher:hover { background: #8b5cf6; }
.launcher .dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; }
.launcher .dot.off { background: #71717a; }

.panel {
  position: fixed; top: 0; right: 0; height: 100vh; width: 380px; max-width: 92vw;
  z-index: 2147483647; background: #0a0a0b; color: #e5e5e5;
  border-left: 1px solid #27272a; box-shadow: -10px 0 40px rgba(0,0,0,.5);
  transform: translateX(100%); transition: transform .22s ease; display: flex; flex-direction: column;
}
.panel.open { transform: translateX(0); }

.hdr { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #1f1f23; }
.hdr h1 { font-size:15px; font-weight:700; margin:0; letter-spacing:-.01em; }
.hdr h1 span { color:#a78bfa; }
.iconbtn { background:none; border:none; color:#a1a1aa; font-size:16px; cursor:pointer; padding:4px; }
.iconbtn:hover { color:#fff; }

.body { overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:12px; }
.body::-webkit-scrollbar { width:8px; } .body::-webkit-scrollbar-thumb { background:#27272a; border-radius:4px; }

.card { border:1px solid #1f1f23; background:#101013; border-radius:12px; padding:12px; }
.card h3 { margin:0 0 8px; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#71717a; font-weight:600; }

.row { display:flex; gap:8px; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.stat { border:1px solid #1f1f23; background:#0c0c0f; border-radius:8px; padding:8px; }
.stat .l { font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:#71717a; }
.stat .v { font-size:15px; font-weight:700; margin-top:2px; }

.pos { color:#34d399; } .neg { color:#fb7185; } .muted { color:#a1a1aa; }

input, select {
  background:#0c0c0f; border:1px solid #27272a; color:#e5e5e5; border-radius:8px;
  padding:7px 9px; font-size:13px; outline:none; width:100%;
}
input:focus, select:focus { border-color:#7c3aed; }
button.act { background:#7c3aed; color:#fff; border:none; border-radius:8px; padding:7px 12px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
button.act:hover { background:#8b5cf6; }
button.act:disabled { opacity:.5; cursor:default; }
button.ghost { background:#1c1c20; color:#d4d4d8; }

.pointer { border:1px solid #1f1f23; border-radius:8px; padding:8px 10px; font-size:12px; margin-bottom:6px; }
.pointer:last-child { margin-bottom:0; }
.pointer .t { font-weight:600; }
.pointer .d { color:#a1a1aa; margin-top:2px; font-size:11px; }
.pointer.good { border-color:#14532d; background:#052e1605; }
.pointer.warn { border-color:#713f12; }
.pointer.bad  { border-color:#7f1d1d; }
.pointer.info { border-color:#27272a; }
.sev-good .t{color:#6ee7b7;} .sev-warn .t{color:#fcd34d;} .sev-bad .t{color:#fca5a5;} .sev-info .t{color:#d4d4d8;}

.tokrow { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-top:1px solid #1a1a1e; cursor:pointer; }
.tokrow:first-child { border-top:none; }
.tokrow:hover { background:#16161a; }
.tokrow .nm { font-weight:600; font-size:12px; color:#c4b5fd; }
.tokrow .meta { font-size:10px; color:#71717a; }

.breaker { border:2px solid #dc2626; background:#450a0a; border-radius:12px; padding:12px; text-align:center; animation:pulse 1.4s infinite; }
.breaker .big { font-size:15px; font-weight:800; color:#fca5a5; }
.breaker .sub { font-size:11px; color:#fecaca; margin-top:4px; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.72;} }

.bar { height:6px; background:#1f1f23; border-radius:4px; overflow:hidden; }
.bar > div { height:100%; background:#7c3aed; }

.note { font-size:11px; color:#71717a; }
.spinner { width:14px;height:14px;border:2px solid #3f3f46;border-top-color:#a78bfa;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle; }
@keyframes spin { to { transform:rotate(360deg);} }
.settings { display:flex; flex-direction:column; gap:8px; }
.fieldlbl { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#71717a; margin-bottom:3px; }
`;

/** Page-level tilt-guard banner styling (injected into the Axiom document head). */
export const TILT_CSS = `
#trading-os-tiltbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 2147483645;
  background: linear-gradient(90deg,#7f1d1d,#b91c1c,#7f1d1d);
  color: #fff; text-align: center; font: 700 13px/1.4 ui-sans-serif, system-ui, sans-serif;
  padding: 8px 12px; letter-spacing:.02em; box-shadow: 0 2px 12px rgba(0,0,0,.5);
  animation: tos-pulse 1.3s infinite;
}
@keyframes tos-pulse { 0%,100%{filter:brightness(1);} 50%{filter:brightness(1.25);} }
html.trading-os-tilt body { filter: grayscale(.35) brightness(.85); }
`;
