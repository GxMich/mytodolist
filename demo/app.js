/************************************************
 * TODO HUB — Frontend statico (clean UI)
 * Backend: Apps Script (bridge iframe + postMessage)
 ************************************************/

// ✅ INCOLLA QUI l’URL DELLA WEB APP Apps Script (/exec)
const API_URL = "https://script.google.com/macros/s/AKfycbzeqFPNEYWnfkN0pEPfF2FdlCAUfOm73wGRs7B6pYiuoMi_FIuudoyLIf22eWh_nQY/exec";

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const state = {
  token: localStorage.getItem("todo_token") || "",
  user: null,
  items: [],
  q: "",
  filterType: "",
  sortBy: "when",
  tag: "",
  from: "",
  to: "",
  view: "inbox",
  cal: { y: new Date().getFullYear(), m: new Date().getMonth() },
  editing: null
};

/* ------------------ Toast ------------------ */
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.add("hidden"), 2400);
}

/* ------------------ Loader ------------------ */
let loadingCount = 0;
function setLoading(on, text="Caricamento…"){
  const box = $("#loading");
  const tt = $("#loadingText");
  if(!box || !tt) return;

  if(on){
    loadingCount++;
    tt.textContent = text;
    box.classList.remove("hidden");
  }else{
    loadingCount = Math.max(0, loadingCount - 1);
    if(loadingCount === 0) box.classList.add("hidden");
  }
}

/* ------------------ Utils ------------------ */
function pad2(n){ return String(n).padStart(2,"0"); }
function toLocalDT(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fromLocalDT(v){
  if(!v) return "";
  const d = new Date(v);
  if(isNaN(d.getTime())) return "";
  return d.toISOString();
}
function dayKey(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
function typeLabel(t){
  return ({task:"Task", event:"Evento", note:"Nota", project:"Progetto", shift:"Turno"})[t] || t;
}
function fmtWhen(it){
  if(!it.startAt) return "Senza data";
  const s = new Date(it.startAt);
  if(isNaN(s.getTime())) return "Senza data";
  const dd = `${pad2(s.getDate())}/${pad2(s.getMonth()+1)}`;
  const tt = `${pad2(s.getHours())}:${pad2(s.getMinutes())}`;
  if(it.allDay) return `${dd} • Tutto il giorno`;
  if(it.endAt){
    const e = new Date(it.endAt);
    if(!isNaN(e.getTime())){
      const t2 = `${pad2(e.getHours())}:${pad2(e.getMinutes())}`;
      return `${dd} • ${tt} → ${t2}`;
    }
  }
  return `${dd} • ${tt}`;
}

/* ------------------ API (NO CORS) ------------------ */
async function api(action, payload){
  const label =
    action === "ping" ? "Controllo backend…" :
    action === "login" ? "Accesso…" :
    action === "register" ? "Creazione account…" :
    action === "listItems" ? "Carico dati…" :
    "Caricamento…";

  setLoading(true, label);
  try{
    const res = await iframeBridgePost(API_URL, { action, payload });
    if(!res || res.ok !== true) throw new Error(res?.error || "Errore backend");
    return res;
  } finally {
    setLoading(false);
  }
}

function iframeBridgePost(url, { action, payload }){
  return new Promise((resolve, reject) => {
    if(!url || url.includes("PASTE_")){
      reject(new Error("Configura API_URL in app.js con l’URL /exec della Web App Apps Script."));
      return;
    }

    const cbid = "cb_" + Math.random().toString(36).slice(2);
    const origin = window.location.origin;

    const iframe = document.createElement("iframe");
    iframe.name = "if_" + cbid;
    iframe.style.display = "none";

    const form = document.createElement("form");
    form.action = url;
    form.method = "POST";
    form.target = iframe.name;

    const add = (k,v) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = k;
      i.value = v;
      form.appendChild(i);
    };

    add("action", action);
    add("payload", JSON.stringify(payload || {}));
    add("cbid", cbid);
    add("origin", origin);

    const cleanup = () => {
      try { form.remove(); } catch(_){}
      try { iframe.remove(); } catch(_){}
    };

    const onMessage = (ev) => {
      let data = ev.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch(_) {}
      }
      if(!data || data.cbid !== cbid) return;

      window.removeEventListener("message", onMessage);
      cleanup();
      resolve(data.result);
    };

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      window.removeEventListener("message", onMessage);
      cleanup();
      reject(new Error("Timeout backend. Controlla deploy Apps Script (accesso: Chiunque) e URL /exec."));
    }, 15000);
  });
}

/* ------------------ UI State ------------------ */
function showAuth(){
  $("#auth").classList.remove("hidden");
  $("#app").classList.add("hidden");
  $("#syncBtn").classList.add("hidden");
  $("#logoutBtn").classList.add("hidden");
}
function showApp(){
  $("#auth").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#syncBtn").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
}
function setUserUI(user){
  $("#userName").textContent = user.name || "—";
  $("#userEmail").textContent = user.email || "—";
  $("#profileName").value = user.name || "";
  $("#profileEmail").value = user.email || "";
  $("#avatar").textContent = (user.name || user.email || "U").trim().slice(0,1).toUpperCase();
}

function ensureStatusOptions(type){
  const sel = $("#fStatus");
  const opts = (type === "task") ? ["todo","doing","done"] : ["open","closed"];
  sel.innerHTML = opts.map(o=>`<option value="${o}">${o}</option>`).join("");
  sel.value = (type === "task") ? "todo" : "open";
}

function setView(v){
  state.view = v;
  $$(".navbtn").forEach(b => b.classList.toggle("is-active", b.dataset.view === v));
  $$(".view").forEach(el => el.classList.add("hidden"));
  $("#view-"+v).classList.remove("hidden");

  if(v === "calendar") renderCalendar();
  if(v === "projects") renderProjects();
  if(v === "notes") renderNotes();
}

/* ------------------ Boot ------------------ */
async function boot(){
  showAuth();

  try{
    const p = await api("ping", {});
    toast(`Ping OK • ${p.version}`);
  }catch(e){
    toast("Ping KO: " + e.message);
  }

  if(!state.token) return;

  try{
    const me = await api("me", { token: state.token });
    state.user = me.user;
    setUserUI(state.user);
    showApp();
    await refreshItems(true);
    setView("inbox");
  }catch(_){
    localStorage.removeItem("todo_token");
    state.token = "";
    showAuth();
  }
}

async function refreshItems(initial=false){
  const now = new Date();
  const from = state.from ? new Date(state.from) : new Date(now.getTime() - 7*864e5);
  const to   = state.to ? new Date(state.to) : new Date(now.getTime() + 45*864e5);

  const out = await api("listItems", {
    token: state.token,
    from: from.toISOString(),
    to: to.toISOString(),
    type: state.filterType || "",
    tag: state.tag || ""
  });

  state.items = out.items || [];
  renderAll();
  if(!initial) toast("Sincronizzato");
}

function renderAll(){
  renderInbox();
  renderCalendar();
  renderProjects();
  renderNotes();
  populateProjectSelect();
}

/* ------------------ Top Search ------------------ */
$("#q").addEventListener("input", (e)=>{ state.q = e.target.value; renderInbox(); });
$("#clearQ").addEventListener("click", ()=>{ $("#q").value=""; state.q=""; renderInbox(); });

/* ------------------ Filters ------------------ */
$("#filterType").addEventListener("change", async (e)=>{
  state.filterType = e.target.value;
  await refreshItems();
});
$("#sortBy").addEventListener("change", (e)=>{ state.sortBy = e.target.value; renderInbox(); });

$("#applyTag").addEventListener("click", async ()=>{
  state.tag = $("#tagFilter").value.trim();
  await refreshItems();
});

$("#applyRange").addEventListener("click", async ()=>{
  state.from = $("#fromDate").value || "";
  state.to = $("#toDate").value || "";
  await refreshItems();
});

$("#todayBtn").addEventListener("click", async ()=>{
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0);
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59);
  state.from = from.toISOString().slice(0,10);
  state.to = to.toISOString().slice(0,10);
  $("#fromDate").value = state.from;
  $("#toDate").value = state.to;
  await refreshItems();
});

$("#syncBtn").addEventListener("click", ()=> refreshItems());

/* ------------------ Nav ------------------ */
$$(".navbtn").forEach(b => b.addEventListener("click", ()=> setView(b.dataset.view)));

/* ------------------ Auth ------------------ */
$$(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".tab").forEach(t=>t.classList.remove("is-active"));
    btn.classList.add("is-active");
    const tab = btn.dataset.tab;
    $("#loginForm").classList.toggle("hidden", tab !== "login");
    $("#registerForm").classList.toggle("hidden", tab !== "register");
  });
});

$("#loginForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  try{
    const out = await api("login", {
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || "").trim()
    });
    state.token = out.token;
    localStorage.setItem("todo_token", state.token);
    state.user = out.user;
    setUserUI(state.user);
    showApp();
    await refreshItems(true);
    setView("inbox");
    toast("Benvenuto");
  }catch(err){
    toast(err.message);
  }
});

$("#registerForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  try{
    await api("register", {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || "").trim()
    });
    toast("Account creato. Ora fai login.");
    $$(".tab")[0].click();
  }catch(err){
    toast(err.message);
  }
});

$("#logoutBtn").addEventListener("click", ()=>{
  localStorage.removeItem("todo_token");
  state.token = "";
  state.user = null;
  state.items = [];
  showAuth();
  toast("Logout");
});

/* ------------------ Ping ------------------ */
$("#pingBtn").addEventListener("click", async ()=>{
  try{
    const p = await api("ping", {});
    toast(`Ping OK • ${p.time}`);
  }catch(e){
    toast("Ping KO: " + e.message);
  }
});

/* ------------------ Inbox ------------------ */
function whenSort(a,b){
  const as = a.startAt ? new Date(a.startAt).getTime() : 9e18;
  const bs = b.startAt ? new Date(b.startAt).getTime() : 9e18;
  if(as !== bs) return as - bs;
  if(!!b.urgency !== !!a.urgency) return (b.urgency?1:0) - (a.urgency?1:0);
  return (Number(b.priority||3) - Number(a.priority||3));
}

function getInboxItems(){
  const q = (state.q || "").trim().toLowerCase();
  let arr = state.items.slice();

  if(q){
    arr = arr.filter(it => {
      const hay = `${it.title||""}\n${it.description||""}\n${it.tags||""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const s = state.sortBy;
  arr.sort((a,b)=>{
    if(s==="priority"){
      const ap=Number(a.priority||3), bp=Number(b.priority||3);
      if(bp!==ap) return bp-ap;
      return whenSort(a,b);
    }
    if(s==="urgency"){
      const au=!!a.urgency, bu=!!b.urgency;
      if(bu!==au) return (bu?1:0)-(au?1:0);
      return whenSort(a,b);
    }
    if(s==="updated"){
      const au=a.updatedAt?new Date(a.updatedAt).getTime():0;
      const bu=b.updatedAt?new Date(b.updatedAt).getTime():0;
      if(bu!==au) return bu-au;
      return whenSort(a,b);
    }
    return whenSort(a,b);
  });

  return arr;
}

function projectTitleById(projectId){
  if(!projectId) return "";
  const p = state.items.find(x=>x.type==="project" && x.itemId === projectId);
  return p ? p.title : "";
}

function renderInbox(){
  const list = $("#list");
  const empty = $("#empty");
  list.innerHTML = "";

  const items = getInboxItems();
  if(items.length === 0){
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for(const it of items){
    const el = document.createElement("div");
    el.className = "item" + (it.urgency ? " urgent" : "");
    const proj = projectTitleById(it.projectId);

    const tags = (it.tags||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,5)
      .map(t=>`<span class="chip" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join("");

    el.innerHTML = `
      <div class="left">
        <div class="title">
          ${escapeHtml(it.title)}
          <span class="chip">${typeLabel(it.type)} • P${Number(it.priority||3)}</span>
          ${proj ? `<span class="chip">📁 ${escapeHtml(proj)}</span>` : ""}
        </div>
        <div class="meta">
          <span class="chip">${escapeHtml(fmtWhen(it))}</span>
          ${it.status ? `<span class="chip">${escapeHtml(it.status)}</span>` : ""}
          ${tags}
        </div>
        ${it.description ? `<div class="desc">${escapeHtml(it.description)}</div>` : ""}
      </div>
      <button class="kbtn" title="Modifica">✎</button>
    `;

    el.querySelector(".kbtn").addEventListener("click", ()=> openEditor(it));
    el.addEventListener("dblclick", ()=> openEditor(it));

    el.querySelectorAll(".chip[data-tag]").forEach(ch=>{
      ch.addEventListener("click", async ()=>{
        $("#tagFilter").value = ch.dataset.tag;
        state.tag = ch.dataset.tag;
        await refreshItems();
        toast("Filtro tag: " + state.tag);
      });
    });

    list.appendChild(el);
  }
}

/* ------------------ Projects & Notes ------------------ */
function renderProjects(){
  const wrap = $("#projects");
  if(!wrap) return;
  const projects = state.items.filter(it => it.type==="project" && !it.deleted);
  wrap.innerHTML = "";

  if(projects.length === 0){
    wrap.innerHTML = `<div class="card"><div style="font-weight:900">Nessun progetto</div><div class="muted">Crea un progetto e assegnalo a task/eventi/turni.</div></div>`;
    return;
  }

  for(const p of projects){
    const related = state.items.filter(it => it.projectId === p.itemId && it.type==="task");
    const done = related.filter(x=>x.status==="done").length;
    const total = related.length;

    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div style="font-weight:900">${escapeHtml(p.title)} <span class="chip">${done}/${total}</span></div>
      ${p.description ? `<div class="desc">${escapeHtml(p.description)}</div>` : ""}
      <div class="meta" style="margin-top:10px"><span class="chip">ID: ${escapeHtml(p.itemId.slice(0,8))}</span></div>
    `;
    el.addEventListener("dblclick", ()=> openEditor(p));
    wrap.appendChild(el);
  }
}

function renderNotes(){
  const wrap = $("#notes");
  if(!wrap) return;
  const notes = state.items.filter(it => it.type==="note" && !it.deleted);
  wrap.innerHTML = "";

  if(notes.length === 0){
    wrap.innerHTML = `<div class="card"><div style="font-weight:900">Nessuna nota</div><div class="muted">Crea note veloci e taggale.</div></div>`;
    return;
  }

  for(const n of notes.sort((a,b)=> (new Date(b.updatedAt||0)) - (new Date(a.updatedAt||0)) )){
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div style="font-weight:900">${escapeHtml(n.title)} <span class="chip">Nota</span></div>
      ${n.description ? `<div class="desc">${escapeHtml(n.description)}</div>` : ""}
    `;
    el.addEventListener("dblclick", ()=> openEditor(n));
    wrap.appendChild(el);
  }
}

/* ------------------ Calendar ------------------ */
const dow = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

$("#prevMonth").addEventListener("click", ()=>{
  state.cal.m--;
  if(state.cal.m<0){ state.cal.m=11; state.cal.y--; }
  renderCalendar();
});
$("#nextMonth").addEventListener("click", ()=>{
  state.cal.m++;
  if(state.cal.m>11){ state.cal.m=0; state.cal.y++; }
  renderCalendar();
});

function renderCalendar(){
  const cal = $("#calendar");
  if(!cal) return;

  const y=state.cal.y, m=state.cal.m;
  const first = new Date(y,m,1);
  const last = new Date(y,m+1,0);
  $("#monthLabel").textContent = first.toLocaleString("it-IT",{month:"long",year:"numeric"});

  const counts = new Map();
  for(const it of state.items){
    if(!it.startAt) continue;
    const d = new Date(it.startAt);
    if(isNaN(d.getTime())) continue;
    const k = dayKey(d);
    counts.set(k, (counts.get(k)||0) + 1);
  }

  const jsDow = first.getDay(); // 0 Sun..6 Sat
  const mondayIndex = (jsDow + 6) % 7;

  const grid = document.createElement("div");
  grid.className = "calgrid";

  for(const d of dow){
    const h = document.createElement("div");
    h.className = "dow";
    h.textContent = d;
    grid.appendChild(h);
  }

  const prevLast = new Date(y,m,0);
  for(let i=0;i<mondayIndex;i++){
    const day = prevLast.getDate() - (mondayIndex-1-i);
    const d = new Date(y,m-1,day);
    grid.appendChild(calCell(d,true,counts));
  }
  for(let d=1; d<=last.getDate(); d++){
    const date = new Date(y,m,d);
    grid.appendChild(calCell(date,false,counts));
  }
  while((grid.children.length-7) % 7 !== 0){
    const n = (grid.children.length-7) - (mondayIndex + last.getDate());
    const date = new Date(y,m+1,n+1);
    grid.appendChild(calCell(date,true,counts));
  }

  cal.innerHTML = "";
  cal.appendChild(grid);
}

function calCell(date, muted, counts){
  const cell = document.createElement("div");
  cell.className = "cell" + (muted ? " muted" : "");
  const k = dayKey(date);
  const has = counts.get(k) || 0;
  cell.innerHTML = `
    <div style="font-weight:900">${date.getDate()}</div>
    <div class="dot ${has ? "has" : ""}"></div>
  `;
  cell.addEventListener("click", ()=> openDay(date));
  return cell;
}

function openDay(date){
  const k = dayKey(date);
  const list = state.items
    .filter(it => it.startAt && dayKey(new Date(it.startAt)) === k)
    .sort(whenSort);

  $("#dayTitle").textContent = date.toLocaleDateString("it-IT", {weekday:"long", day:"2-digit", month:"long"});
  const box = $("#dayList");
  box.innerHTML = "";

  if(list.length===0){
    box.innerHTML = `<div class="item"><div class="muted">Niente in questo giorno.</div></div>`;
  }else{
    for(const it of list){
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="left">
          <div class="title">${escapeHtml(it.title)} <span class="chip">${typeLabel(it.type)}</span></div>
          <div class="meta"><span class="chip">${escapeHtml(fmtWhen(it))}</span></div>
        </div>
        <button class="kbtn" title="Modifica">✎</button>
      `;
      el.querySelector(".kbtn").addEventListener("click", ()=> openEditor(it));
      box.appendChild(el);
    }
  }

  $("#dayBox").classList.remove("hidden");
}

$("#closeDay").addEventListener("click", ()=> $("#dayBox").classList.add("hidden"));

/* ------------------ Profile ------------------ */
$("#saveProfile").addEventListener("click", async ()=>{
  try{
    const name = $("#profileName").value.trim();
    const out = await api("updateProfile", { token: state.token, name });
    state.user = out.user;
    setUserUI(state.user);
    toast("Profilo salvato");
  }catch(e){
    toast(e.message);
  }
});

/* ------------------ Modal editor ------------------ */
const modal = $("#modal");

$("#newBtn").addEventListener("click", ()=> openEditor(null));
$("#closeModal").addEventListener("click", closeEditor);
modal.addEventListener("click", (e)=>{ if(e.target === modal) closeEditor(); });

$("#fType").addEventListener("change", (e)=>{
  const type = e.target.value;
  ensureStatusOptions(type);
  applyTypeUI(type);
});

function applyTypeUI(type){
  const timeRow = $("#timeRow");
  if(type==="note" || type==="project") timeRow.classList.add("hidden");
  else timeRow.classList.remove("hidden");
}

function populateProjectSelect(){
  const sel = $("#fProjectId");
  if(!sel) return;

  const projects = state.items.filter(it => it.type==="project" && !it.deleted)
    .sort((a,b)=> (a.title||"").localeCompare(b.title||"", "it"));

  sel.innerHTML = `<option value="">— Nessun progetto —</option>` +
    projects.map(p => `<option value="${p.itemId}">${escapeHtml(p.title)}</option>`).join("");
}

function openEditor(item){
  state.editing = item ? {...item} : null;

  $("#modalTitle").textContent = item ? "Modifica" : "Nuovo";
  $("#deleteBtn").classList.toggle("hidden", !item);

  $("#itemForm").reset();

  const type = item?.type || "task";
  $("#fType").value = type;
  ensureStatusOptions(type);

  populateProjectSelect();

  $("#fStatus").value = item?.status || ((type==="task")?"todo":"open");
  $("#fTitle").value = item?.title || "";
  $("#fDesc").value = item?.description || "";
  $("#fStart").value = item?.startAt ? toLocalDT(item.startAt) : "";
  $("#fEnd").value = item?.endAt ? toLocalDT(item.endAt) : "";
  $("#fPriority").value = Number(item?.priority || 3);
  $("#fUrgency").value = String(!!item?.urgency);
  $("#fTags").value = item?.tags || "";
  $("#fProjectId").value = item?.projectId || "";
  $("#fItemId").value = item?.itemId || "";
  $("#fCreatedAt").value = item?.createdAt || "";

  applyTypeUI(type);
  modal.classList.remove("hidden");
}

function closeEditor(){
  modal.classList.add("hidden");
  state.editing = null;
}

$("#itemForm").addEventListener("submit", async (e)=>{
  e.preventDefault();

  const type = $("#fType").value;

  const item = {
    itemId: $("#fItemId").value || "",
    createdAt: $("#fCreatedAt").value || "",
    type,
    status: $("#fStatus").value,
    title: $("#fTitle").value.trim(),
    description: $("#fDesc").value.trim(),
    startAt: (type==="note" || type==="project") ? "" : fromLocalDT($("#fStart").value),
    endAt: (type==="note" || type==="project") ? "" : fromLocalDT($("#fEnd").value),
    allDay: false,
    priority: Number($("#fPriority").value || 3),
    urgency: $("#fUrgency").value === "true",
    tags: $("#fTags").value.trim(),
    projectId: $("#fProjectId").value || "",
  };

  try{
    const out = await api("upsertItem", { token: state.token, item });
    const saved = out.item;

    const idx = state.items.findIndex(x => x.itemId === saved.itemId);
    if(idx >= 0) state.items[idx] = saved;
    else state.items.push(saved);

    renderAll();
    toast("Salvato");
    closeEditor();
  }catch(err){
    toast(err.message);
  }
});

$("#deleteBtn").addEventListener("click", async ()=>{
  const itemId = $("#fItemId").value;
  if(!itemId) return;
  if(!confirm("Eliminare questo elemento?")) return;

  try{
    await api("deleteItem", { token: state.token, itemId });
    state.items = state.items.filter(x => x.itemId !== itemId);
    renderAll();
    toast("Eliminato");
    closeEditor();
  }catch(e){
    toast(e.message);
  }
});

/* ------------------ Start ------------------ */
boot();
