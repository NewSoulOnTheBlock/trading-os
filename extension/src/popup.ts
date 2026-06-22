import { getSettings, setSettings } from "./config";

function $(id: string) {
  return document.getElementById(id) as HTMLInputElement;
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
    weeklyGoal: Math.max(0, Number($("weeklyGoal").value) || 0),
  });
  const saved = document.getElementById("saved");
  if (saved) {
    saved.textContent = "Saved ✓ — reload your Axiom tab to apply.";
    setTimeout(() => (saved.textContent = ""), 2500);
  }
}

document.getElementById("save")?.addEventListener("click", () => void save());
void load();
