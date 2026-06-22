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

// src/popup.ts
function $(id) {
  return document.getElementById(id);
}
async function load() {
  const s = await getSettings();
  $("heliusKey").value = s.heliusKey;
  $("wallet").value = s.wallet;
  $("dailyLossLimit").value = s.dailyLossLimit ? String(s.dailyLossLimit) : "";
  $("weeklyGoal").value = s.weeklyGoal ? String(s.weeklyGoal) : "";
}
async function save() {
  await setSettings({
    heliusKey: $("heliusKey").value.trim(),
    wallet: $("wallet").value.trim(),
    dailyLossLimit: Math.max(0, Number($("dailyLossLimit").value) || 0),
    weeklyGoal: Math.max(0, Number($("weeklyGoal").value) || 0)
  });
  const saved = document.getElementById("saved");
  if (saved) {
    saved.textContent = "Saved \u2713 \u2014 reload your Axiom tab to apply.";
    setTimeout(() => saved.textContent = "", 2500);
  }
}
document.getElementById("save")?.addEventListener("click", () => void save());
void load();
