export const TIME_ZONE = 'America/Los_Angeles';
export const PROCESS_START = '2026-03-24';
export const TOTAL_DAYS = 730;

export function isoTodayPacific(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=t=>parts.find(p=>p.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d,12)); }
export function isoDate(d){ return d.toISOString().slice(0,10); }
export function addDays(s,n){ const d=parseISO(s); d.setUTCDate(d.getUTCDate()+n); return isoDate(d); }
export function diffDays(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
export function compareISO(a,b){ return a<b?-1:a>b?1:0; }
export function weekdayISO(s){ return parseISO(s).getUTCDay(); } // Sun=0
export function mondayFor(s){ const dow=weekdayISO(s); const delta=(dow+6)%7; return addDays(s,-delta); }
export function displayDate(s,opts={}){ return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:opts.short?'numeric':'short',day:'numeric',...opts}).format(parseISO(s)); }
export function monthYear(s){ return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',year:'numeric'}).format(parseISO(s)); }
export function monthStart(s){ return s.slice(0,7)+'-01'; }
export function nextMonthStart(s){ const d=parseISO(monthStart(s)); d.setUTCMonth(d.getUTCMonth()+1); return isoDate(d); }
export function monthEnd(s){ return addDays(nextMonthStart(s),-1); }

function nthWeekday(year,month,weekday,n){ // weekday 0 Sun
  let d=new Date(Date.UTC(year,month-1,1,12));
  let delta=(weekday-d.getUTCDay()+7)%7;
  d.setUTCDate(1+delta+7*(n-1)); return isoDate(d);
}
function lastWeekday(year,month,weekday){ let d=new Date(Date.UTC(year,month,0,12)); while(d.getUTCDay()!==weekday)d.setUTCDate(d.getUTCDate()-1); return isoDate(d); }
function observedFixed(year,month,day){ const actual=isoDate(new Date(Date.UTC(year,month-1,day,12))); const dow=weekdayISO(actual); return dow===6?addDays(actual,-1):dow===0?addDays(actual,1):actual; }
export function federalHolidays(year){
  const out=new Set();
  const fixed=[[1,1],[6,19],[7,4],[11,11],[12,25]];
  for(const [m,d] of fixed){ const a=isoDate(new Date(Date.UTC(year,m-1,d,12))); out.add(a); out.add(observedFixed(year,m,d)); }
  out.add(nthWeekday(year,1,1,3)); out.add(nthWeekday(year,2,1,3)); out.add(lastWeekday(year,5,1));
  out.add(nthWeekday(year,9,1,1)); out.add(nthWeekday(year,10,1,2)); out.add(nthWeekday(year,11,4,4));
  return out;
}
export function isAutoExcused(s){ const y=Number(s.slice(0,4)); return weekdayISO(s)===0 || federalHolidays(y).has(s); }
export function blankEntry(date){ return {date,confirmationNumber:'',isTest:false,checkInMethod:'none',dayStatus:isAutoExcused(date)?'excused':'normal',notes:''}; }
export function resolvedStatus(entry){ if(entry.dayStatus==='vacation'||entry.dayStatus==='excused')return entry.dayStatus; return isAutoExcused(entry.date)?'excused':'normal'; }
export function meaningfulEntry(e){ return !!(e.confirmationNumber||e.isTest||e.checkInMethod!=='none'||e.dayStatus!=='normal'||e.notes); }
export function sorted(entries){ return [...entries].sort((a,b)=>compareISO(a.date,b.date)); }
export function entriesBetween(entries,start,end){ return entries.filter(e=>e.date>=start&&e.date<=end); }

export function currentWeekAudit(entries,today){ return weeklyAudit(entries,mondayFor(today),today); }
export function weeklyAudit(entries,weekStart,today){
  const start=mondayFor(weekStart), end=addDays(start,4);
  if(start==='2026-03-23') return {start,end,status:'EXCLUDED',reason:'Week 1 — Excused'};
  const days=Array.from({length:5},(_,i)=>addDays(start,i));
  if(days.every(d=>{const e=entryFor(entries,d);const s=resolvedStatus(e);return s==='vacation'||s==='excused';})) return {start,end,status:'EXCLUDED',reason:'Full week Vacation/Excused'};
  const effectiveEnd=end<today?end:today;
  const checkins=entriesBetween(entries,start,effectiveEnd).filter(e=>e.checkInMethod==='phone'||e.checkInMethod==='email');
  if(checkins.length) return {start,end,status:'MET',reason:null};
  if(end<today) return {start,end,status:'MISSED',reason:null};
  const dow=weekdayISO(today); if(dow===0||dow===6) return {start,end,status:'MISSED',reason:null};
  const isoDow=dow===0?7:dow; return {start,end,status:isoDow<=3?'PENDING':'DUE',reason:null};
}
export function weeklyAudits(entries,today){ let out=[],cur=mondayFor(PROCESS_START),last=mondayFor(today); while(cur<=last){out.push(weeklyAudit(entries,cur,today));cur=addDays(cur,7);}return out; }
export function historicalWeeklyCompliance(entries,today){ const a=weeklyAudits(entries,today).filter(x=>x.status==='MET'||x.status==='MISSED'); return `${a.filter(x=>x.status==='MET').length}/${a.length}`; }
export function nextWeeklyDue(entries,today){ const a=currentWeekAudit(entries,today); const dow=weekdayISO(today); return (a.status==='MET'||a.status==='EXCLUDED'||dow===0||dow===6)?addDays(a.end,7):a.end; }

export function currentMonthCounts(entries,today){ const s=monthStart(today); const es=entriesBetween(entries,s,today); return {phone:es.filter(e=>e.checkInMethod==='phone').length,email:es.filter(e=>e.checkInMethod==='email').length}; }
export function monthlyAudits(entries,today){ let out=[],cur='2026-04-01', current=monthStart(today); while(cur<=current){ const end=monthEnd(cur), eff=end<today?end:today; const phone=entriesBetween(entries,cur,eff).filter(e=>e.checkInMethod==='phone').length; const status=phone>0?'MET':end<today?'MISSED':'PENDING'; out.push({month:cur,status,phoneCount:phone}); cur=nextMonthStart(cur);} return out; }
export function historicalPhoneCompliance(entries,today){ const a=monthlyAudits(entries,today).filter(x=>x.status==='MET'||x.status==='MISSED'); return `${a.filter(x=>x.status==='MET').length}/${a.length}`; }

export function testsThrough(entries,today){ return sorted(entries.filter(e=>e.isTest&&e.date<=today)); }
export function testMetrics(entries,today){
  const tests=testsThrough(entries,today), last=tests.at(-1)?.date||null;
  const avg=(arr)=>arr.length<2?null:diffDays(arr[0].date,arr.at(-1).date)/(arr.length-1);
  const cutoff=addDays(today,-44), last45=tests.filter(e=>e.date>=cutoff);
  let longest=null; if(tests.length>=2){ let max=0; for(let i=0;i<tests.length-1;i++){const a=tests[i].date,b=tests[i+1].date;const vac=entries.filter(e=>e.date>a&&e.date<b&&e.dayStatus==='vacation').length;max=Math.max(max,diffDays(a,b)-vac);} longest=max; }
  return {logged:tests.length,last,daysSince:last?diffDays(last,today):null,avg45:avg(last45),avgAll:avg(tests),longest};
}
export function processMetrics(today){ const elapsed=Math.max(0,diffDays(PROCESS_START,today)+1); return {elapsed,remaining:Math.max(0,TOTAL_DAYS-elapsed),progress:Math.min(1,Math.max(0,elapsed/TOTAL_DAYS))}; }
export function entryFor(entries,date){ return entries.find(e=>e.date===date) || blankEntry(date); }
export function upsert(entries,entry){ const out=entries.filter(e=>e.date!==entry.date); out.push(entry); return sorted(out); }
