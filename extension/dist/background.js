// ../src/lib/advice/rules.ts
function fmtSol(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(3)} SOL`;
}
function pct(n) {
  return `${(n * 100).toFixed(0)}%`;
}
function buildPointers(pnl, metrics, session) {
  const out = [];
  if (pnl.roundTrips >= 5) {
    if (pnl.profitFactor >= 1.5) {
      out.push({
        id: "profit-factor-strong",
        severity: "good",
        title: "Your edge is real",
        detail: `Profit factor ${pnl.profitFactor.toFixed(2)} (gross win ${fmtSol(
          pnl.grossProfitSol
        )} vs loss ${fmtSol(-pnl.grossLossSol)}). Keep doing more of what works \u2014 size up winners, not losers.`
      });
    } else if (pnl.profitFactor < 1) {
      out.push({
        id: "profit-factor-weak",
        severity: "bad",
        title: "Losing more than you win",
        detail: `Profit factor ${pnl.profitFactor.toFixed(2)} \u2014 your losses outweigh your wins. Tighten entries and cut losers faster before adding size.`
      });
    }
  }
  if (pnl.roundTrips >= 10 && pnl.winRate < 0.35 && pnl.profitFactor < 1.2) {
    out.push({
      id: "low-winrate",
      severity: "warn",
      title: "Low hit-rate without the payoff",
      detail: `Win rate ${pct(pnl.winRate)}. A low win rate is fine only if winners are much bigger than losers \u2014 yours aren't. Either be more selective or let winners run longer.`
    });
  }
  if (pnl.worstTrip && pnl.grossLossSol > 0) {
    const share = -pnl.worstTrip.pnlSol / pnl.grossLossSol;
    if (share > 0.4 && -pnl.worstTrip.pnlSol > 0.05) {
      out.push({
        id: "concentrated-loss",
        severity: "bad",
        title: "One trade is wrecking your book",
        detail: `Your worst trade (${pnl.worstTrip.symbol ?? pnl.worstTrip.mint.slice(0, 4)}) lost ${fmtSol(pnl.worstTrip.pnlSol)} \u2014 ${pct(
          share
        )} of all your losses. Set a hard stop per position; no single trade should be able to do this.`
      });
    }
  }
  if (metrics.avgPositionSizeSol > 0 && metrics.maxPositionSizeSol > metrics.avgPositionSizeSol * 4) {
    out.push({
      id: "sizing-inconsistent",
      severity: "warn",
      title: "Inconsistent position sizing",
      detail: `Biggest buy (${metrics.maxPositionSizeSol.toFixed(
        2
      )} SOL) was ${(metrics.maxPositionSizeSol / metrics.avgPositionSizeSol).toFixed(
        1
      )}x your average (${metrics.avgPositionSizeSol.toFixed(
        2
      )} SOL). Random sizing turns a few bad calls into account killers. Fix a unit size.`
    });
  }
  if (metrics.maxTradesInDay >= 30) {
    out.push({
      id: "overtrading",
      severity: "warn",
      title: "Signs of overtrading",
      detail: `Up to ${metrics.maxTradesInDay} trades in a single day. High volume usually feeds fees and tilt, not profit. Set a daily trade cap.`
    });
  }
  if (pnl.roundTrips >= 8 && metrics.flipRate > 0.5) {
    out.push({
      id: "flipping",
      severity: "warn",
      title: "Flipping on impulse",
      detail: `${pct(
        metrics.flipRate
      )} of your exits happen within 2 minutes. Sub-2-minute flips are usually reactions, not plans. Define a target/stop before you enter.`
    });
  }
  if (metrics.revengeRate > 0.3) {
    out.push({
      id: "revenge",
      severity: "bad",
      title: "Revenge trading detected",
      detail: `You re-bought the same token within 30 min of a loss ${pct(
        metrics.revengeRate
      )} of the time. Chasing a loss is the fastest way to compound it. After a red trade, step away for 15 minutes.`
    });
  }
  if (pnl.roundTrips >= 8 && metrics.bigLossRate > 0.2) {
    out.push({
      id: "no-stops",
      severity: "bad",
      title: "You're not using stops",
      detail: `${pct(
        metrics.bigLossRate
      )} of round-trips lost more than half their cost. That pattern means no stop discipline. Decide your max loss (e.g. -25%) before entering.`
    });
  }
  if (session.trades > 0) {
    if (session.realizedSol < 0 && session.trades >= 8) {
      out.push({
        id: "session-red",
        severity: "bad",
        title: `Today is red \u2014 consider stopping`,
        detail: `Session P&L ${fmtSol(session.realizedSol)} across ${session.trades} trades. Red days tend to get worse when you keep clicking. Walk away and review.`
      });
    } else if (session.realizedSol > 0 && session.winRate >= 0.5) {
      out.push({
        id: "session-green",
        severity: "good",
        title: "Solid session \u2014 lock it in",
        detail: `Session P&L ${fmtSol(session.realizedSol)} at ${pct(
          session.winRate
        )} win rate. Protect green days: bank profit and resist the "one more trade" urge.`
      });
    }
  }
  const heavyBags = pnl.perToken.filter((t) => t.openCostSol > 0.05 && t.openTokens > 0).sort((a, b) => b.openCostSol - a.openCostSol);
  if (heavyBags.length > 0) {
    const top = heavyBags[0];
    out.push({
      id: "open-bags",
      severity: "info",
      title: "Open positions to review",
      detail: `You still hold ${heavyBags.length} position(s) with cost basis on the book \u2014 largest is ${top.symbol ?? top.mint.slice(0, 4)} at ${top.openCostSol.toFixed(
        2
      )} SOL. Have an exit plan for each; unrealized losses become realized eventually.`
    });
  }
  if (out.length === 0) {
    out.push({
      id: "all-clear",
      severity: "info",
      title: "Not enough signal yet",
      detail: "No major red flags in this history. Keep a consistent unit size, predefined stops, and a daily trade cap, and re-check after more sessions."
    });
  }
  const rank = { bad: 0, warn: 1, good: 2, info: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ../src/lib/analytics/metrics.ts
var DAY = 86400;
var EPS = 1e-9;
function utcDate(ts) {
  return new Date(ts * 1e3).toISOString().slice(0, 10);
}
function median(values) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function computeMetrics(trades, pnl) {
  const tradesByDay = /* @__PURE__ */ new Map();
  const hourHistogram = new Array(24).fill(0);
  const dowHistogram = new Array(7).fill(0);
  let positionSum = 0;
  let positionCount = 0;
  let maxPosition = 0;
  for (const t of trades) {
    const day = utcDate(t.timestamp);
    tradesByDay.set(day, (tradesByDay.get(day) ?? 0) + 1);
    const d = new Date(t.timestamp * 1e3);
    hourHistogram[d.getUTCHours()]++;
    dowHistogram[d.getUTCDay()]++;
    if (t.side === "buy") {
      positionSum += t.solAmount;
      positionCount++;
      if (t.solAmount > maxPosition) maxPosition = t.solAmount;
    }
  }
  const activeDays = tradesByDay.size;
  const maxTradesInDay = tradesByDay.size ? Math.max(...tradesByDay.values()) : 0;
  const holds = pnl.trips.map((t) => t.holdSeconds);
  const avgHold = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
  const flips = pnl.trips.filter((t) => t.holdSeconds > 0 && t.holdSeconds < 120).length;
  const bigLosses = pnl.trips.filter((t) => t.roi < -0.5).length;
  const losingExits = pnl.trips.filter((t) => t.pnlSol < 0).map((t) => ({ mint: t.mint, ts: t.closeTs }));
  let revenge = 0;
  for (const loss of losingExits) {
    const reentered = trades.some(
      (t) => t.side === "buy" && t.mint === loss.mint && t.timestamp > loss.ts && t.timestamp - loss.ts <= 1800
    );
    if (reentered) revenge++;
  }
  const closed = [...pnl.trips].sort((a, b) => a.closeTs - b.closeTs);
  const equityCurve = [];
  const dowPnl = new Array(7).fill(0);
  const hourPnl = new Array(24).fill(0);
  const pnlByDay = /* @__PURE__ */ new Map();
  let cum = 0;
  let peak = 0;
  let maxDrawdownSol = 0;
  let maxDrawdownPct = 0;
  for (const t of closed) {
    cum += t.pnlSol;
    equityCurve.push({ ts: t.closeTs, cum });
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdownSol) {
      maxDrawdownSol = dd;
      maxDrawdownPct = peak > EPS ? dd / peak : 0;
    }
    const cd = new Date(t.closeTs * 1e3);
    dowPnl[cd.getUTCDay()] += t.pnlSol;
    hourPnl[cd.getUTCHours()] += t.pnlSol;
    const day = utcDate(t.closeTs);
    pnlByDay.set(day, (pnlByDay.get(day) ?? 0) + t.pnlSol);
  }
  const allDays = /* @__PURE__ */ new Set([...tradesByDay.keys(), ...pnlByDay.keys()]);
  const dailyPnl = [...allDays].sort().map((date) => ({
    date,
    trades: tradesByDay.get(date) ?? 0,
    realizedSol: pnlByDay.get(date) ?? 0
  }));
  let greenDays = 0;
  let redDays = 0;
  let greenTradeSum = 0;
  let redTradeSum = 0;
  for (const d of dailyPnl) {
    if (d.realizedSol > EPS) {
      greenDays++;
      greenTradeSum += d.trades;
    } else if (d.realizedSol < -EPS) {
      redDays++;
      redTradeSum += d.trades;
    }
  }
  let currentGreenStreak = 0;
  for (let i = dailyPnl.length - 1; i >= 0; i--) {
    if (dailyPnl[i].realizedSol > EPS) currentGreenStreak++;
    else break;
  }
  let longestGreenStreak = 0;
  let run = 0;
  for (const d of dailyPnl) {
    if (d.realizedSol > EPS) {
      run++;
      if (run > longestGreenStreak) longestGreenStreak = run;
    } else {
      run = 0;
    }
  }
  const band = /* @__PURE__ */ new Map();
  for (const t of trades) {
    if (t.priceSol <= 0) continue;
    const b = band.get(t.mint);
    if (!b) band.set(t.mint, { min: t.priceSol, max: t.priceSol });
    else {
      if (t.priceSol < b.min) b.min = t.priceSol;
      if (t.priceSol > b.max) b.max = t.priceSol;
    }
  }
  let entryEffSum = 0;
  let entryEffN = 0;
  let exitEffSum = 0;
  let exitEffN = 0;
  for (const t of trades) {
    const b = band.get(t.mint);
    if (!b || b.max - b.min < EPS || t.priceSol <= 0) continue;
    const range = b.max - b.min;
    if (t.side === "buy") {
      entryEffSum += (b.max - t.priceSol) / range;
      entryEffN++;
    } else {
      exitEffSum += (t.priceSol - b.min) / range;
      exitEffN++;
    }
  }
  const roundTrips = pnl.trips.length;
  return {
    activeDays,
    tradesPerActiveDay: activeDays ? trades.length / activeDays : 0,
    avgPositionSizeSol: positionCount ? positionSum / positionCount : 0,
    maxPositionSizeSol: maxPosition,
    avgHoldSeconds: avgHold,
    medianHoldSeconds: median(holds),
    flipRate: roundTrips ? flips / roundTrips : 0,
    revengeRate: losingExits.length ? revenge / losingExits.length : 0,
    maxTradesInDay,
    hourHistogram,
    bigLossRate: roundTrips ? bigLosses / roundTrips : 0,
    equityCurve,
    maxDrawdownSol,
    maxDrawdownPct,
    dowHistogram,
    dowPnl,
    hourPnl,
    dailyPnl,
    greenDays,
    redDays,
    currentGreenStreak,
    longestGreenStreak,
    avgTradesGreenDay: greenDays ? greenTradeSum / greenDays : 0,
    avgTradesRedDay: redDays ? redTradeSum / redDays : 0,
    avgEntryEfficiency: entryEffN ? entryEffSum / entryEffN : 0,
    avgExitEfficiency: exitEffN ? exitEffSum / exitEffN : 0
  };
}
function computeSession(trades, pnl, date) {
  const day = date ?? (trades.length ? utcDate(Math.max(...trades.map((t) => t.timestamp))) : "all");
  const start = Date.parse(`${day}T00:00:00Z`) / 1e3;
  const end = start + DAY;
  const inDay = (ts) => ts >= start && ts < end;
  const dayTrades = trades.filter((t) => inDay(t.timestamp));
  const dayTrips = pnl.trips.filter((t) => inDay(t.closeTs));
  const realized = dayTrips.reduce((a, t) => a + t.pnlSol, 0);
  const wins = dayTrips.filter((t) => t.pnlSol > 0).length;
  const buys = dayTrades.filter((t) => t.side === "buy");
  const posAvg = buys.length ? buys.reduce((a, t) => a + t.solAmount, 0) / buys.length : 0;
  const flips = dayTrips.filter((t) => t.holdSeconds > 0 && t.holdSeconds < 120).length;
  const losingExits = dayTrips.filter((t) => t.pnlSol < 0);
  let revenge = 0;
  for (const loss of losingExits) {
    if (trades.some(
      (t) => t.side === "buy" && t.mint === loss.mint && t.timestamp > loss.closeTs && t.timestamp - loss.closeTs <= 1800
    )) {
      revenge++;
    }
  }
  return {
    date: day,
    trades: dayTrades.length,
    realizedSol: realized,
    winRate: dayTrips.length ? wins / dayTrips.length : 0,
    roundTrips: dayTrips.length,
    avgPositionSizeSol: posAvg,
    flipRate: dayTrips.length ? flips / dayTrips.length : 0,
    revengeRate: losingExits.length ? revenge / losingExits.length : 0
  };
}

// ../src/lib/analytics/pnl.ts
var EPS2 = 1e-9;
function computePnL(trades) {
  const ordered = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const lotsByMint = /* @__PURE__ */ new Map();
  const tokenAgg = /* @__PURE__ */ new Map();
  const trips = [];
  const tokenOf = (t) => {
    let agg = tokenAgg.get(t.mint);
    if (!agg) {
      agg = {
        mint: t.mint,
        symbol: t.symbol,
        realizedSol: 0,
        buys: 0,
        sells: 0,
        totalBoughtSol: 0,
        totalSoldSol: 0,
        openTokens: 0,
        openCostSol: 0,
        roundTrips: 0,
        wins: 0
      };
      tokenAgg.set(t.mint, agg);
    }
    if (!agg.symbol && t.symbol) agg.symbol = t.symbol;
    return agg;
  };
  let buys = 0;
  let sells = 0;
  for (const t of ordered) {
    const agg = tokenOf(t);
    const lots = lotsByMint.get(t.mint) ?? [];
    lotsByMint.set(t.mint, lots);
    if (t.side === "buy") {
      buys++;
      agg.buys++;
      agg.totalBoughtSol += t.solAmount;
      lots.push({ tokens: t.tokenAmount, costSol: t.solAmount, ts: t.timestamp });
      continue;
    }
    sells++;
    agg.sells++;
    agg.totalSoldSol += t.solAmount;
    let remaining = t.tokenAmount;
    const proceedsPerToken = t.tokenAmount > EPS2 ? t.solAmount / t.tokenAmount : 0;
    while (remaining > EPS2 && lots.length > 0) {
      const lot = lots[0];
      const take = Math.min(remaining, lot.tokens);
      const fraction = lot.tokens > EPS2 ? take / lot.tokens : 0;
      const cost = lot.costSol * fraction;
      const proceeds = proceedsPerToken * take;
      const pnl = proceeds - cost;
      trips.push({
        mint: t.mint,
        symbol: t.symbol ?? agg.symbol,
        openTs: lot.ts,
        closeTs: t.timestamp,
        holdSeconds: Math.max(0, t.timestamp - lot.ts),
        tokenAmount: take,
        costSol: cost,
        proceedsSol: proceeds,
        pnlSol: pnl,
        roi: cost > EPS2 ? pnl / cost : 0
      });
      agg.realizedSol += pnl;
      agg.roundTrips++;
      if (pnl > 0) agg.wins++;
      lot.tokens -= take;
      lot.costSol -= cost;
      remaining -= take;
      if (lot.tokens <= EPS2) lots.shift();
    }
    if (remaining > EPS2) {
      const proceeds = proceedsPerToken * remaining;
      trips.push({
        mint: t.mint,
        symbol: t.symbol ?? agg.symbol,
        openTs: t.timestamp,
        closeTs: t.timestamp,
        holdSeconds: 0,
        tokenAmount: remaining,
        costSol: 0,
        proceedsSol: proceeds,
        pnlSol: proceeds,
        roi: 0
      });
      agg.realizedSol += proceeds;
      agg.roundTrips++;
      if (proceeds > 0) agg.wins++;
    }
  }
  for (const [mint, lots] of lotsByMint) {
    const agg = tokenAgg.get(mint);
    if (!agg) continue;
    for (const lot of lots) {
      agg.openTokens += lot.tokens;
      agg.openCostSol += lot.costSol;
    }
  }
  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let bestTrip;
  let worstTrip;
  for (const trip of trips) {
    if (trip.pnlSol > 0) {
      grossProfit += trip.pnlSol;
      wins++;
    } else {
      grossLoss += -trip.pnlSol;
    }
    if (!bestTrip || trip.pnlSol > bestTrip.pnlSol) bestTrip = trip;
    if (!worstTrip || trip.pnlSol < worstTrip.pnlSol) worstTrip = trip;
  }
  const realizedSol = grossProfit - grossLoss;
  const roundTrips = trips.length;
  return {
    realizedSol,
    totalTrades: trades.length,
    buys,
    sells,
    roundTrips,
    wins,
    losses: roundTrips - wins,
    winRate: roundTrips > 0 ? wins / roundTrips : 0,
    grossProfitSol: grossProfit,
    grossLossSol: grossLoss,
    profitFactor: grossLoss > EPS2 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    bestTrip,
    worstTrip,
    perToken: [...tokenAgg.values()].sort((a, b) => b.realizedSol - a.realizedSol),
    trips
  };
}

// ../src/lib/analytics/analyze.ts
function analyze(address, trades) {
  const pnl = computePnL(trades);
  const metrics = computeMetrics(trades, pnl);
  const session = computeSession(trades, pnl);
  const pointers = buildPointers(pnl, metrics, session);
  return {
    address,
    fetchedTrades: trades.length,
    pnl,
    metrics,
    session,
    pointers,
    trades
  };
}

// ../src/lib/solana/helius.ts
var WSOL = "So11111111111111111111111111111111111111112";
var LAMPORTS = 1e9;
var EPS3 = 1e-9;
var SOL_DUST = 5e-4;
function rawToNum(b) {
  if (!b?.rawTokenAmount) return 0;
  const { tokenAmount, decimals } = b.rawTokenAmount;
  const n = Number(tokenAmount);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals ?? 0);
}
function pickLegs(balances, address) {
  const list = balances ?? [];
  const owned = list.filter((b) => b.userAccount === address);
  return owned.length ? owned : list;
}
function splitSol(legs) {
  let sol = 0;
  let token;
  let tokenAmt = 0;
  for (const leg of legs) {
    if (leg.mint === WSOL) {
      sol += rawToNum(leg);
    } else {
      const amt = rawToNum(leg);
      if (amt > tokenAmt) {
        tokenAmt = amt;
        token = leg;
      }
    }
  }
  return { sol, token, tokenAmt };
}
function parseSwap(tx, address) {
  return parseFromSwapEvent(tx, address) ?? parseFromTransfers(tx, address);
}
function parseFromSwapEvent(tx, address) {
  const swap = tx.events?.swap;
  if (!swap) return null;
  const inLegs = pickLegs(swap.tokenInputs, address);
  const outLegs = pickLegs(swap.tokenOutputs, address);
  const inSplit = splitSol(inLegs);
  const outSplit = splitSol(outLegs);
  const solIn = (swap.nativeInput?.amount ?? 0) / LAMPORTS + inSplit.sol;
  const solOut = (swap.nativeOutput?.amount ?? 0) / LAMPORTS + outSplit.sol;
  let side;
  let solAmount;
  let token;
  let tokenAmount;
  if (solIn > 0 && solOut === 0) {
    side = "buy";
    solAmount = solIn;
    token = outSplit.token;
    tokenAmount = outSplit.tokenAmt;
  } else if (solOut > 0 && solIn === 0) {
    side = "sell";
    solAmount = solOut;
    token = inSplit.token;
    tokenAmount = inSplit.tokenAmt;
  } else {
    return null;
  }
  if (!token || tokenAmount <= 0 || solAmount <= 0) return null;
  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    mint: token.mint,
    side,
    solAmount,
    tokenAmount,
    priceSol: solAmount / tokenAmount,
    source: tx.source
  };
}
function parseFromTransfers(tx, address) {
  const tokenNet = /* @__PURE__ */ new Map();
  let wsolNet = 0;
  for (const t of tx.tokenTransfers ?? []) {
    const amt = Number(t.tokenAmount) || 0;
    if (amt === 0) continue;
    let delta = 0;
    if (t.toUserAccount === address) delta += amt;
    if (t.fromUserAccount === address) delta -= amt;
    if (delta === 0) continue;
    if (t.mint === WSOL) wsolNet += delta;
    else tokenNet.set(t.mint, (tokenNet.get(t.mint) ?? 0) + delta);
  }
  let mint;
  let net = 0;
  for (const [m, v] of tokenNet) {
    if (Math.abs(v) > Math.abs(net)) {
      net = v;
      mint = m;
    }
  }
  if (!mint || Math.abs(net) < EPS3) return null;
  const userAcct = (tx.accountData ?? []).find((a) => a.account === address);
  const nativeDelta = userAcct ? userAcct.nativeBalanceChange / LAMPORTS : 0;
  const solSigned = Math.abs(wsolNet) > EPS3 ? wsolNet : nativeDelta;
  let side;
  if (net > 0 && solSigned < -SOL_DUST) {
    side = "buy";
  } else if (net < 0 && solSigned > SOL_DUST) {
    side = "sell";
  } else {
    return null;
  }
  const tokenAmount = Math.abs(net);
  const solAmount = Math.abs(solSigned);
  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    mint,
    side,
    solAmount,
    tokenAmount,
    priceSol: solAmount / tokenAmount,
    source: tx.source
  };
}
var BEFORE_HINT = /before-signature[`'" ]*parameter set to[`'" ]*([1-9A-HJ-NP-Za-km-z]{32,88})/i;
async function fetchTrades(address, opts = { apiKey: "" }) {
  const { apiKey, maxPages = 40 } = opts;
  if (!apiKey) throw new Error("Missing Helius API key");
  const trades = [];
  let before;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);
    let res = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status !== 429) break;
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      await sleep(retryAfter > 0 ? retryAfter * 1e3 : 400 * (attempt + 1));
    }
    if (!res) break;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 404) {
        const hint = body.match(BEFORE_HINT)?.[1];
        if (hint && hint !== before) {
          before = hint;
          continue;
        }
        break;
      }
      if (res.status === 429) break;
      throw new Error(`Helius ${res.status}: ${body.slice(0, 200)}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const tx of batch) {
      const trade = parseSwap(tx, address);
      if (trade) trades.push(trade);
    }
    before = batch[batch.length - 1]?.signature;
    if (batch.length < 100) break;
    await sleep(120);
  }
  return trades.sort((a, b) => a.timestamp - b.timestamp);
}
async function fetchTokenSymbols(mints, apiKey) {
  const out = /* @__PURE__ */ new Map();
  const unique = [...new Set(mints)].filter(Boolean);
  if (!apiKey || unique.length === 0) return out;
  const rpc = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  for (let i = 0; i < unique.length; i += 1e3) {
    const ids = unique.slice(i, i + 1e3);
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "trading-os",
          method: "getAssetBatch",
          params: { ids }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const asset of data.result ?? []) {
        if (!asset) continue;
        const label = asset.content?.metadata?.symbol || asset.token_info?.symbol || asset.content?.metadata?.name;
        if (label) out.set(asset.id, label.trim());
      }
    } catch {
    }
  }
  return out;
}
async function fetchSolPriceUsd() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return void 0;
    const data = await res.json();
    return data.solana?.usd;
  } catch {
    return void 0;
  }
}

// ../src/lib/solana/prices.ts
async function fetchTokenPrices(mints) {
  const out = /* @__PURE__ */ new Map();
  const unique = [...new Set(mints)].filter(Boolean).slice(0, 30);
  if (unique.length === 0) return out;
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${unique.join(",")}`,
      { headers: { accept: "application/json" } }
    );
    if (!res.ok) return out;
    const data = await res.json();
    for (const p of data.pairs ?? []) {
      const mint = p.baseToken?.address;
      if (!mint) continue;
      const liq = p.liquidity?.usd ?? 0;
      const prev = out.get(mint);
      if (prev && (prev.liquidityUsd ?? 0) >= liq) continue;
      out.set(mint, {
        mint,
        symbol: p.baseToken?.symbol,
        priceUsd: p.priceUsd ? Number(p.priceUsd) : void 0,
        priceSol: p.priceNative ? Number(p.priceNative) : void 0,
        change24h: p.priceChange?.h24,
        liquidityUsd: liq
      });
    }
  } catch {
  }
  return out;
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

// src/background.ts
async function handleAnalyze(address) {
  const { heliusKey } = await getSettings();
  if (!heliusKey) return { ok: false, error: "No Helius key configured (set one in the popup)." };
  try {
    const [trades, solPriceUsd] = await Promise.all([
      fetchTrades(address, { apiKey: heliusKey }),
      fetchSolPriceUsd()
    ]);
    if (trades.length === 0) {
      return { ok: false, error: "No swap history found for this wallet." };
    }
    const symbols = await fetchTokenSymbols(
      trades.map((t) => t.mint),
      heliusKey
    );
    for (const t of trades) {
      const label = symbols.get(t.mint);
      if (label) t.symbol = label;
    }
    const result = analyze(address, trades);
    return { ok: true, result: { ...result, solPriceUsd } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Analyze failed" };
  }
}
async function handlePrices(mints) {
  try {
    const map = await fetchTokenPrices(mints);
    const prices = {};
    for (const [mint, p] of map) {
      prices[mint] = {
        priceUsd: p.priceUsd,
        priceSol: p.priceSol,
        change24h: p.change24h,
        symbol: p.symbol
      };
    }
    return { ok: true, prices };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Prices failed" };
  }
}
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === "ANALYZE") sendResponse(await handleAnalyze(msg.address));
    else if (msg.type === "PRICES") sendResponse(await handlePrices(msg.mints));
    else sendResponse({ ok: false, error: "Unknown message" });
  })();
  return true;
});
