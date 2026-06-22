import { fmtDuration, fmtPct, fmtSol, shortMint } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

import {
  type AnalyzeResponse,
  type Settings,
  getSettings,
  setSettings,
} from "./config";
import { PANEL_CSS, TILT_CSS } from "./styles";

type Analysis = AnalysisResult & { solPriceUsd?: number };

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58 = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

/** Validate that a base58 string decodes to a 32-byte Solana public key. */
function isPubkey(s: string): boolean {
  if (s.length < 32 || s.length > 44) return false;
  const bytes: number[] = [];
  for (const ch of s) {
    let carry = ALPHABET.indexOf(ch);
    if (carry < 0) return false;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
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

/** Best-effort wallet discovery from Axiom's localStorage + page links. */
function detectWallet(): string | null {
  const candidates = new Map<string, number>();
  const add = (s: string, weight = 1) => {
    if (isPubkey(s)) candidates.set(s, (candidates.get(s) ?? 0) + weight);
  };
  // solscan account links are a strong signal.
  document
    .querySelectorAll<HTMLAnchorElement>('a[href*="solscan.io/account/"], a[href*="solscan.io/address/"]')
    .forEach((a) => {
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
    /* storage access can throw */
  }
  if (candidates.size === 0) return null;
  return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Extract a token mint from the current Axiom URL, if present. */
function mintFromUrl(): string | null {
  const segs = location.pathname.split("/").filter(Boolean);
  for (const s of segs) if (isPubkey(s)) return s;
  return null;
}

// ---------- DOM helpers ----------
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...kids: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
}

function toneClass(n: number) {
  return n > 0 ? "pos" : n < 0 ? "neg" : "muted";
}

function bg<T>(msg: unknown): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- App ----------
class TradingOS {
  private host = el("div", { id: "trading-os-root" });
  private root = this.host.attachShadow({ mode: "open" });
  private panel!: HTMLElement;
  private body!: HTMLElement;
  private launcherDot!: HTMLElement;
  private settings!: Settings;
  private analysis: Analysis | null = null;
  private loading = false;
  private lastWallet: string | null = null;
  private lastHref = location.href;

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

    // Re-detect token highlight on SPA navigation.
    setInterval(() => {
      if (location.href !== this.lastHref) {
        this.lastHref = location.href;
        if (this.analysis) this.render();
      }
    }, 1200);
  }

  private buildShell() {
    this.launcherDot = el("span", { class: "dot off" });
    const launcher = el("button", { class: "launcher" }, this.launcherDot, "Trading OS");
    launcher.onclick = () => this.toggle();

    this.panel = el("div", { class: "panel" + (this.settings.panelOpen ? " open" : "") });
    const close = el("button", { class: "iconbtn" }, "✕");
    close.onclick = () => this.toggle(false);
    const hdr = el(
      "div",
      { class: "hdr" },
      el("h1", {}, "Trading ", el("span", {}, "OS")),
      close,
    );
    this.body = el("div", { class: "body" });
    this.panel.append(hdr, this.body);
    this.root.append(launcher, this.panel);
  }

  private toggle(force?: boolean) {
    const open = force ?? !this.panel.classList.contains("open");
    this.panel.classList.toggle("open", open);
    void setSettings({ panelOpen: open });
  }

  private async analyze(address: string) {
    this.loading = true;
    this.render();
    const res = await bg<AnalyzeResponse>({ type: "ANALYZE", address });
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

  private errorMsg = "";

  // ---------- Tilt guard (page-altering) ----------
  private injectTiltStyle() {
    if (document.getElementById("trading-os-tiltstyle")) return;
    const s = el("style", { id: "trading-os-tiltstyle" });
    s.textContent = TILT_CSS;
    document.head.append(s);
  }

  private todayRealized(): number {
    if (!this.analysis) return 0;
    return this.analysis.session.date === todayUtc() ? this.analysis.session.realizedSol : 0;
  }

  private applyTiltGuard() {
    const limit = this.settings.dailyLossLimit;
    const today = this.todayRealized();
    const breached = limit > 0 && today <= -limit;
    let bar = document.getElementById("trading-os-tiltbar");
    if (breached) {
      if (!bar) {
        bar = el("div", { id: "trading-os-tiltbar" });
        document.body.append(bar);
      }
      bar.textContent = `🛑 STOP TRADING — you're down ${fmtSol(today)} SOL today, past your ${limit} SOL daily limit. Walk away.`;
      document.documentElement.classList.add("trading-os-tilt");
    } else {
      bar?.remove();
      document.documentElement.classList.remove("trading-os-tilt");
    }
  }

  // ---------- Render ----------
  private render() {
    this.launcherDot.className = "dot" + (this.analysis ? "" : " off");
    this.body.replaceChildren();
    this.body.append(this.walletCard());
    if (this.loading) {
      this.body.append(
        el("div", { class: "card" }, el("span", { class: "spinner" }), " Scanning wallet history…"),
      );
      return;
    }
    if (this.errorMsg && !this.analysis) {
      this.body.append(el("div", { class: "card neg" }, this.errorMsg));
      return;
    }
    if (!this.analysis) {
      this.body.append(
        el("div", { class: "card note" }, "Connect or enter a wallet above, then Analyze to load your coaching."),
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

  private walletCard() {
    const card = el("div", { class: "card" });
    const input = el("input", {
      placeholder: "Wallet address",
      value: this.settings.wallet || this.lastWallet || "",
    }) as HTMLInputElement;
    const btn = el("button", { class: "act" }, this.loading ? "…" : "Analyze");
    (btn as HTMLButtonElement).disabled = this.loading;
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
        this.errorMsg = "Couldn't auto-detect a wallet on this page — paste it manually.";
      }
      this.render();
    };
    card.append(el("div", { class: "fieldlbl" }, "Wallet"), input, el("div", { class: "row", style: "margin-top:8px" }, btn, detect));
    return card;
  }

  private breakerCard() {
    return el(
      "div",
      { class: "breaker" },
      el("div", { class: "big" }, "🛑 STOP TRADING"),
      el(
        "div",
        { class: "sub" },
        `Down ${fmtSol(this.todayRealized())} SOL today — past your ${this.settings.dailyLossLimit} SOL daily loss limit. The market will be here tomorrow.`,
      ),
    );
  }

  private currentTokenCard() {
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
        this.stat("Win rate", tok.roundTrips ? `${Math.round((tok.wins / tok.roundTrips) * 100)}%` : "—"),
        this.stat("Open cost", tok.openCostSol > 0.0005 ? `${tok.openCostSol.toFixed(2)}` : "—"),
      ),
    );
    return card;
  }

  private sessionCard(a: Analysis) {
    const s = a.session;
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, `Latest session · ${s.date}`));
    card.append(
      el(
        "div",
        { class: "grid" },
        this.stat("Realized", `${fmtSol(s.realizedSol)} SOL`, toneClass(s.realizedSol)),
        this.stat("Trades", `${s.trades}`),
        this.stat("Win rate", fmtPct(s.winRate)),
        this.stat("Round-trips", `${s.roundTrips}`),
      ),
    );
    card.append(
      el(
        "div",
        { class: "note", style: "margin-top:8px" },
        `All-time: ${fmtSol(a.pnl.realizedSol)} SOL · ${a.fetchedTrades} trades · max DD -${a.metrics.maxDrawdownSol.toFixed(2)} SOL`,
      ),
    );
    return card;
  }

  private pointersCard(a: Analysis) {
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, "Daily pointers"));
    const top = a.pointers.slice(0, 4);
    if (top.length === 0) card.append(el("div", { class: "note" }, "No flags — keep it disciplined."));
    for (const p of top) {
      card.append(
        el(
          "div",
          { class: `pointer ${p.severity} sev-${p.severity}` },
          el("div", { class: "t" }, p.title),
          el("div", { class: "d" }, p.detail),
        ),
      );
    }
    return card;
  }

  private streakCard(a: Analysis) {
    const m = a.metrics;
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, "Streaks & weekly goal"));
    card.append(
      el(
        "div",
        { class: "grid" },
        this.stat("Green streak", `${m.currentGreenStreak}🔥`),
        this.stat("Longest", `${m.longestGreenStreak}`),
        this.stat("Green days", `${m.greenDays}`, "pos"),
        this.stat("Red days", `${m.redDays}`, "neg"),
      ),
    );
    const goal = this.settings.weeklyGoal;
    if (goal > 0 && m.dailyPnl.length) {
      const latest = m.dailyPnl[m.dailyPnl.length - 1].date;
      const cutoff = Date.parse(`${latest}T00:00:00Z`) / 1000 - 6 * 86400;
      const week = m.dailyPnl
        .filter((d) => Date.parse(`${d.date}T00:00:00Z`) / 1000 >= cutoff)
        .reduce((s, d) => s + d.realizedSol, 0);
      const pct = Math.max(0, Math.min(100, (week / goal) * 100));
      const barWrap = el("div", { class: "bar", style: "margin-top:8px" });
      barWrap.append(el("div", { style: `width:${pct}%` }));
      card.append(barWrap);
      card.append(
        el("div", { class: "note", style: "margin-top:4px" }, `${week.toFixed(2)} / ${goal} SOL (${pct.toFixed(0)}%) this week`),
      );
    }
    return card;
  }

  private tokensCard(a: Analysis) {
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
          el("div", { class: "meta" }, `${t.roundTrips} trips · ${t.wins} wins`),
        ),
        el("div", { class: toneClass(t.realizedSol), style: "font-weight:700;font-size:13px" }, fmtSol(t.realizedSol)),
      );
      row.onclick = () => window.open(`https://solscan.io/token/${t.mint}`, "_blank");
      card.append(row);
    }
    if (rows.length === 0) card.append(el("div", { class: "note" }, "No closed positions yet."));
    return card;
  }

  private settingsCard() {
    const card = el("div", { class: "card settings" });
    card.append(el("h3", {}, "Risk settings"));

    const lossWrap = el("div");
    lossWrap.append(el("div", { class: "fieldlbl" }, "Daily loss limit (SOL) — circuit breaker"));
    const loss = el("input", {
      type: "number",
      value: this.settings.dailyLossLimit ? String(this.settings.dailyLossLimit) : "",
      placeholder: "0 = off",
    }) as HTMLInputElement;
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
      placeholder: "0 = off",
    }) as HTMLInputElement;
    goal.onchange = async () => {
      this.settings = await setSettings({ weeklyGoal: Math.max(0, Number(goal.value) || 0) });
      this.render();
    };
    goalWrap.append(goal);

    card.append(lossWrap, goalWrap, el("div", { class: "note" }, "Helius key & wallet can also be set in the extension popup."));
    return card;
  }

  private stat(label: string, value: string, tone = "") {
    return el("div", { class: "stat" }, el("div", { class: "l" }, label), el("div", { class: `v ${tone}` }, value));
  }
}

if (!document.getElementById("trading-os-root")) {
  const app = new TradingOS();
  void app.init();
}
