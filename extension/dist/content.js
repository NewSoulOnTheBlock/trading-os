// ../src/lib/format.ts
function fmtSol(n, digits = 3) {
  const v = n.toFixed(digits);
  return `${n > 0 ? "+" : ""}${v}`;
}
function fmtPct(n) {
  return `${(n * 100).toFixed(0)}%`;
}
function shortMint(mint) {
  return `${mint.slice(0, 4)}\u2026${mint.slice(-4)}`;
}

// src/config.ts
var DEFAULT_HELIUS_KEY = "021f44ec-4a1a-4d35-ab8a-f7263ea0f2dd";
var DEFAULT_SETTINGS = {
  heliusKey: DEFAULT_HELIUS_KEY,
  wallet: "",
  dailyLossLimit: 0,
  weeklyGoal: 0,
  panelOpen: true
};
async function getSettings() {
  const stored = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...stored.settings };
}
async function setSettings(patch) {
  const next = { ...await getSettings(), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

// src/styles.ts
var PANEL_CSS = `
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
var TILT_CSS = `
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

// src/content.ts
var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var B58 = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
function isPubkey(s) {
  if (s.length < 32 || s.length > 44) return false;
  const bytes = [];
  for (const ch of s) {
    let carry = ALPHABET.indexOf(ch);
    if (carry < 0) return false;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  let zeros = 0;
  for (const ch of s) {
    if (ch === "1") zeros++;
    else break;
  }
  return bytes.length + zeros === 32;
}
function detectWallet() {
  const candidates = /* @__PURE__ */ new Map();
  const add = (s, weight = 1) => {
    if (isPubkey(s)) candidates.set(s, (candidates.get(s) ?? 0) + weight);
  };
  document.querySelectorAll('a[href*="solscan.io/account/"], a[href*="solscan.io/address/"]').forEach((a) => {
    const m = a.href.match(B58);
    if (m) m.forEach((x) => add(x, 5));
  });
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      const v = localStorage.getItem(k) ?? "";
      const blob = `${k} ${v}`;
      if (/wallet|address|pubkey|account|user/i.test(k)) {
        const m = blob.match(B58);
        if (m) m.forEach((x) => add(x, 3));
      }
    }
  } catch {
  }
  if (candidates.size === 0) return null;
  return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
function mintFromUrl() {
  const segs = location.pathname.split("/").filter(Boolean);
  for (const s of segs) if (isPubkey(s)) return s;
  return null;
}
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
}
function toneClass(n) {
  return n > 0 ? "pos" : n < 0 ? "neg" : "muted";
}
function bg(msg) {
  return chrome.runtime.sendMessage(msg);
}
function todayUtc() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
var TradingOS = class {
  constructor() {
    this.host = el("div", { id: "trading-os-root" });
    this.root = this.host.attachShadow({ mode: "open" });
    this.analysis = null;
    this.loading = false;
    this.lastWallet = null;
    this.lastHref = location.href;
    this.errorMsg = "";
  }
  async init() {
    this.settings = await getSettings();
    const style = el("style");
    style.textContent = PANEL_CSS;
    this.root.append(style);
    this.buildShell();
    document.documentElement.append(this.host);
    this.injectTiltStyle();
    const wallet = this.settings.wallet || detectWallet();
    if (wallet) {
      this.lastWallet = wallet;
      void this.analyze(wallet);
    } else {
      this.render();
    }
    setInterval(() => {
      if (location.href !== this.lastHref) {
        this.lastHref = location.href;
        if (this.analysis) this.render();
      }
    }, 1200);
  }
  buildShell() {
    this.launcherDot = el("span", { class: "dot off" });
    const launcher = el("button", { class: "launcher" }, this.launcherDot, "Trading OS");
    launcher.onclick = () => this.toggle();
    this.panel = el("div", { class: "panel" + (this.settings.panelOpen ? " open" : "") });
    const close = el("button", { class: "iconbtn" }, "\u2715");
    close.onclick = () => this.toggle(false);
    const hdr = el(
      "div",
      { class: "hdr" },
      el("h1", {}, "Trading ", el("span", {}, "OS")),
      close
    );
    this.body = el("div", { class: "body" });
    this.panel.append(hdr, this.body);
    this.root.append(launcher, this.panel);
  }
  toggle(force) {
    const open = force ?? !this.panel.classList.contains("open");
    this.panel.classList.toggle("open", open);
    void setSettings({ panelOpen: open });
  }
  async analyze(address) {
    this.loading = true;
    this.render();
    const res = await bg({ type: "ANALYZE", address });
    this.loading = false;
    if (res.ok && res.result) {
      this.analysis = res.result;
      this.applyTiltGuard();
    } else {
      this.analysis = null;
      this.errorMsg = res.error ?? "Analyze failed";
    }
    this.render();
  }
  // ---------- Tilt guard (page-altering) ----------
  injectTiltStyle() {
    if (document.getElementById("trading-os-tiltstyle")) return;
    const s = el("style", { id: "trading-os-tiltstyle" });
    s.textContent = TILT_CSS;
    document.head.append(s);
  }
  todayRealized() {
    if (!this.analysis) return 0;
    return this.analysis.session.date === todayUtc() ? this.analysis.session.realizedSol : 0;
  }
  applyTiltGuard() {
    const limit = this.settings.dailyLossLimit;
    const today = this.todayRealized();
    const breached = limit > 0 && today <= -limit;
    let bar = document.getElementById("trading-os-tiltbar");
    if (breached) {
      if (!bar) {
        bar = el("div", { id: "trading-os-tiltbar" });
        document.body.append(bar);
      }
      bar.textContent = `\u{1F6D1} STOP TRADING \u2014 you're down ${fmtSol(today)} SOL today, past your ${limit} SOL daily limit. Walk away.`;
      document.documentElement.classList.add("trading-os-tilt");
    } else {
      bar?.remove();
      document.documentElement.classList.remove("trading-os-tilt");
    }
  }
  // ---------- Render ----------
  render() {
    this.launcherDot.className = "dot" + (this.analysis ? "" : " off");
    this.body.replaceChildren();
    this.body.append(this.walletCard());
    if (this.loading) {
      this.body.append(
        el("div", { class: "card" }, el("span", { class: "spinner" }), " Scanning wallet history\u2026")
      );
      return;
    }
    if (this.errorMsg && !this.analysis) {
      this.body.append(el("div", { class: "card neg" }, this.errorMsg));
      return;
    }
    if (!this.analysis) {
      this.body.append(
        el("div", { class: "card note" }, "Connect or enter a wallet above, then Analyze to load your coaching.")
      );
      return;
    }
    const a = this.analysis;
    const breached = this.settings.dailyLossLimit > 0 && this.todayRealized() <= -this.settings.dailyLossLimit;
    if (breached) this.body.append(this.breakerCard());
    const tokenCard = this.currentTokenCard();
    if (tokenCard) this.body.append(tokenCard);
    this.body.append(this.sessionCard(a));
    this.body.append(this.pointersCard(a));
    this.body.append(this.streakCard(a));
    this.body.append(this.tokensCard(a));
    this.body.append(this.settingsCard());
  }
  walletCard() {
    const card = el("div", { class: "card" });
    const input = el("input", {
      placeholder: "Wallet address",
      value: this.settings.wallet || this.lastWallet || ""
    });
    const btn = el("button", { class: "act" }, this.loading ? "\u2026" : "Analyze");
    btn.disabled = this.loading;
    btn.onclick = async () => {
      const addr = input.value.trim();
      if (!isPubkey(addr)) {
        this.errorMsg = "That doesn't look like a valid Solana address.";
        this.render();
        return;
      }
      this.errorMsg = "";
      this.lastWallet = addr;
      await setSettings({ wallet: addr });
      this.settings.wallet = addr;
      void this.analyze(addr);
    };
    const detect = el("button", { class: "act ghost" }, "Detect");
    detect.onclick = () => {
      const w = detectWallet();
      if (w) {
        input.value = w;
        this.errorMsg = "";
      } else {
        this.errorMsg = "Couldn't auto-detect a wallet on this page \u2014 paste it manually.";
      }
      this.render();
    };
    card.append(el("div", { class: "fieldlbl" }, "Wallet"), input, el("div", { class: "row", style: "margin-top:8px" }, btn, detect));
    return card;
  }
  breakerCard() {
    return el(
      "div",
      { class: "breaker" },
      el("div", { class: "big" }, "\u{1F6D1} STOP TRADING"),
      el(
        "div",
        { class: "sub" },
        `Down ${fmtSol(this.todayRealized())} SOL today \u2014 past your ${this.settings.dailyLossLimit} SOL daily loss limit. The market will be here tomorrow.`
      )
    );
  }
  currentTokenCard() {
    if (!this.analysis) return null;
    const mint = mintFromUrl();
    if (!mint) return null;
    const tok = this.analysis.pnl.perToken.find((t) => t.mint === mint);
    if (!tok) return null;
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, "This token (your history)"));
    card.append(
      el(
        "div",
        { class: "grid" },
        this.stat("Realized", `${fmtSol(tok.realizedSol)}`, toneClass(tok.realizedSol)),
        this.stat("Round-trips", `${tok.roundTrips}`),
        this.stat("Win rate", tok.roundTrips ? `${Math.round(tok.wins / tok.roundTrips * 100)}%` : "\u2014"),
        this.stat("Open cost", tok.openCostSol > 5e-4 ? `${tok.openCostSol.toFixed(2)}` : "\u2014")
      )
    );
    return card;
  }
  sessionCard(a) {
    const s = a.session;
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, `Latest session \xB7 ${s.date}`));
    card.append(
      el(
        "div",
        { class: "grid" },
        this.stat("Realized", `${fmtSol(s.realizedSol)} SOL`, toneClass(s.realizedSol)),
        this.stat("Trades", `${s.trades}`),
        this.stat("Win rate", fmtPct(s.winRate)),
        this.stat("Round-trips", `${s.roundTrips}`)
      )
    );
    card.append(
      el(
        "div",
        { class: "note", style: "margin-top:8px" },
        `All-time: ${fmtSol(a.pnl.realizedSol)} SOL \xB7 ${a.fetchedTrades} trades \xB7 max DD -${a.metrics.maxDrawdownSol.toFixed(2)} SOL`
      )
    );
    return card;
  }
  pointersCard(a) {
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, "Daily pointers"));
    const top = a.pointers.slice(0, 4);
    if (top.length === 0) card.append(el("div", { class: "note" }, "No flags \u2014 keep it disciplined."));
    for (const p of top) {
      card.append(
        el(
          "div",
          { class: `pointer ${p.severity} sev-${p.severity}` },
          el("div", { class: "t" }, p.title),
          el("div", { class: "d" }, p.detail)
        )
      );
    }
    return card;
  }
  streakCard(a) {
    const m = a.metrics;
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, "Streaks & weekly goal"));
    card.append(
      el(
        "div",
        { class: "grid" },
        this.stat("Green streak", `${m.currentGreenStreak}\u{1F525}`),
        this.stat("Longest", `${m.longestGreenStreak}`),
        this.stat("Green days", `${m.greenDays}`, "pos"),
        this.stat("Red days", `${m.redDays}`, "neg")
      )
    );
    const goal = this.settings.weeklyGoal;
    if (goal > 0 && m.dailyPnl.length) {
      const latest = m.dailyPnl[m.dailyPnl.length - 1].date;
      const cutoff = Date.parse(`${latest}T00:00:00Z`) / 1e3 - 6 * 86400;
      const week = m.dailyPnl.filter((d) => Date.parse(`${d.date}T00:00:00Z`) / 1e3 >= cutoff).reduce((s, d) => s + d.realizedSol, 0);
      const pct = Math.max(0, Math.min(100, week / goal * 100));
      const barWrap = el("div", { class: "bar", style: "margin-top:8px" });
      barWrap.append(el("div", { style: `width:${pct}%` }));
      card.append(barWrap);
      card.append(
        el("div", { class: "note", style: "margin-top:4px" }, `${week.toFixed(2)} / ${goal} SOL (${pct.toFixed(0)}%) this week`)
      );
    }
    return card;
  }
  tokensCard(a) {
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, "Per-token realized P&L"));
    const rows = a.pnl.perToken.slice(0, 8);
    for (const t of rows) {
      const row = el(
        "div",
        { class: "tokrow" },
        el(
          "div",
          {},
          el("div", { class: "nm" }, t.symbol ?? shortMint(t.mint)),
          el("div", { class: "meta" }, `${t.roundTrips} trips \xB7 ${t.wins} wins`)
        ),
        el("div", { class: toneClass(t.realizedSol), style: "font-weight:700;font-size:13px" }, fmtSol(t.realizedSol))
      );
      row.onclick = () => window.open(`https://solscan.io/token/${t.mint}`, "_blank");
      card.append(row);
    }
    if (rows.length === 0) card.append(el("div", { class: "note" }, "No closed positions yet."));
    return card;
  }
  settingsCard() {
    const card = el("div", { class: "card settings" });
    card.append(el("h3", {}, "Risk settings"));
    const lossWrap = el("div");
    lossWrap.append(el("div", { class: "fieldlbl" }, "Daily loss limit (SOL) \u2014 circuit breaker"));
    const loss = el("input", {
      type: "number",
      value: this.settings.dailyLossLimit ? String(this.settings.dailyLossLimit) : "",
      placeholder: "0 = off"
    });
    loss.onchange = async () => {
      this.settings = await setSettings({ dailyLossLimit: Math.max(0, Number(loss.value) || 0) });
      this.applyTiltGuard();
      this.render();
    };
    lossWrap.append(loss);
    const goalWrap = el("div");
    goalWrap.append(el("div", { class: "fieldlbl" }, "Weekly goal (SOL)"));
    const goal = el("input", {
      type: "number",
      value: this.settings.weeklyGoal ? String(this.settings.weeklyGoal) : "",
      placeholder: "0 = off"
    });
    goal.onchange = async () => {
      this.settings = await setSettings({ weeklyGoal: Math.max(0, Number(goal.value) || 0) });
      this.render();
    };
    goalWrap.append(goal);
    card.append(lossWrap, goalWrap, el("div", { class: "note" }, "Helius key & wallet can also be set in the extension popup."));
    return card;
  }
  stat(label, value, tone = "") {
    return el("div", { class: "stat" }, el("div", { class: "l" }, label), el("div", { class: `v ${tone}` }, value));
  }
};
if (!document.getElementById("trading-os-root")) {
  const app = new TradingOS();
  void app.init();
}
