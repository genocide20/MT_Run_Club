const teamSearch = document.querySelector('#team-search');
const teamSearchStatus = document.querySelector('#team-search-status');
const teamResults = document.querySelector('#team-results');
const teamPerson = document.querySelector('#team-person');
const teamForm = document.querySelector('#team-form');
const teamPhoto = document.querySelector('#team-photo');
const teamPhotoPreview = document.querySelector('#team-photo-preview');
const teamPhotoStatus = document.querySelector('#team-photo-status');
let teamPhotoUrl = null, teamPhotoJob = 0, kcalEditVersion = 0;
const teamKcal = document.querySelector('#team-kcal');
const teamKcalError = document.querySelector('#team-kcal-error');
function updateKcalValidity() {
  const overLimit = teamKcal.value !== '' && Number(teamKcal.value) > 1500;
  const message = overLimit ? 'กรุณากรอกไม่เกิน 1,500 kcal' : '';
  teamKcal.setCustomValidity(message); teamKcalError.textContent = message;
}
teamKcal.addEventListener('input', () => { kcalEditVersion++; updateKcalValidity(); });
function resetTeamPhoto() { teamPhotoJob++; if(teamPhotoUrl) URL.revokeObjectURL(teamPhotoUrl); teamPhotoUrl=null; teamPhoto.value=''; teamPhotoPreview.hidden=true; teamPhotoPreview.removeAttribute('src'); teamPhotoStatus.textContent=''; }
function extractKcal(text) {
  const normalized = text.replace(/[๐-๙]/g, digit => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(digit)));
  const number = '(?:\\d{1,3}(?:,\\d{3})+|\\d{1,5})(?:\\.\\d+)?';
  const unit = '(?:kcal\\b|kilocalories?\\b|calories?\\b|กิโลแคลอรี(?:่)?|แคลอรี(?:่)?)';
  const patterns = [new RegExp(`(${number})[\\s:]*${unit}`, 'gi'), new RegExp(`${unit}[\\s:]*(${number})`, 'gi')];
  const values = new Set();
  for (const pattern of patterns) for (const match of normalized.matchAll(pattern)) {
    const value = Number(match[1].replace(/,/g,''));
    if (Number.isInteger(value) && value >= 1 && value <= 20000) values.add(value);
  }
  return [...values];
}
teamPhoto.addEventListener('change', async () => {
  const job=++teamPhotoJob;
  if(teamPhotoUrl) URL.revokeObjectURL(teamPhotoUrl);
  teamPhotoUrl=null;teamPhotoPreview.hidden=true;teamPhotoPreview.removeAttribute('src');teamPhotoStatus.textContent='';
  const file=teamPhoto.files[0];if(!file)return;
  if(!file.type.startsWith('image/') || file.size>15*1024*1024){teamPhotoStatus.textContent='กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 15 MB';return;}
  teamPhotoUrl=URL.createObjectURL(file);teamPhotoPreview.src=teamPhotoUrl;teamPhotoPreview.hidden=false;
  const editVersion=kcalEditVersion, initialValue=teamKcal.value;
  teamPhotoStatus.textContent='กำลังอ่านค่า kcal จากภาพ อาจใช้เวลาสักครู่…';
  let worker;
  try {
    const library=await loadOcrLibrary();worker=await library.createWorker(['tha','eng']);
    const result=await worker.recognize(file);if(job!==teamPhotoJob)return;
    const values=extractKcal(result.data.text);
    if(values.length===1 && kcalEditVersion===editVersion && !initialValue && !teamKcal.value){teamKcal.value=values[0];updateKcalValidity();teamPhotoStatus.textContent=`อ่านได้ ${values[0].toLocaleString('th-TH')} kcal กรุณาตรวจสอบก่อนบันทึก`;}
    else if(values.length===1) teamPhotoStatus.textContent=`อ่านได้ ${values[0].toLocaleString('th-TH')} kcal กรุณาตรวจสอบค่าที่กรอก`;
    else if(values.length>1) teamPhotoStatus.textContent=`พบหลายค่า (${values.map(value=>value.toLocaleString('th-TH')).join(', ')} kcal) กรุณากรอกค่าที่ต้องการ`;
    else teamPhotoStatus.textContent='ไม่พบค่า kcal ที่ชัดเจนในภาพ กรุณากรอกด้วยตนเอง';
  } catch(error) {if(job===teamPhotoJob)teamPhotoStatus.textContent='อ่านภาพไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตหรือกรอก kcal ด้วยตนเอง';}
  finally {if(worker)await worker.terminate();}
});
const teamSaveStatus = document.querySelector('#team-save-status');
const teamEntry = document.querySelector('#team-entry');
const teamRanking = document.querySelector('#team-ranking');
const teamSubmitTab = document.querySelector('#team-submit-tab');
const teamRankingTab = document.querySelector('#team-ranking-tab');
const rankingStatus = document.querySelector('#ranking-status');
const rankingList = document.querySelector('#ranking-list');
const isTeamDemo = new URLSearchParams(location.search).get('preview') === 'team';
let teamChoice = null, teamTimer, teamRequest = 0;
const demoPeople = [{name:'สมชาย ตัวอย่าง',team:'ทีม A'},{name:'สมหญิง ตัวอย่าง',team:'ทีม B'},{name:'สมศรี ตัวอย่าง',team:'ทีม C'}];
const demoRanking = [{team:'ทีม A',total:18900},{team:'ทีม B',total:15400},{team:'ทีม C',total:10700}];
if (isTeamDemo) document.querySelector('#team-demo-note').hidden = false;
async function teamGet(action, q) {
  if (isTeamDemo) return action === 'team-search' ? {ok:true,teamApi:true,results:demoPeople.filter(p=>p.name.includes(q))} : {ok:true,teamApi:true,ranking:demoRanking};
  const url = new URL(window.SCRIPT_URL); url.searchParams.set('action',action); if(q) url.searchParams.set('q',q);
  const response = await fetch(url); const data = await response.json();
  if (!response.ok || !data.ok || !data.teamApi) throw new Error('backend');
  return data;
}
function showTeamPage(ranking) {
  teamEntry.hidden = ranking; teamRanking.hidden = !ranking;
  teamSubmitTab.classList.toggle('active',!ranking); teamRankingTab.classList.toggle('active',ranking);
  teamSubmitTab.toggleAttribute('aria-current',!ranking); teamRankingTab.toggleAttribute('aria-current',ranking);
  if (ranking) refreshRanking();
}
teamSubmitTab.addEventListener('click',()=>showTeamPage(false));
teamRankingTab.addEventListener('click',()=>showTeamPage(true));
window.addEventListener('team-mode',e=>{if(e.detail.team) showTeamPage(false);});
teamSearch.addEventListener('input',()=>{
  clearTimeout(teamTimer); const id=++teamRequest; const q=teamSearch.value.trim();
  teamChoice=null; teamPerson.hidden=true; teamForm.hidden=true; teamResults.replaceChildren(); teamSaveStatus.textContent=''; resetTeamPhoto();
  if (!q) {teamSearchStatus.textContent=''; return;}
  teamSearchStatus.textContent='กำลังค้นหา…';
  teamTimer=setTimeout(async()=>{try {
    const data=await teamGet('team-search',q); if(id!==teamRequest) return;
    teamSearchStatus.textContent=data.results.length ? `พบ ${data.results.length} รายชื่อ กรุณาเลือก` : 'ไม่พบรายชื่อที่ตรงกัน';
    data.results.forEach(person=>{const button=document.createElement('button');button.type='button';button.className='result';
      const name=document.createElement('strong');name.textContent=person.name;
      const label=document.createElement('span');label.textContent=person.team ? `ทีม: ${person.team}` : 'ยังไม่ได้ระบุทีม';
      button.append(name,label);button.addEventListener('click',()=>{teamChoice=person;teamResults.replaceChildren();teamSearchStatus.textContent='';
        document.querySelector('#team-person-name').textContent=person.name;document.querySelector('#team-person-team').textContent=person.team ? `ทีม: ${person.team}` : 'ยังไม่ได้ระบุทีม กรุณาติดต่อผู้ดูแล';
        teamPerson.hidden=false;teamForm.hidden=!person.team;teamForm.reset();updateKcalValidity();});teamResults.append(button);});
  }catch(e){if(id===teamRequest) teamSearchStatus.textContent='ยังเชื่อมต่อระบบทีมไม่ได้ กรุณาติดต่อผู้ดูแล';}},300);
});
teamForm.addEventListener('submit',async event=>{event.preventDefault();updateKcalValidity();if(!teamChoice||!teamChoice.team||!teamForm.reportValidity()||Number(teamKcal.value)>1500)return;
  const button=teamForm.querySelector('button');button.disabled=true;teamSearch.disabled=true;teamSaveStatus.textContent='กำลังบันทึก… กรุณาเปิดหน้าจอและหน้านี้ไว้จนกว่าจะบันทึกเสร็จ';let sent=false;
  try {if(isTeamDemo){teamSaveStatus.textContent='ตัวอย่างเท่านั้น ยังไม่ได้บันทึกข้อมูลจริง';return;}
    const capability=await teamGet('team-capability');if(!capability.teamActivity){teamSaveStatus.textContent='ยังไม่ได้อัปเดต Apps Script สำหรับบันทึกกิจกรรม กรุณาติดต่อผู้ดูแล';return;}
    const activity=teamForm.elements.activity.value.trim();if(!activity){teamSaveStatus.textContent='กรุณาระบุกิจกรรมที่ใช้พลังงาน';teamForm.elements.activity.focus();return;}
    const body=new URLSearchParams({action:'team-submit',name:teamChoice.name,kcal:teamForm.elements.kcal.value,activity});
    if(teamPhoto.files.length){if(!capability.teamPhotoUpload){teamSaveStatus.textContent='ระบบยังไม่รองรับการบันทึกรูป กรุณาติดต่อผู้ดูแล';return;}teamSaveStatus.textContent='กำลังบีบอัดรูป… กรุณาเปิดหน้าจอและหน้านี้ไว้จนกว่าจะบันทึกเสร็จ';body.set('photo',await compressPhoto(teamPhoto.files[0]));}
    teamSaveStatus.textContent='กำลังบันทึก… กรุณาเปิดหน้าจอและหน้านี้ไว้จนกว่าจะบันทึกเสร็จ';sent=true;const response=await fetch(window.SCRIPT_URL,{method:'POST',body});const data=await response.json();
    if(!response.ok||!data.ok||!data.teamApi){const errors={validate:'ข้อมูลหรือรูปภาพไม่ถูกต้อง',employee:'ไม่พบชื่อหรือทีม กรุณาตรวจสอบชีต Employee',sheet:'ตรวจสอบหัวคอลัมน์ในชีต MT_kcal',image:'ไฟล์รูปภาพไม่ถูกต้อง',drive:'บันทึกรูปใน Google Drive ไม่สำเร็จ ตรวจสอบสิทธิ์โฟลเดอร์',write:'บันทึกลงชีตไม่สำเร็จ กรุณาตรวจสอบข้อมูลก่อนลองอีกครั้ง'};teamSaveStatus.textContent='บันทึกไม่สำเร็จ: '+(errors[data.stage]||'กรุณาตรวจสอบข้อมูลก่อนลองอีกครั้ง');return;}
    if(teamPhoto.files.length&&!data.photoSaved){teamSaveStatus.textContent='ไม่พบการยืนยันรูป กรุณาตรวจสอบชีตและ Drive ก่อนลองอีกครั้ง';return;}
    if(!data.activitySaved){teamSaveStatus.textContent='ไม่พบการยืนยันกิจกรรม กรุณาตรวจสอบชีต MT_kcal ก่อนลองอีกครั้ง';return;}
    const savedKcal=Number(teamForm.elements.kcal.value);teamForm.reset();resetTeamPhoto();teamSaveStatus.textContent='บันทึก kcal เรียบร้อยแล้ว';showSuccess(`บันทึก ${savedKcal.toLocaleString('th-TH')} kcal พร้อมภาพเรียบร้อยแล้ว`);
  }catch(e){teamSaveStatus.textContent=sent?'ไม่สามารถยืนยันผลบันทึกได้ กรุณาตรวจสอบชีต MT_kcal และ Google Drive ก่อนลองอีกครั้ง':'เตรียมข้อมูลไม่สำเร็จ กรุณาตรวจสอบรูปภาพและการเชื่อมต่อ';}
  finally{button.disabled=false;teamSearch.disabled=false;}
});
async function refreshRanking(){rankingList.replaceChildren();rankingStatus.textContent='กำลังโหลดอันดับ…';
  try{const data=await teamGet('team-ranking');if(!Array.isArray(data.ranking))throw Error('ranking');
    rankingStatus.textContent=data.ranking.length?'':'ยังไม่มีข้อมูลทีม';
    let rank=0, previous=null;data.ranking.forEach((row,i)=>{if(row.total!==previous)rank=i+1;previous=row.total;
      const group=document.createElement('details');group.className='team-ranking-group';
      const card=document.createElement('summary');card.className='ranking-row team-ranking-summary';const order=document.createElement('span');order.className='ranking-position';order.textContent=rank;
      const info=document.createElement('div');info.className='ranking-info';const name=document.createElement('strong');name.textContent=row.team;
      const total=Number(row.total)||0;const amount=document.createElement('small');amount.textContent=`${total.toLocaleString('th-TH')} / 70,000 kcal`;
      const bar=document.createElement('div');bar.className='team-progress';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',`ความคืบหน้าของ ${row.team}`);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','70000');bar.setAttribute('aria-valuenow',String(Math.min(70000,Math.max(0,total))));bar.setAttribute('aria-valuetext',`${total.toLocaleString('th-TH')} จาก 70,000 kcal`);
      const fill=document.createElement('div');fill.style.width=`${Math.min(100,Math.max(0,total/70000*100))}%`;bar.append(fill);info.append(name,amount,bar);
      const value=document.createElement('span');value.className='ranking-value';value.textContent=`${total.toLocaleString('th-TH')} kcal`;
      const arrow=document.createElement('span');arrow.className='team-expand-icon';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
      const members=document.createElement('div');members.className='team-members';members.setAttribute('aria-live','polite');
      card.append(order,info,value,arrow);group.append(card,members);rankingList.append(group);
      group.addEventListener('toggle',()=>{if(group.open){for(const other of rankingList.children){if(other!==group&&other.tagName==='DETAILS')other.open=false;}loadTeamMembers(row.team,members,group);}});});
  }catch(e){rankingStatus.textContent='ยังโหลดอันดับทีมไม่ได้ กรุณาติดต่อผู้ดูแล';}}
async function readTeamSheet(sheetName) {
  const url=new URL('https://docs.google.com/spreadsheets/d/1pyi4CzPgF-pfInIK_BgbD4UfDolegvCst9RIPIGFXuY/gviz/tq');
  url.searchParams.set('tqx','out:json');url.searchParams.set('sheet',sheetName);
  const response=await fetch(url);if(!response.ok)throw new Error('sheet');
  const body=await response.text(), match=body.match(/setResponse\((\{[\s\S]*\})\);?\s*$/);
  if(!match)throw new Error('sheet format');const data=JSON.parse(match[1]);
  if(data.status!=='ok'||!data.table||!Array.isArray(data.table.rows))throw new Error('sheet data');
  return data.table.rows.map(row=>row.c||[]);
}
function rankTeamMembers(team,employees,records) {
  const totals=new Map();
  employees.forEach(row=>{const name=String(row[0]?.v||'').trim(),memberTeam=String(row[1]?.v||'').trim();if(name&&memberTeam===team&&!totals.has(name))totals.set(name,{total:0,datedTotal:0,days:new Set()});});
  records.forEach(row=>{const name=String(row[1]?.v||'').trim(),recordTeam=String(row[2]?.v||'').trim(),kcal=Number(row[3]?.v);
    if(recordTeam!==team||!totals.has(name)||!Number.isFinite(kcal)||kcal<=0)return;
    const member=totals.get(name);member.total+=kcal;
    const raw=String(row[0]?.v||''),match=raw.match(/^Date\((\d+),(\d+),(\d+)/),formatted=String(row[0]?.f||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const day=match?`${match[1]}-${Number(match[2])+1}-${Number(match[3])}`:formatted?`${formatted[3]}-${Number(formatted[2])}-${Number(formatted[1])}`:null;
    if(day){member.days.add(day);member.datedTotal+=kcal;}
  });
  return [...totals].map(([name,data])=>({name,total:data.total,average:data.days.size?data.datedTotal/data.days.size:null})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'th'));
}
async function loadTeamMembers(team,container,group) {
  const request=(group.memberRequest||0)+1;group.memberRequest=request;
  container.replaceChildren();const status=document.createElement('p');status.className='team-members-status';status.textContent='กำลังโหลดรายชื่อสมาชิก…';container.append(status);
  try {
    let members,records=[];
    if(isTeamDemo){members=demoPeople.filter(person=>person.team===team).map(person=>({name:person.name,total:team==='ทีม A'?18900:team==='ทีม B'?15400:10700,average:1200}));}
    else {const [employees,teamRecords]=await Promise.all([readTeamSheet('Employee'),readTeamSheet('MT_kcal')]);records=teamRecords;members=rankTeamMembers(team,employees,records);}
    if(!group.open||group.memberRequest!==request)return;
    container.replaceChildren();const heading=document.createElement('p');heading.className='team-members-heading';heading.textContent=`สมาชิก ${team} · ${members.length.toLocaleString('th-TH')} คน`;container.append(heading);
    const hint=document.createElement('p');hint.className='team-average-hint';hint.textContent='ค่าเฉลี่ยคิดจากวันที่ส่งข้อมูล · แตะชื่อเพื่อดูประวัติ';container.append(hint);
    if(!members.length){status.textContent='ไม่พบรายชื่อสมาชิกในทีม';container.append(status);return;}
    const list=document.createElement('ol');list.className='team-members-list';let rank=0,previous=null;
    members.forEach((member,i)=>{if(member.total!==previous)rank=i+1;previous=member.total;
      const item=document.createElement('li');
      const memberGroup=document.createElement('details');memberGroup.className='team-member-group';
      const memberSummary=document.createElement('summary');memberSummary.className='team-member-row team-member-summary';
      const position=document.createElement('span');position.className='team-member-position';position.textContent=rank;
      const details=document.createElement('div');details.className='team-member-details';
      const name=document.createElement('span');name.className='team-member-name';name.textContent=member.name;
      const average=document.createElement('span');average.className='team-member-average';average.textContent=member.average===null?'เฉลี่ย — kcal/วัน':`เฉลี่ย ${member.average.toLocaleString('th-TH',{maximumFractionDigits:1})} kcal/วัน`;details.append(name,average);
      const amount=document.createElement('strong');amount.className='team-member-value';amount.textContent=`${member.total.toLocaleString('th-TH')} kcal`;
      const arrow=document.createElement('span');arrow.className='team-member-expand';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
      const history=document.createElement('div');history.className='team-member-history';
      memberSummary.append(position,details,amount,arrow);memberGroup.append(memberSummary,history);item.append(memberGroup);list.append(item);
      memberGroup.addEventListener('toggle',()=>{if(memberGroup.open){for(const other of list.querySelectorAll('.team-member-group')){if(other!==memberGroup)other.open=false;}renderMemberHistory(member.name,records,history);}});});container.append(list);
  }catch(error){if(group.open&&group.memberRequest===request){status.textContent='โหลดรายชื่อสมาชิกไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ';container.replaceChildren(status);}}
}
function renderMemberHistory(name,records,container) {
  container.replaceChildren();
  const heading=document.createElement('p');heading.className='team-history-heading';heading.textContent='10 รายการล่าสุด';container.append(heading);
  const rows=records.slice().reverse().filter(row=>String(row[1]?.v||'').trim()===name.trim()).slice(0,10);
  if(!rows.length){const empty=document.createElement('p');empty.className='team-members-status';empty.textContent=isTeamDemo?'ไม่มีข้อมูลตัวอย่าง':'ยังไม่มีประวัติการส่ง kcal';container.append(empty);return;}
  rows.forEach(row=>{
    const item=document.createElement('div');item.className='team-history-row';
    const info=document.createElement('div');info.className='team-history-info';
    const amount=document.createElement('strong');const raw=Number(row[3]?.v);amount.textContent=`${Number.isFinite(raw)?raw.toLocaleString('th-TH'):String(row[3]?.f||'—')} kcal`;
    const date=document.createElement('span');date.textContent=String(row[0]?.f||'ไม่ระบุวันเวลา');
    const team=document.createElement('span');team.textContent=String(row[2]?.v||'');
    const activity=document.createElement('span');activity.className='team-history-activity';activity.textContent=`กิจกรรม: ${String(row[5]?.v||'').trim()||'ไม่ระบุ'}`;info.append(amount,date,team,activity);item.append(info);
    let photo;try{photo=new URL(String(row[4]?.v||''));}catch(_){photo=null;}
    if(photo&&photo.protocol==='https:'&&photo.hostname==='drive.google.com'){
      const link=document.createElement('a');link.className='history-photo';link.href=photo.href;link.target='_blank';link.rel='noopener noreferrer';link.dataset.photoDate=date.textContent;link.dataset.photoValue=amount.textContent;link.dataset.photoActivity=activity.textContent;link.textContent='ดูภาพ';item.append(link);
    }else{const noPhoto=document.createElement('span');noPhoto.className='history-no-photo';noPhoto.textContent='ไม่มีภาพ';item.append(noPhoto);}
    container.append(item);
  });
}
document.querySelector('#ranking-refresh').addEventListener('click',refreshRanking);
if(isTeamDemo && teamToggle.getAttribute('aria-pressed')!=='true') teamToggle.click();
