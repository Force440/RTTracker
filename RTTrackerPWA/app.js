import * as C from './core.js';
const STORAGE='rt-tracker-pwa-v1';
let entries=[]; let selectedDate=C.isoTodayPacific(); let currentTab='entry'; let historyFilter='';
const view=document.getElementById('view'); const restoreInput=document.getElementById('restore-input');

function loadStored(){ try{return JSON.parse(localStorage.getItem(STORAGE)||'null');}catch{return null} }
function persist(){ localStorage.setItem(STORAGE,JSON.stringify(entries)); }
async function init(){
  const saved=loadStored();
  if(Array.isArray(saved)) entries=saved;
  else { entries=await fetch('./seed-data.json').then(r=>r.json()); persist(); }
  selectedDate=C.isoTodayPacific(); render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(navigator.storage?.persist) navigator.storage.persist().catch(()=>{});
}
function escapeHTML(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function statusBadge(s){return `<span class="status ${s}">${s}</span>`}
function fmt1(v){return v==null?'—':Number(v).toFixed(1)}
function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t)}t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function syncTabs(){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));}
function render(){syncTabs(); ({entry:renderEntry,dashboard:renderDashboard,history:renderHistory,audit:renderAudit,more:renderMore}[currentTab])();}

document.querySelector('.tabbar').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;currentTab=b.dataset.tab;render();window.scrollTo(0,0)});

function renderEntry(){
  const today=C.isoTodayPacific(); if(selectedDate>today)selectedDate=today; if(selectedDate<C.PROCESS_START)selectedDate=C.PROCESS_START;
  const e=C.entryFor(entries,selectedDate), auto=C.isAutoExcused(selectedDate), status=C.resolvedStatus(e);
  const wa=C.currentWeekAudit(entries,today), mc=C.currentMonthCounts(entries,today), tm=C.testMetrics(entries,today), pm=C.processMetrics(today);
  view.innerHTML=`
    <div class="card"><h2 class="card-title">Entry Date</h2>
      <div class="field-row"><div class="field-label">Date</div><input id="entry-date" class="field" type="date" min="${C.PROCESS_START}" max="${today}" value="${selectedDate}"></div>
      <div class="date-actions"><button class="btn small" id="yesterday">Yesterday</button><button class="btn small" id="today-btn" ${selectedDate===today?'disabled':''}>Go to Today</button></div>
      <div class="hint">All dates use Pacific Time. Choose any prior date to add a missed entry or correct an earlier one.</div>
    </div>
    <div class="card"><h2 class="card-title">${selectedDate===today?"Today's Entry":"Entry"}</h2>
      <div class="field-row"><label class="field-label" for="confirmation">Confirmation number</label><input id="confirmation" class="field" inputmode="numeric" value="${escapeHTML(e.confirmationNumber)}"></div>
      <div class="field-row"><label class="field-label" for="method">Check-in method</label><select id="method" class="field"><option value="none">None</option><option value="phone" ${e.checkInMethod==='phone'?'selected':''}>Phone</option><option value="email" ${e.checkInMethod==='email'?'selected':''}>Email</option></select></div>
      <div class="field-row"><label class="field-label" for="status">Day status</label><select id="status" class="field"><option value="normal" ${status==='normal'?'selected':''}>Normal</option><option value="vacation" ${status==='vacation'?'selected':''}>Vacation</option><option value="excused" ${status==='excused'?'selected':''}>Excused</option></select></div>
      <div class="field-row"><label class="field-label" for="is-test">Test completed</label><div class="switch"><input id="is-test" type="checkbox" ${e.isTest?'checked':''}></div></div>
      <div class="field-row"><label class="field-label" for="notes">Notes</label><textarea id="notes" class="field" rows="3">${escapeHTML(e.notes)}</textarea></div>
      ${auto?'<div class="auto-excused">✓ This date is automatically Excused because it is a Sunday or U.S. federal/observed holiday.</div>':''}
    </div>
    <div class="card"><h2 class="card-title">Current Requirements</h2>
      <div class="row"><div class="label">Weekly check-in</div>${statusBadge(wa.status)}</div>
      <div class="row"><div class="label">Phone this month</div>${statusBadge(mc.phone>0?'MET':'DUE')}</div>
      <div class="row"><div class="label">Days since last test</div><div class="value">${tm.daysSince??'—'}</div></div>
      <div class="row"><div class="label">Days remaining</div><div class="value">${pm.remaining}</div></div>
    </div>`;
  document.getElementById('entry-date').onchange=ev=>{selectedDate=ev.target.value;renderEntry()};
  document.getElementById('yesterday').onclick=()=>{const y=C.addDays(today,-1);selectedDate=y<C.PROCESS_START?C.PROCESS_START:y;renderEntry()};
  document.getElementById('today-btn').onclick=()=>{selectedDate=today;renderEntry()};
  ['confirmation','method','status','is-test','notes'].forEach(id=>document.getElementById(id).addEventListener(id==='confirmation'||id==='notes'?'input':'change',saveEntryFromForm));
}
function saveEntryFromForm(){
  const auto=C.isAutoExcused(selectedDate); let status=document.getElementById('status').value;
  if(auto && status==='normal') status='excused';
  const e={date:selectedDate,confirmationNumber:document.getElementById('confirmation').value.trim(),isTest:document.getElementById('is-test').checked,checkInMethod:document.getElementById('method').value,dayStatus:status,notes:document.getElementById('notes').value};
  entries=C.upsert(entries,e);persist();
}

function renderDashboard(){
  const today=C.isoTodayPacific(), wa=C.currentWeekAudit(entries,today), due=C.nextWeeklyDue(entries,today), mc=C.currentMonthCounts(entries,today), tm=C.testMetrics(entries,today), pm=C.processMetrics(today);
  view.innerHTML=`<div class="toolbar"><h2>Dashboard</h2><div class="muted">${C.displayDate(today)}</div></div>
  <div class="card"><h3 class="card-title">Compliance</h3>
    <div class="row"><div class="label">Weekly check-in</div>${statusBadge(wa.status)}</div>
    <div class="row"><div class="label">Next weekly check-in due</div><div class="value">${C.displayDate(due)}</div></div>
    <div class="row"><div class="label">Check-ins this week</div><div class="value">${C.entriesBetween(entries,wa.start,wa.end<today?wa.end:today).filter(e=>e.checkInMethod!=='none').length}</div></div>
    <div class="row"><div class="label">Phone this month</div>${statusBadge(mc.phone>0?'MET':'DUE')}</div>
    <div class="row"><div class="label">Phone check-ins this month</div><div class="value">${mc.phone}</div></div>
    <div class="row"><div class="label">Email check-ins this month</div><div class="value">${mc.email}</div></div>
    <div class="row"><div class="label">Next phone required</div><div class="value">${mc.phone>0?C.monthYear(C.nextMonthStart(today)):C.monthYear(today)}</div></div>
    <div class="row"><div class="label">Historical compliance</div><div class="value">Weekly ${C.historicalWeeklyCompliance(entries,today)} | Phone ${C.historicalPhoneCompliance(entries,today)}</div></div>
  </div>
  <div class="card"><h3 class="card-title">Test Tracking</h3><div class="metric-grid">
    ${metric('Tests logged',tm.logged)}${metric('Days since last test',tm.daysSince??'—')}${metric('Avg days between tests — last 45 days',fmt1(tm.avg45))}${metric('Avg days between tests — since day one',fmt1(tm.avgAll))}${metric('Last test',tm.last?C.displayDate(tm.last):'—')}${metric('Longest gap between tests (excl. vacation)',tm.longest??'—')}${metric('Days remaining',pm.remaining)}
    <div class="metric"><div class="metric-name">Process progress</div><div class="metric-value">${Math.round(pm.progress*100)}%</div><div class="progress"><div style="width:${pm.progress*100}%"></div></div></div>
  </div></div>`;
}
function metric(name,value){return `<div class="metric"><div class="metric-name">${name}</div><div class="metric-value">${value}</div></div>`}

function renderHistory(){
  const today=C.isoTodayPacific(); let arr=entries.filter(e=>e.date<=today&&C.meaningfulEntry(e)).sort((a,b)=>b.date.localeCompare(a.date)); if(historyFilter)arr=arr.filter(e=>JSON.stringify(e).toLowerCase().includes(historyFilter.toLowerCase())||C.displayDate(e.date).toLowerCase().includes(historyFilter.toLowerCase()));
  view.innerHTML=`<div class="toolbar"><h2>History</h2></div><input id="history-search" class="field search" placeholder="Search history" value="${escapeHTML(historyFilter)}"><div class="card">${arr.length?arr.map(historyItem).join(''):'<div class="empty">No entries found.</div>'}</div>`;
  document.getElementById('history-search').oninput=e=>{historyFilter=e.target.value;renderHistory()};
  document.querySelectorAll('.history-item').forEach(b=>b.onclick=()=>openEditor(b.dataset.date));
}
function historyItem(e){const rs=C.resolvedStatus(e);return `<button class="history-item" data-date="${e.date}"><div class="history-head"><span>${C.displayDate(e.date)}</span>${e.isTest?'<span class="chip">Test ✓</span>':''}</div><div class="chips">${e.confirmationNumber?`<span class="chip"># ${escapeHTML(e.confirmationNumber)}</span>`:''}${e.checkInMethod!=='none'?`<span class="chip">${e.checkInMethod==='phone'?'Phone':'Email'}</span>`:''}${rs!=='normal'?`<span class="chip">${cap(rs)}</span>`:''}</div>${e.notes?`<div class="notes">${escapeHTML(e.notes)}</div>`:''}</button>`}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function openEditor(date){selectedDate=date;currentTab='entry';render();window.scrollTo(0,0)}

function renderAudit(){const today=C.isoTodayPacific(), weekly=C.weeklyAudits(entries,today).reverse(), monthly=C.monthlyAudits(entries,today).reverse();view.innerHTML=`<div class="toolbar"><h2>Compliance Audit</h2></div><div class="card"><h3 class="card-title">Weekly</h3>${weekly.map(a=>`<div class="audit-row"><div><div class="audit-main">${C.displayDate(a.start,{short:true})} – ${C.displayDate(a.end,{short:true})}</div>${a.reason?`<div class="audit-reason">${a.reason}</div>`:''}</div>${statusBadge(a.status)}</div>`).join('')}</div><div class="card"><h3 class="card-title">Monthly Phone</h3>${monthly.map(a=>`<div class="audit-row"><div><div class="audit-main">${C.monthYear(a.month)}</div><div class="audit-reason">${a.phoneCount} phone check-in${a.phoneCount===1?'':'s'}</div></div>${statusBadge(a.status)}</div>`).join('')}</div>`}

function renderMore(){const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;view.innerHTML=`<div class="toolbar"><h2>More</h2></div>${!standalone?'<div class="install-banner"><strong>Install on iPhone:</strong> Open this site in Safari → tap Share → <strong>Add to Home Screen</strong> → turn on <strong>Open as Web App</strong> if shown → Add.</div>':''}<div class="card"><h3 class="card-title">Backup / Restore</h3><div class="two-buttons"><button class="btn primary" id="backup">Full Backup</button><button class="btn" id="restore">Restore Backup</button><button class="btn" id="csv">CSV Export</button><button class="btn" id="reset-seed">Reset to Seed</button></div><div class="file-note">Full Backup is the restorable backup. Save it to iCloud Drive periodically. You can also import the JSON backup created by the native RT Tracker app.</div></div><div class="card"><h3 class="card-title">About</h3><div class="row"><div class="label">Time zone</div><div class="value">Pacific</div></div><div class="row"><div class="label">Process start</div><div class="value">Mar 24, 2026</div></div><div class="row"><div class="label">Storage</div><div class="value">On this device</div></div></div>`;
  document.getElementById('backup').onclick=downloadBackup; document.getElementById('restore').onclick=()=>restoreInput.click(); document.getElementById('csv').onclick=downloadCSV; document.getElementById('reset-seed').onclick=resetSeed;
}
function download(name,data,type){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function downloadBackup(){const today=C.isoTodayPacific();download(`RT-Tracker-Backup-${today}.json`,JSON.stringify(entries,null,2),'application/json');}
function csvEscape(s){s=String(s??'');return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
function downloadCSV(){const rows=[['Date','Confirmation','Test','Check-in Method','Day Status','Notes'],...C.sorted(entries).map(e=>[e.date,e.confirmationNumber,e.isTest?'Test':'',cap(e.checkInMethod),cap(C.resolvedStatus(e)),e.notes])];download('RT-Tracker-Export.csv',rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv');}
async function resetSeed(){if(!confirm('Reset all data to the original imported history? This replaces current PWA data.'))return;entries=await fetch('./seed-data.json').then(r=>r.json());persist();toast('Reset complete');renderMore();}
restoreInput.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data)||!data.every(x=>x.date))throw new Error('Invalid backup');entries=C.sorted(data.map(x=>({date:x.date,confirmationNumber:x.confirmationNumber||'',isTest:!!x.isTest,checkInMethod:(x.checkInMethod||'none').toLowerCase(),dayStatus:(x.dayStatus||'normal').toLowerCase(),notes:x.notes||''})));persist();toast('Backup restored');render();}catch(err){alert('Could not restore this backup. '+err.message)}finally{restoreInput.value=''}};

init();
