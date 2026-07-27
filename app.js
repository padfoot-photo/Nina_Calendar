// 圖例要顯示哪些隊伍（顏色定義在 styles.css）
const TEAM_NAMES = ["樂天女孩", "洋基女孩", "桃氣女孩", "其他"];

let events = [];        // 目前顯示月份的活動
let VENUES = {};        // 場館 → 地址對照表
let year, month;        // month 是 0-indexed
const monthCache = {};  // 已載入過的月份快取，避免重複下載

const WEEKDAYS = ["日","一","二","三","四","五","六"];
const pad = n => String(n).padStart(2,"0");
const keyOf = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;

// ── 依月份載入 events/年/月.json ──────────────
async function loadMonth(y, m){
  const key = `${y}-${pad(m+1)}`;
  if(monthCache[key]) return monthCache[key];
  try{
    const res = await fetch(`events/${y}/${pad(m+1)}.json?t=${Date.now()}`);
    if(!res.ok) throw new Error();       // 檔案不存在＝那個月沒活動
    monthCache[key] = await res.json();
  }catch{
    monthCache[key] = [];
  }
  return monthCache[key];
}

async function showMonth(y, m){
  year = y; month = m;
  events = await loadMonth(y, m);
  render();
}

// ── 畫出月曆 ─────────────────────────────────
function render(){
  document.getElementById("monthLabel").textContent = `${year} 年 ${month+1} 月`;
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const startDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month+1, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear()===year && today.getMonth()===month;

  for(let i=0;i<startDow;i++){
    const c=document.createElement("div");
    c.className="cell empty"; grid.appendChild(c);
  }
  for(let d=1;d<=days;d++){
    const c=document.createElement("div");
    c.className="cell"+(isThisMonth && today.getDate()===d ? " today":"");
    const num=document.createElement("div");
    num.className="num"; num.textContent=d; c.appendChild(num);

    events.filter(e=>e.date===keyOf(year,month,d))
          .sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"))
          .forEach(e=>{
      const b=document.createElement("button");
      b.className="chip";
      b.dataset.team=e.team;              // 顏色交給 CSS 的 [data-team] 決定
      b.textContent=e.title;              // 色塊顯示活動名稱
      b.title=`${e.title}`;    // 電腦版滑鼠停留顯示完整資訊
      b.onclick=()=>openTicket(e);
      c.appendChild(b);
    });
    grid.appendChild(c);
  }
}

// ── 詳情票根 ─────────────────────────────────
function openTicket(e){
  const dow=WEEKDAYS[new Date(e.date+"T00:00:00").getDay()];
  const addr = e.address || VENUES[e.venue] || "";
  const maps="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(addr||e.venue);
  const rows=[
    // ["連結", e.link],
    ["時間", e.time||"未定"],
    ["地點", e.venue],
    ["地址", addr],
    ["備註", e.note]
  ].filter(r=>r[1]);

  document.getElementById("ticket").innerHTML = `
    <div class="band" data-team="${e.team}">
      <div class="date">${e.date}（${dow}）</div>
      <div class="title">${e.title}</div>
    </div>
    <div class="tear"></div>
    <div class="body">
    <!-- Write information in rows. Skip in no info. -->
      ${rows.map(r=>`<div class="row"><div class="k">${r[0]}</div><div class="v">${r[1]}</div></div>`).join("")} 
      <a class="mapbtn" href="${maps}" target="_blank" rel="noreferrer"> 在 Google Maps 開啟</a>
      ${e.link ? `<a class="eventlink" href="${e.link}" target="_blank" rel="noreferrer"> 活動連結 </a>`: ""}
      <button class="closebtn" onclick="closeTicket()">關閉</button>
    </div>`;
  document.getElementById("overlay").classList.add("open");
}
function closeTicket(){ document.getElementById("overlay").classList.remove("open"); }
document.getElementById("overlay").addEventListener("click", ev=>{
  if(ev.target.id==="overlay") closeTicket();
});

// ── 圖例 ─────────────────────────────────────
function renderLegend(){
  document.getElementById("legend").innerHTML = TEAM_NAMES
    .map(n=>`<span><i class="dot" data-team="${n}"></i>${n}</span>`)
    .join("");
}

// ── 月份切換 ─────────────────────────────────
function nav(dir){
  let m=month+dir, y=year;
  if(m<0){m=11;y--;}
  if(m>11){m=0;y++;}
  showMonth(y, m);
}
document.getElementById("prev").onclick=()=>nav(-1);
document.getElementById("next").onclick=()=>nav(1);

// ── 啟動 ─────────────────────────────────────
renderLegend();
fetch("venues.json?t="+Date.now())
  .then(r=>r.ok ? r.json() : {})
  .then(v=>{ VENUES=v; })
  .catch(()=>{})
  .finally(()=>{
    // 網址帶 ?ym=YYYY-MM 就開該月份，否則顯示今天所在月份
    const m=/^(\d{4})-(\d{1,2})$/.exec(new URLSearchParams(location.search).get("ym")||"");
    if(m){
      showMonth(Number(m[1]), Number(m[2])-1);
    }else{
      const now=new Date();
      showMonth(now.getFullYear(), now.getMonth());
    }
  });