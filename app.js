const DEFAULT_VALUES = [
  { price: 1, emoji: "🍬", name: "Kaugummi" },
  { price: 2, emoji: "🍦", name: "Kugel Eis" },
  { price: 3, emoji: "🥐", name: "Pain au chocolat" },
  { price: 5, emoji: "💎", name: "Edelstein" },
  { price: 10, emoji: "📖", name: "Buch" },
  { price: 20, emoji: "🎵", name: "Tonie" },
  { price: 50, emoji: "🪆", name: "Puppe" },
  { price: 100, emoji: "🚲", name: "gebrauchtes Fahrrad" },
];
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const euro = (c) =>
  (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const cents = (n) => Math.round(Number(n) * 100);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
let db,
  selectedValue = DEFAULT_VALUES[1];
const LEARNING = [
  null,
  {
    name: "🪙 Münzling",
    place: "Beim Münzling",
    book: "Mein Geld",
    nav: "Mein Geld",
    gift: "Vom Münzling geschenkt",
    deposit: "Zum Münzling",
    withdraw: "Zu mir",
    empty: "Hier passiert bald etwas mit deinem Geld 🌱",
  },
  {
    name: "🌱 Sparen",
    place: "Mein gespartes Geld",
    book: "Mein Geld",
    nav: "Sparen",
    gift: "Mein gespartes Geld wächst",
    deposit: "Sparen",
    withdraw: "Zum Ausgeben",
    empty: "Noch hast du nichts gespart 🌱",
  },
  {
    name: "🏦 Sparkonto",
    place: "Auf meinem Sparkonto",
    book: "Mein Sparkonto",
    nav: "Konto",
    gift: "Mein Sparkonto wächst",
    deposit: "Einzahlen",
    withdraw: "Abheben",
    empty: "Auf deinem Sparkonto ist noch nichts passiert 🌱",
  },
  {
    name: "✨ Zinsen",
    place: "Auf meinem Sparkonto",
    book: "Mein Sparkonto",
    nav: "Konto",
    gift: "Zinsen",
    deposit: "Einzahlen",
    withdraw: "Abheben",
    empty: "Auf deinem Sparkonto ist noch nichts passiert 🌱",
  },
  {
    name: "📈 Zinseszins",
    place: "Auf meinem Sparkonto",
    book: "Mein Sparkonto",
    nav: "Konto",
    gift: "Zinsen",
    deposit: "Einzahlen",
    withdraw: "Abheben",
    empty: "Auf deinem Sparkonto ist noch nichts passiert 🌱",
  },
];
async function learning() {
  let n = Number((await getSetting("learningLevel")) || 1);
  return { level: n, ...LEARNING[n] };
}
function req(r) {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function txDone(t) {
  return new Promise((res, rej) => {
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}
async function openDB() {
  db = await new Promise((res, rej) => {
    let r = indexedDB.open("monas-bank", 1);
    r.onupgradeneeded = () => {
      let d = r.result;
      if (!d.objectStoreNames.contains("transactions")) {
        let s = d.createObjectStore("transactions", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("date", "date");
      }
      if (!d.objectStoreNames.contains("settings"))
        d.createObjectStore("settings", { keyPath: "key" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  if (!(await getSetting("initialized"))) {
    await setSetting("allowance", 300);
    await setSetting("interestRate", 5);
    await setSetting("values", DEFAULT_VALUES);
    await setSetting("childName", "");
    await setSetting("learningLevel", 1);
    await setSetting("initialized", true);
  }
}
async function getSetting(k) {
  let t = db.transaction("settings");
  let v = await req(t.objectStore("settings").get(k));
  return v?.value;
}
async function setSetting(k, v) {
  let t = db.transaction("settings", "readwrite");
  t.objectStore("settings").put({ key: k, value: v });
  await txDone(t);
}
async function transactions() {
  let t = db.transaction("transactions");
  return await req(t.objectStore("transactions").getAll());
}
async function addTx(type, amount, label, date = today()) {
  let t = db.transaction("transactions", "readwrite");
  t.objectStore("transactions").add({
    date,
    type,
    amount,
    label,
    createdAt: Date.now(),
  });
  await txDone(t);
}
async function balance() {
  return (await transactions()).reduce((a, x) => a + x.amount, 0);
}
async function sha(s) {
  let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function render() {
  let child = ((await getSetting("childName")) || "").trim(),
    l = await learning(),
    b = await balance(),
    rate = await getSetting("interestRate");
  $("#childBankLabel").textContent = child ? `Für ${child}` : "Dein Geld";
  $("#moneyOwnerLabel").textContent =
    `${l.place.toUpperCase()}${child ? " · FÜR " + child.toUpperCase() : ""}`;
  $("#bookTitle").textContent = l.book;
  $("#savedPlaceLabel").textContent = l.place;
  $("#balance").textContent = euro(b);
  $("#depositBtn").querySelector("span").textContent = l.deposit;
  $("#withdrawBtn").querySelector("span").textContent = l.withdraw;
  document.querySelector("[data-view=book] span").textContent = l.nav;
  let interest = Math.round((b * rate) / 100);
  $("#nextInterest").textContent =
    l.level < 4
      ? `✨ ${l.gift}: ungefähr ${euro(interest)}`
      : `✨ ${l.gift}: ungefähr ${euro(interest)}${l.level >= 5 ? " bei " + rate + " %" : ""}`;
  $("#interestLabel").textContent =
    l.level < 4
      ? l.gift
      : `${l.gift}${l.level >= 5 ? " · " + rate + " % pro Woche" : ""}`;
  await renderValues(b);
  await renderLedger();
  await renderSunday();
  await renderGrowth();
}
async function renderValues(b) {
  let vals = (await getSetting("values")) || DEFAULT_VALUES;
  $("#valueChoices").innerHTML = vals
    .map(
      (v, i) =>
        `<button class="value-choice ${selectedValue.name === v.name ? "active" : ""}" data-i="${i}"><span class="emoji">${v.emoji}</span>${v.price} €</button>`,
    )
    .join("");
  $$(".value-choice").forEach(
    (x) =>
      (x.onclick = () => {
        selectedValue = vals[+x.dataset.i];
        renderValues(b);
      }),
  );
  let p = cents(selectedValue.price),
    n = Math.floor(b / p),
    rem = b - n * p,
    el = $("#valueResult");
  if (n > 0)
    el.innerHTML = `<div class="big">${selectedValue.emoji} ${n}×</div><b>${n} ${selectedValue.name}${n === 1 ? "" : "s"}</b><span>${rem ? euro(rem) + " übrig" : ""}</span>`;
  else {
    let pct = Math.min(100, (b / p) * 100);
    el.innerHTML = `<div class="big">${selectedValue.emoji}</div><b>${euro(b)} von ${euro(p)}</b><div class="progress"><i style="width:${pct}%"></i></div><span>Noch ${euro(p - b)}</span>`;
  }
}
async function renderLedger() {
  let l = await learning(),
    xs = (await transactions()).sort((a, b) => b.createdAt - a.createdAt),
    running = 0,
    chronological = [...xs].sort((a, b) => a.createdAt - b.createdAt),
    after = new Map();
  chronological.forEach((x) => {
    running += x.amount;
    after.set(x.id, running);
  });
  let label = (x) =>
    x.type === "interest"
      ? l.level < 4
        ? l.gift
        : "Zinsen"
      : x.amount >= 0
        ? l.level === 1
          ? "Dem Münzling gegeben"
          : l.level === 2
            ? "Gespart"
            : "Eingezahlt"
        : l.level <= 2
          ? "Zum Ausgeben genommen"
          : "Abgehoben";
  $("#ledger").innerHTML = xs.length
    ? xs
        .map(
          (x) =>
            `<div class="entry"><b>${fmt(x.date)}</b><span>${x.type === "interest" ? "✨" : x.amount >= 0 ? "➡️🪙" : "🪙➡️"} ${label(x)}</span><span class="amount">${x.amount >= 0 ? "+" : ""}${euro(x.amount)}</span><span class="after">Danach: ${euro(after.get(x.id))}</span></div>`,
        )
        .join("")
    : `<p class="muted">${l.empty}</p>`;
}
function sundayKey(d = new Date()) {
  let x = new Date(d);
  let day = x.getDay();
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}
async function renderSunday() {
  let l = await learning(),
    key = sundayKey(),
    done = (await getSetting("lastSunday")) === key,
    day = new Date().getDay(),
    b = await balance(),
    rate = await getSetting("interestRate"),
    allow = await getSetting("allowance"),
    interest = Math.round((b * rate) / 100),
    c = $("#sundayContent");
  let explain =
    l.level < 4
      ? "Dein Geld ist gewachsen!"
      : l.level === 4
        ? `Du bekommst ${euro(interest)} Zinsen.`
        : `Du bekommst ${euro(interest)} Zinsen. Auch frühere Zinsen bekommen wieder Zinsen!`;
  if (done)
    c.innerHTML = `<div class="sunday-card"><div class="confetti">🎉✨🪙</div><div class="huge">Fertig!</div><p>Nächsten Sonntag geht's weiter.</p></div>`;
  else if (day !== 0)
    c.innerHTML = `<div class="sunday-card"><div class="huge">${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][day]}</div><p>Noch ein bisschen warten …</p><b>Sonntag ist Taschengeldtag 🪙</b></div>`;
  else
    ((c.innerHTML = `<div class="sunday-card"><p>${l.level === 1 ? "Der Münzling hat auf dein Geld aufgepasst 🪙" : l.place}</p><div class="huge">✨ + ${euro(interest)}</div><p>${explain}</p><button class="primary" id="startSunday">Los geht's! 🎉</button></div>`),
      $("#startSunday") &&
        ($("#startSunday").onclick = () => sundayFlow(b, rate, allow, key)));
}
async function sundayFlow(b, rate, allow, key) {
  let l = await learning(),
    interest = Math.round((b * rate) / 100);
  if (interest > 0)
    await addTx("interest", interest, l.level < 4 ? l.gift : "Zinsen");
  let count = Math.round(allow / 100),
    save = 0,
    c = $("#sundayContent");
  c.innerHTML = `<div class="sunday-card"><div class="confetti">✨ +${euro(interest)}</div><h2>Deine ${euro(allow)}!</h2><p>${l.level === 1 ? "Welche Münzen darf der Münzling für dich aufbewahren?" : "Wie viel möchtest du " + (l.level === 2 ? "sparen?" : "auf dein Sparkonto einzahlen?")}</p><div class="choice-hint"><span>👧 ${l.level <= 2 ? "Bei mir" : "Bargeld"}</span><span>🪙 ${l.place}</span></div><div class="coins">${Array.from({ length: count }, (_, i) => `<button class="coin" data-i="${i}">1 €</button>`).join("")}</div><div class="huge" id="saveSum">0 € 🪙</div><button class="primary" id="saveSunday">So machen!</button></div>`;
  $$(".coin").forEach(
    (x) =>
      (x.onclick = () => {
        x.classList.toggle("saved");
        save = $$(".coin.saved").length * 100;
        $("#saveSum").textContent = `${euro(save)} 🪙`;
      }),
  );
  $("#saveSunday").onclick = async () => {
    if (save)
      await addTx(
        "allowance",
        save,
        l.level === 1
          ? "Dem Münzling gegeben"
          : l.level === 2
            ? "Gespart"
            : "Eingezahlt",
      );
    await setSetting("lastSunday", key);
    await render();
  };
}
async function renderGrowth() {
  let xs = (await transactions()).sort((a, b) => a.createdAt - b.createdAt),
    sum = 0,
    pts = [];
  xs.forEach((x) => {
    sum += x.amount;
    pts.push({ date: x.date, value: sum });
  });
  $("#interestTotal").textContent = euro(
    xs.filter((x) => x.type === "interest").reduce((a, x) => a + x.amount, 0),
  );
  drawChart(pts);
}
function drawChart(pts) {
  let c = $("#chart"),
    ctx = c.getContext("2d"),
    w = c.width,
    h = c.height,
    p = 55;
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#dce3ea";
  ctx.beginPath();
  ctx.moveTo(p, 20);
  ctx.lineTo(p, h - p);
  ctx.lineTo(w - 20, h - p);
  ctx.stroke();
  if (!pts.length) {
    ctx.fillStyle = "#667";
    ctx.font = "28px system-ui";
    ctx.fillText("Hier wächst bald dein Geld 🌱", 110, 210);
    return;
  }
  let max = Math.max(...pts.map((x) => x.value), 100),
    minT = Math.min(...pts.map((x) => new Date(x.date).getTime())),
    maxT = Math.max(...pts.map((x) => new Date(x.date).getTime()));
  if (maxT === minT) maxT += 86400000;
  ctx.strokeStyle = "#657dd4";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach((x, i) => {
    let xx =
        p +
        ((new Date(x.date).getTime() - minT) / (maxT - minT)) * (w - p - 30),
      yy = h - p - (x.value / max) * (h - p - 40);
    i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  });
  ctx.stroke();
  ctx.fillStyle = "#657dd4";
  pts.forEach((x) => {
    let xx =
        p +
        ((new Date(x.date).getTime() - minT) / (maxT - minT)) * (w - p - 30),
      yy = h - p - (x.value / max) * (h - p - 40);
    ctx.beginPath();
    ctx.arc(xx, yy, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#526";
  ctx.font = "22px system-ui";
  ctx.fillText(euro(max), 4, 35);
  ctx.fillText("0 €", 12, h - p + 8);
}
async function moneyDialog(kind) {
  let l = await learning(),
    d = $("#moneyDialog"),
    body = $("#moneyDialogBody"),
    title = kind === "deposit" ? l.deposit : l.withdraw;
  body.innerHTML = `<h2>${kind === "deposit" ? "➡️🪙" : "🪙➡️👧"} ${title}</h2><div class="amount-grid">${[1, 2, 3, 5, 10, 20].map((n) => `<button type="button" data-n="${n}">${n} €</button>`).join("")}</div><div class="field"><label>Oder anderer Betrag</label><input id="customAmount" inputmode="decimal" placeholder="0,00"></div><button type="button" class="primary" id="moneyOk">Fertig</button>`;
  let chosen = 0;
  body.querySelectorAll("[data-n]").forEach(
    (x) =>
      (x.onclick = () => {
        chosen = +x.dataset.n;
        body
          .querySelectorAll("[data-n]")
          .forEach((y) => (y.style.outline = ""));
        x.style.outline = "5px solid #ffd96a";
      }),
  );
  $("#moneyOk").onclick = async () => {
    let n = parseFloat(
      ($("#customAmount").value || chosen).toString().replace(",", "."),
    );
    if (!n || n <= 0) return;
    let amt = cents(n);
    if (kind === "withdraw" && amt > (await balance())) {
      alert("So viel Geld ist gerade nicht da.");
      return;
    }
    await addTx(
      kind,
      kind === "deposit" ? amt : -amt,
      kind === "deposit" ? l.deposit : l.withdraw,
    );
    d.close();
    await render();
  };
  d.showModal();
}
async function parentOpen() {
  let pinHash = await getSetting("pinHash");
  if (!pinHash) return setupPin();
  let pin = prompt("Eltern-PIN");
  if (!pin || (await sha(pin)) !== pinHash) return;
  showParent();
}
function setupPin() {
  let body = $("#parentBody");
  body.innerHTML = `<h2>⚙️ Eltern-PIN</h2><p>Lege eine PIN fest.</p><div class="field"><input id="newPin" type="password" inputmode="numeric" maxlength="8" placeholder="PIN"></div><button class="primary" id="setPin">PIN speichern</button>`;
  $("#parentDialog").showModal();
  $("#setPin").onclick = async () => {
    let p = $("#newPin").value;
    if (p.length < 4) return alert("Bitte mindestens 4 Ziffern.");
    await setSetting("pinHash", await sha(p));
    showParent();
  };
}
async function showParent() {
  let allow = await getSetting("allowance"),
    rate = await getSetting("interestRate"),
    child = (await getSetting("childName")) || "",
    level = Number((await getSetting("learningLevel")) || 1),
    body = $("#parentBody");
  body.innerHTML = `<h2>⚙️ Elternbereich</h2><div class="field"><label>Name des Kindes</label><input id="childNameSet" type="text" maxlength="30" autocomplete="off" value="${child.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}" placeholder="z. B. Mona"></div><div class="field"><label>🧠 Lernstufe</label><select id="learningSet">${LEARNING.slice(
    1,
  )
    .map(
      (x, i) =>
        `<option value="${i + 1}" ${level === i + 1 ? "selected" : ""}>${i + 1} · ${x.name}</option>`,
    )
    .join(
      "",
    )}</select><small>Die Begriffe wachsen mit dem Kind mit. Du entscheidest, wann die nächste Stufe passt.</small></div><div class="learning-preview" id="learningPreview"></div><div class="field"><label>Taschengeld pro Woche</label><input id="allowanceSet" type="number" step="1" min="0" value="${allow / 100}"></div><div class="field"><label>Zinsen pro Woche (%)</label><input id="rateSet" type="number" step="0.1" min="0" max="100" value="${rate}"></div><button class="primary" id="saveSettings">Speichern</button><h2>💾 Daten</h2><div class="parent-grid"><button class="primary" id="exportBtn">Export</button><button class="primary" id="importBtn">Import</button></div><input id="importFile" type="file" accept="application/json" hidden><h2>🔐 PIN</h2><button class="primary" id="changePin">PIN ändern</button>`;
  let preview = () => {
    let x = LEARNING[Number($("#learningSet").value)];
    $("#learningPreview").innerHTML =
      `<b>${x.name}</b><br>${x.place} · ${x.deposit} · ${x.gift}`;
  };
  preview();
  $("#learningSet").onchange = preview;
  if (!$("#parentDialog").open) $("#parentDialog").showModal();
  $("#saveSettings").onclick = async () => {
    await setSetting("childName", $("#childNameSet").value.trim());
    await setSetting("learningLevel", Number($("#learningSet").value));
    await setSetting("allowance", cents($("#allowanceSet").value));
    await setSetting("interestRate", Number($("#rateSet").value));
    await render();
    alert("Gespeichert ✓");
  };
  $("#changePin").onclick = setupPin;
  $("#exportBtn").onclick = exportData;
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = importData;
}
async function exportData() {
  let data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await req(
      db.transaction("settings").objectStore("settings").getAll(),
    ),
    transactions: await transactions(),
  };
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  a.download = `muenzling-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
async function importData(e) {
  let f = e.target.files[0];
  if (!f) return;
  let data = JSON.parse(await f.text());
  if (!confirm("Aktuelle Daten durch dieses Backup ersetzen?")) return;
  let t = db.transaction(["settings", "transactions"], "readwrite"),
    s = t.objectStore("settings"),
    x = t.objectStore("transactions");
  s.clear();
  x.clear();
  data.settings.forEach((v) => s.put(v));
  data.transactions.forEach((v) => {
    let c = { ...v };
    delete c.id;
    x.add(c);
  });
  await txDone(t);
  await render();
  alert("Backup geladen ✓");
}
$$("nav button").forEach(
  (b) =>
    (b.onclick = () => {
      $$(".view").forEach((v) => v.classList.remove("active"));
      $$("nav button").forEach((v) => v.classList.remove("active"));
      $("#" + b.dataset.view).classList.add("active");
      b.classList.add("active");
      render();
    }),
);
$("#depositBtn").onclick = () => moneyDialog("deposit");
$("#withdrawBtn").onclick = () => moneyDialog("withdraw");
$("#settingsBtn").onclick = parentOpen;
$("#parentClose").onclick = () => $("#parentDialog").close();
(async () => {
  await openDB();
  await render();
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("./service-worker.js");
})();
