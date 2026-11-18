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
teamKcal.addEventListener('input', () => { kcalEditVersion++; });
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
    if(values.length===1 && kcalEditVersion===editVersion && !initialValue && !teamKcal.value){teamKcal.value=values[0];teamPhotoStatus.textContent=`อ่านได้ ${values[0].toLocaleString('th-TH')} kcal กรุณาตรวจสอบก่อนบันทึก`;}
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
        teamPerson.hidden=false;teamForm.hidden=!person.team;teamForm.reset();});teamResults.append(button);});
  }catch(e){if(id===teamRequest) teamSearchStatus.textContent='ยังเชื่อมต่อระบบทีมไม่ได้ กรุณาติดต่อผู้ดูแล';}},300);
});
teamForm.addEventListener('submit',async event=>{event.preventDefault();if(!teamChoice||!teamChoice.team||!teamForm.reportValidity())return;
  const button=teamForm.querySelector('button');button.disabled=true;teamSearch.disabled=true;teamSaveStatus.textContent='กำลังบันทึก…';let sent=false;
  try {if(isTeamDemo){teamSaveStatus.textContent='ตัวอย่างเท่านั้น ยังไม่ได้บันทึกข้อมูลจริง';return;}
    const capability=await teamGet('team-capability');const body=new URLSearchParams({action:'team-submit',name:teamChoice.name,kcal:teamForm.elements.kcal.value});
    if(teamPhoto.files.length){if(!capability.teamPhotoUpload){teamSaveStatus.textContent='ระบบยังไม่รองรับการบันทึกรูป กรุณาติดต่อผู้ดูแล';return;}teamSaveStatus.textContent='กำลังบีบอัดรูป…';body.set('photo',await compressPhoto(teamPhoto.files[0]));}
    teamSaveStatus.textContent='กำลังบันทึก…';sent=true;const response=await fetch(window.SCRIPT_URL,{method:'POST',body});const data=await response.json();
    if(!response.ok||!data.ok||!data.teamApi){const errors={validate:'ข้อมูลหรือรูปภาพไม่ถูกต้อง',employee:'ไม่พบชื่อหรือทีม กรุณาตรวจสอบชีต Employee',sheet:'ตรวจสอบหัวคอลัมน์ในชีต MT_kcal',image:'ไฟล์รูปภาพไม่ถูกต้อง',drive:'บันทึกรูปใน Google Drive ไม่สำเร็จ ตรวจสอบสิทธิ์โฟลเดอร์',write:'บันทึกลงชีตไม่สำเร็จ กรุณาตรวจสอบข้อมูลก่อนลองอีกครั้ง'};teamSaveStatus.textContent='บันทึกไม่สำเร็จ: '+(errors[data.stage]||'กรุณาตรวจสอบข้อมูลก่อนลองอีกครั้ง');return;}
    if(teamPhoto.files.length&&!data.photoSaved){teamSaveStatus.textContent='ไม่พบการยืนยันรูป กรุณาตรวจสอบชีตและ Drive ก่อนลองอีกครั้ง';return;}
    teamForm.reset();resetTeamPhoto();teamSaveStatus.textContent='บันทึก kcal เรียบร้อยแล้ว';
  }catch(e){teamSaveStatus.textContent=sent?'ไม่สามารถยืนยันผลบันทึกได้ กรุณาตรวจสอบชีต MT_kcal และ Google Drive ก่อนลองอีกครั้ง':'เตรียมข้อมูลไม่สำเร็จ กรุณาตรวจสอบรูปภาพและการเชื่อมต่อ';}
  finally{button.disabled=false;teamSearch.disabled=false;}
});
async function refreshRanking(){rankingList.replaceChildren();rankingStatus.textContent='กำลังโหลดอันดับ…';
  try{const data=await teamGet('team-ranking');if(!Array.isArray(data.ranking))throw Error('ranking');
    rankingStatus.textContent=data.ranking.length?'':'ยังไม่มีข้อมูลทีม';
    let rank=0, previous=null;data.ranking.forEach((row,i)=>{if(row.total!==previous)rank=i+1;previous=row.total;
      const card=document.createElement('div');card.className='ranking-row';const order=document.createElement('span');order.className='ranking-position';order.textContent=rank;
      const info=document.createElement('div');info.className='ranking-info';const name=document.createElement('strong');name.textContent=row.team;
      const total=Number(row.total)||0;const amount=document.createElement('small');amount.textContent=`${total.toLocaleString('th-TH')} / 70,000 kcal`;
      const bar=document.createElement('div');bar.className='team-progress';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',`ความคืบหน้าของ ${row.team}`);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','70000');bar.setAttribute('aria-valuenow',String(Math.min(70000,Math.max(0,total))));bar.setAttribute('aria-valuetext',`${total.toLocaleString('th-TH')} จาก 70,000 kcal`);
      const fill=document.createElement('div');fill.style.width=`${Math.min(100,Math.max(0,total/70000*100))}%`;bar.append(fill);info.append(name,amount,bar);
      const value=document.createElement('span');value.className='ranking-value';value.textContent=`${total.toLocaleString('th-TH')} kcal`;card.append(order,info,value);rankingList.append(card);});
  }catch(e){rankingStatus.textContent='ยังโหลดอันดับทีมไม่ได้ กรุณาติดต่อผู้ดูแล';}}
document.querySelector('#ranking-refresh').addEventListener('click',refreshRanking);
if(isTeamDemo && teamToggle.getAttribute('aria-pressed')!=='true') teamToggle.click();
