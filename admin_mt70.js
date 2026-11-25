const loginForm=document.querySelector('#admin-login-form'),loginPanel=document.querySelector('#admin-login'),adminPanel=document.querySelector('#admin-panel');
const loginStatus=document.querySelector('#admin-login-status'),adminStatus=document.querySelector('#admin-status'),adminList=document.querySelector('#admin-list');
let adminToken='';
async function adminRequest(action,data={}) {
  const response=await fetch(window.SCRIPT_URL,{method:'POST',body:new URLSearchParams({action,...data})});
  const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'เชื่อมต่อระบบไม่ได้');return result;
}
loginForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=loginForm.querySelector('button');button.disabled=true;loginStatus.textContent='กำลังเข้าสู่ระบบ…';
  try {const data=await adminRequest('admin-login',{username:document.querySelector('#admin-user').value.trim(),password:document.querySelector('#admin-password').value});adminToken=data.token;loginForm.reset();loginStatus.textContent='';loginPanel.hidden=true;adminPanel.hidden=false;await refreshAdmin();}
  catch(error){loginStatus.textContent=error.message||'เข้าสู่ระบบไม่ได้';}finally{button.disabled=false;}
});
document.querySelector('#admin-logout').addEventListener('click',async()=>{const token=adminToken;adminToken='';adminPanel.hidden=true;loginPanel.hidden=false;adminList.replaceChildren();try{await adminRequest('admin-logout',{token});}catch(_){} });
document.querySelector('#admin-refresh').addEventListener('click',refreshAdmin);
async function refreshAdmin(){
  adminStatus.textContent='กำลังโหลดรายการ…';adminList.replaceChildren();
  try {const data=await adminRequest('admin-list',{token:adminToken});if(!Array.isArray(data.records))throw Error('ข้อมูลไม่ถูกต้อง');
    const pending=data.records.filter(r=>r.status==='รออนุมัติ').length;adminStatus.textContent=data.records.length?`รออนุมัติ ${pending.toLocaleString('th-TH')} รายการ · ทั้งหมด ${data.records.length.toLocaleString('th-TH')} รายการ`:'ยังไม่มีรายการที่ต้องตรวจสอบ';
    data.records.forEach(renderAdminRecord);
  } catch(error){adminStatus.textContent=error.message||'โหลดรายการไม่ได้';}
}
function renderAdminRecord(record){
  const card=document.createElement('article');card.className='admin-record';
  const title=document.createElement('h3');title.textContent=`${record.name} · ${Number(record.kcal).toLocaleString('th-TH')} kcal`;card.append(title);
  const detail=document.createElement('p');detail.textContent=`${record.team} · ${record.date} · กิจกรรม: ${record.activity||'ไม่ระบุ'}`;card.append(detail);
  const status=document.createElement('p');status.className='admin-record-status';status.dataset.status=record.status||'';status.textContent=`สถานะ: ${record.status||'ไม่ระบุ'}`;card.append(status);
  try {const url=new URL(record.photo);if(url.protocol==='https:'&&url.hostname==='drive.google.com'){const photo=document.createElement('a');photo.className='history-photo';photo.href=url.href;photo.target='_blank';photo.rel='noopener noreferrer';photo.textContent='ดูภาพ';photo.dataset.photoDate=record.date;photo.dataset.photoValue=`${Number(record.kcal).toLocaleString('th-TH')} kcal`;photo.dataset.photoActivity=`กิจกรรม: ${record.activity||'ไม่ระบุ'}`;card.append(photo);}}catch(_){}
  const displayComment=document.createElement('p');displayComment.textContent=`ความคิดเห็นผู้ดูแล: ${record.comment||'ไม่มี'}`;card.append(displayComment);
  const editButton=document.createElement('button');editButton.type='button';editButton.className='secondary-button admin-edit';if(record.status==='รออนุมัติ'){editButton.textContent='พิจารณารายการ';}else{const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.className='admin-edit-icon';icon.textContent='✎';editButton.append(icon,document.createTextNode('แก้ไขสถานะและความคิดเห็น'));}card.append(editButton);
  const editor=document.createElement('div');editor.className='admin-review-editor';editor.hidden=true;
  const statusLabel=document.createElement('label');statusLabel.textContent='สถานะ';const select=document.createElement('select');select.className='admin-status-select';
  for(const value of ['รออนุมัติ','อนุมัติ','ยกเลิก']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}select.value=record.status;statusLabel.append(select);editor.append(statusLabel);
  const label=document.createElement('label');label.textContent='ความคิดเห็นผู้ดูแล';const input=document.createElement('textarea');input.maxLength=500;input.rows=2;input.placeholder='เพิ่มความคิดเห็น (ไม่บังคับ)';input.value=record.comment||'';label.append(input);editor.append(label);
  const actions=document.createElement('div');actions.className='admin-actions';const save=document.createElement('button');save.type='button';save.textContent='บันทึกการแก้ไข';const cancel=document.createElement('button');cancel.type='button';cancel.className='admin-reject';cancel.textContent='ปิด';actions.append(save,cancel);editor.append(actions);card.append(editor);
  editButton.addEventListener('click',()=>{editor.hidden=false;editButton.hidden=true;});
  cancel.addEventListener('click',()=>{editor.hidden=true;editButton.hidden=false;select.value=record.status;input.value=record.comment||'';status.textContent=`สถานะ: ${record.status||'ไม่ระบุ'}`;});
  save.addEventListener('click',async()=>{save.disabled=true;cancel.disabled=true;status.textContent='กำลังบันทึกผล…';try{await adminRequest('admin-review',{token:adminToken,id:record.id,decision:select.value,comment:input.value.trim(),expectedStatus:record.status,expectedComment:record.comment||''});await refreshAdmin();}catch(error){status.textContent=error.message||'บันทึกไม่สำเร็จ';save.disabled=false;cancel.disabled=false;}});
  adminList.append(card);
}
