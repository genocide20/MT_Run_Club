const search = document.querySelector('#search');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const selected = document.querySelector('#selected');
const form = document.querySelector('#distance-form');
const saveStatus = document.querySelector('#save-status');
const total = document.querySelector('#total');
let timer, requestId = 0, chosenPerson = null;
function showTotal(value) { total.textContent = Number.isFinite(value) ? `ระยะสะสม ${value.toLocaleString('th-TH', {maximumFractionDigits: 2})} กม.` : ''; }
search.addEventListener('input', () => {
  clearTimeout(timer);
  const id = ++requestId, query = search.value.trim();
  results.replaceChildren(); selected.hidden = true; form.hidden = true; chosenPerson = null; saveStatus.textContent = ''; resetPhoto();
  if (!query) { status.textContent = ''; return; }
  if (!window.SCRIPT_URL) { status.textContent = 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheets กรุณาติดต่อผู้ดูแล'; return; }
  status.textContent = 'กำลังค้นหา…';
  timer = setTimeout(async () => {
    try {
      const url = new URL(window.SCRIPT_URL); url.searchParams.set('q', query);
      const response = await fetch(url); const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.results)) throw new Error('Search failed');
      if (id !== requestId) return;
      status.textContent = data.results.length ? `พบ ${data.results.length} รายชื่อ กรุณาเลือก` : 'ไม่พบรายชื่อที่ตรงกัน';
      data.results.forEach(person => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'result';
        const name = document.createElement('strong'); name.textContent = person.name;
        button.append(name);
        button.addEventListener('click', () => {
          chosenPerson = person;
          document.querySelector('#selected-name').textContent = person.name;
          showTotal(person.total); selected.hidden = false; form.hidden = false; form.reset(); results.replaceChildren(); status.textContent = '';
        });
        results.append(button);
      });
    } catch (error) { if (id === requestId) status.textContent = 'ค้นหาไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'; }
  }, 300);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!chosenPerson || !form.reportValidity()) return;
  const button = form.querySelector('button'), distance = Number(form.elements.distance.value);
  button.disabled = true; search.disabled = true; saveStatus.classList.add('is-saving'); saveStatus.textContent = 'กำลังบันทึก… กรุณาเปิดหน้าจอและหน้านี้ไว้จนกว่าจะบันทึกเสร็จ';
  let phase = 'prepare';
  try {
    const body = new URLSearchParams({name: chosenPerson.name, distance: String(distance)});
    if (screenshot.files.length) {
      const checkUrl = new URL(window.SCRIPT_URL); checkUrl.searchParams.set('capability', 'photo-upload');
      const capability = await (await fetch(checkUrl)).json();
      if (!capability.photoUpload) { saveStatus.textContent = 'ยังไม่ได้อัปเดต Google Apps Script สำหรับบันทึกรูป กรุณาติดต่อผู้ดูแล'; return; }
      saveStatus.textContent = 'กำลังบีบอัดรูปและบันทึก… กรุณาเปิดหน้าจอและหน้านี้ไว้จนกว่าจะบันทึกเสร็จ';
      body.set('photo', await compressPhoto(screenshot.files[0]));
    }
    phase = 'sent';
    const response = await fetch(window.SCRIPT_URL, {method: 'POST', body});
    const data = await response.json();
    if (!response.ok || !data.ok) {
      const messages = {validate: 'ข้อมูลหรือรูปภาพไม่ถูกต้อง', employee: 'ไม่พบชื่อในชีต Employee', sheet: 'ตรวจสอบชีต MT_70 และหัวข้อคอลัมน์ D', image: 'ไฟล์รูปไม่ถูกต้อง', drive: 'บันทึกรูปใน Google Drive ไม่สำเร็จ ตรวจสอบสิทธิ์โฟลเดอร์และพื้นที่จัดเก็บ', write: 'บันทึกข้อมูลในชีตไม่สำเร็จ', total: 'บันทึกข้อมูลแล้ว แต่คำนวณระยะสะสมไม่สำเร็จ โปรดตรวจสอบชีตก่อนลองอีกครั้ง'};
      const explanation = messages[data.stage] || 'Apps Script ไม่สามารถบันทึกข้อมูลได้ (โปรดอัปเดต Apps Script ให้เป็นเวอร์ชันล่าสุดเพื่อดูสาเหตุ)';
      saveStatus.textContent = 'บันทึกไม่สำเร็จ: ' + explanation + (data.stage ? ' [' + data.stage + ']' : '');
      return;
    }
    if (screenshot.files.length && !data.photoSaved) { saveStatus.textContent = 'ไม่พบการยืนยันว่าบันทึกรูปสำเร็จ กรุณาตรวจสอบชีตและ Drive ก่อนลองอีกครั้ง'; return; }
    form.reset(); resetPhoto(); showTotal(data.total); saveStatus.textContent = 'บันทึกระยะทางเรียบร้อยแล้ว'; showSuccess(`บันทึกระยะทาง ${distance.toLocaleString('th-TH', {maximumFractionDigits: 2})} กม. พร้อมภาพเรียบร้อยแล้ว`);
  } catch (error) {
    if (phase === 'prepare') {
      const details = {'Invalid image': 'ไฟล์รูปไม่ถูกต้องหรือมีขนาดเกิน 15 MB', 'Image too large': 'รูปหลังบีบอัดยังมีขนาดใหญ่เกินไป', 'Canvas unavailable': 'อุปกรณ์ไม่รองรับการประมวลผลรูป'};
      saveStatus.textContent = 'เตรียมข้อมูลไม่สำเร็จ: ' + (details[error.message] || 'ตรวจสอบรูปภาพและการเชื่อมต่ออินเทอร์เน็ต');
    } else {
      saveStatus.textContent = 'ไม่สามารถรับผลจากระบบบันทึกได้ (การเชื่อมต่อขัดข้องหรือผลตอบกลับผิดรูปแบบ) กรุณาตรวจสอบข้อมูลในชีตและ Drive ก่อนลองอีกครั้ง เพื่อป้องกันข้อมูลซ้ำ';
    }
  }
  finally { saveStatus.classList.remove('is-saving'); button.disabled = false; search.disabled = false; }
});

// อ่านข้อความจากภาพบนอุปกรณ์ แล้วให้ผู้ใช้ตรวจสอบตัวเลขก่อนบันทึก
const screenshot = document.querySelector('#screenshot');
const preview = document.querySelector('#photo-preview');
const ocrStatus = document.querySelector('#ocr-status');
let imageUrl = null;
let imageJob = 0;
let ocrLibrary;
async function compressPhoto(file) {
  if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) throw new Error('Invalid image');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.8);
    if (!data.startsWith('data:image/jpeg;base64,') || data.length > 2800000) throw new Error('Image too large');
    return data.slice(data.indexOf(',') + 1);
  } finally { URL.revokeObjectURL(url); }
}
function resetPhoto() {
  imageJob++;
  screenshot.value = '';
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null; preview.hidden = true; preview.removeAttribute('src'); ocrStatus.textContent = '';
}
function loadOcrLibrary() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!ocrLibrary) ocrLibrary = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error('OCR unavailable'));
    document.head.append(script);
  }).catch(error => { ocrLibrary = null; throw error; });
  return ocrLibrary;
}
async function recognizeImageWithTimeout(file) {
  let worker = null, timedOut = false, timer;
  const work = (async () => {
    const library = await loadOcrLibrary();
    if (timedOut) return null;
    worker = await library.createWorker(['tha', 'eng']);
    if (timedOut) { const lateWorker = worker; worker = null; await lateWorker.terminate(); return null; }
    return worker.recognize(file);
  })();
  try {
    return await Promise.race([work, new Promise((_, reject) => {
      timer = setTimeout(() => { timedOut = true; reject(new Error('OCR_TIMEOUT')); }, 6000);
    })]);
  } finally {
    clearTimeout(timer);
    if (worker) { const activeWorker = worker; worker = null; Promise.resolve(activeWorker.terminate()).catch(() => {}); }
  }
}
function extractDistance(text) {
  // ระบุหน่วยกิโลเมตรภาษาไทยหรืออังกฤษใกล้ตัวเลข
  const normalized = text.replace(/\r/g, '').replace(/,/g, '.');
  const patterns = [/(\d{1,4}(?:\.\d{1,2})?)[ \t]*(?:km\b|kilometers?\b|kilometres?\b|ก\s*\.?\s*ม\s*\.?|กิโลเมตร)/gi, /(?:km\b|kilometers?\b|kilometres?\b|ก\s*\.?\s*ม\s*\.?|กิโลเมตร)[ \t]*[:\-]?[ \t]*(\d{1,4}(?:\.\d{1,2})?)/gi];
  const values = [];
  patterns.forEach((pattern, index) => {
    if (index === 1 && values.length) return;
    for (const match of normalized.matchAll(pattern)) {
      const value = Number(match[1]);
      if (value > 0 && value <= 1000 && !values.includes(value)) values.push(value);
    }
  });
  return values;
}
screenshot.addEventListener('change', async () => {
  const job = ++imageJob;
  const file = screenshot.files[0];
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  preview.hidden = true; preview.removeAttribute('src'); ocrStatus.textContent = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { ocrStatus.textContent = 'กรุณาเลือกไฟล์รูปภาพ'; return; }
  if (file.size > 15 * 1024 * 1024) { ocrStatus.textContent = 'รูปภาพมีขนาดเกิน 15 MB กรุณาเลือกรูปที่เล็กกว่า'; return; }
  imageUrl = URL.createObjectURL(file); preview.src = imageUrl; preview.hidden = false;
  ocrStatus.textContent = 'กำลังอ่านระยะทางจากภาพ อาจใช้เวลาสักครู่…';
  const originalValue = form.elements.distance.value;
  try {
    const result = await recognizeImageWithTimeout(file);
    if (job !== imageJob) return;
    const values = extractDistance(result.data.text);
    if (values.length === 1 && form.elements.distance.value === originalValue) {
      form.elements.distance.value = values[0];
      ocrStatus.textContent = `อ่านได้ ${values[0]} กม. กรุณาตรวจสอบก่อนบันทึก`;
    } else if (values.length > 1) {
      ocrStatus.textContent = `พบหลายระยะ (${values.join(', ')} กม.) กรุณากรอกระยะที่ต้องการด้วยตนเอง`;
    } else if (values.length === 1) {
      ocrStatus.textContent = `อ่านได้ ${values[0]} กม. แต่ไม่ได้เปลี่ยนค่าที่คุณกำลังกรอก กรุณาตรวจสอบ`;
    } else {
      ocrStatus.textContent = 'ไม่พบระยะทางหน่วย กม. หรือ km ในภาพ กรุณากรอกระยะทางด้วยตนเอง';
    }
  } catch (error) {
    if (job === imageJob) ocrStatus.textContent = error.message === 'OCR_TIMEOUT' ? 'อ่านภาพไม่ทันภายใน 6 วินาที กรุณากรอกระยะทางด้วยตนเอง' : 'อ่านภาพไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตหรือกรอกระยะทางด้วยตนเอง';
  }
});







const submitTab = document.querySelector('#tab-submit');
const resultsTab = document.querySelector('#tab-results');
const individualRankingTab = document.querySelector('#tab-ranking');
const submitPanel = document.querySelector('#submit-panel');
const resultsPanel = document.querySelector('#results-panel');
const individualRankingPanel = document.querySelector('#individual-ranking-panel');
function setPage(page) {
  [[submitTab,submitPanel,'submit'],[resultsTab,resultsPanel,'results'],[individualRankingTab,individualRankingPanel,'ranking']].forEach(([tab,panel,id]) => {
    const active=page===id;panel.hidden=!active;tab.classList.toggle('active',active);
    if(active)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');
  });
  if(page==='ranking') refreshIndividualRanking();
}
submitTab.addEventListener('click', () => setPage('submit'));
resultsTab.addEventListener('click', () => setPage('results'));
individualRankingTab.addEventListener('click', () => setPage('ranking'));
const distanceText = value => Number(value || 0).toLocaleString('th-TH',{maximumFractionDigits:2});
async function refreshIndividualRanking() {
  const list=document.querySelector('#individual-ranking-list'), status=document.querySelector('#individual-ranking-status');
  list.replaceChildren();status.textContent='กำลังโหลดอันดับ…';
  try {
    const url=new URL(window.SCRIPT_URL);url.searchParams.set('action','individual-ranking');
    const response=await fetch(url);const data=await response.json();
    if(!response.ok||!data.ok||!data.individualRanking||!Array.isArray(data.ranking))throw new Error('ranking');
    const participants=data.ranking.filter(row=>Number.isFinite(Number(row.total))&&Number(row.total)>0);
    status.textContent=participants.length?'':'ยังไม่มีผู้ส่งระยะทาง';let rank=0,previous=null;
    participants.forEach((row,i)=>{
      const total=Number(row.total)||0;if(total!==previous)rank=i+1;previous=total;
      const group=document.createElement('details');group.className='team-ranking-group';
      const card=document.createElement('summary');card.className='ranking-row team-ranking-summary';
      const order=document.createElement('span');order.className='ranking-position';order.textContent=rank;
      const info=document.createElement('div');info.className='ranking-info';
      const name=document.createElement('strong');name.textContent=row.name;
      const amount=document.createElement('small');amount.textContent=`${distanceText(total)} / 70 กม.`;
      const bar=document.createElement('div');bar.className='team-progress';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',`ความคืบหน้าของ ${row.name}`);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','70');bar.setAttribute('aria-valuenow',String(Math.min(70,Math.max(0,total))));bar.setAttribute('aria-valuetext',`${distanceText(total)} จาก 70 กิโลเมตร`);
      const fill=document.createElement('div');fill.style.width=`${Math.min(100,Math.max(0,total/70*100))}%`;bar.append(fill);info.append(name,amount,bar);
      const value=document.createElement('span');value.className='ranking-value';value.textContent=`${distanceText(total)} กม.`;
      const arrow=document.createElement('span');arrow.className='team-expand-icon';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
      const history=document.createElement('div');history.className='team-members individual-ranking-history';history.setAttribute('aria-live','polite');
      card.append(order,info,value,arrow);group.append(card,history);list.append(group);
      group.addEventListener('toggle',()=>{if(group.open){for(const other of list.children){if(other!==group&&other.tagName==='DETAILS')other.open=false;}loadRankingHistory(row.name,history,group);}});
    });
  } catch(error) {status.textContent='ยังโหลดอันดับไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ';}
}
document.querySelector('#individual-ranking-refresh').addEventListener('click',refreshIndividualRanking);

const progressSearch = document.querySelector('#progress-search');
const progressStatus = document.querySelector('#progress-status');
const progressResults = document.querySelector('#progress-results');
const progressSelected = document.querySelector('#progress-selected');
const historySection = document.createElement('section');
historySection.className = 'history-section';
historySection.hidden = true;
historySection.innerHTML = '<h3>ประวัติการส่งระยะ</h3><p class="history-hint">10 ครั้งล่าสุด เรียงจากรายการใหม่ที่สุด</p><p class="history-status" role="status"></p><div class="history-list"></div>';
progressSelected.after(historySection);
const historyStatus = historySection.querySelector('.history-status');
const historyList = historySection.querySelector('.history-list');
const progressRank = document.createElement('p');
progressRank.className = 'progress-rank';
progressRank.setAttribute('role', 'status');
document.querySelector('#progress-name').after(progressRank);
let progressTimer, progressRequest = 0;
progressSearch.addEventListener('input', () => {
  clearTimeout(progressTimer);
  const id = ++progressRequest;
  const query = progressSearch.value.trim();
  progressResults.replaceChildren(); progressSelected.hidden = true; historySection.hidden = true; historyList.replaceChildren();
  if (!query) { progressStatus.textContent = ''; return; }
  if (!window.SCRIPT_URL) { progressStatus.textContent = 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheets'; return; }
  progressStatus.textContent = 'กำลังค้นหา…';
  progressTimer = setTimeout(async () => {
    try {
      const url = new URL(window.SCRIPT_URL); url.searchParams.set('q', query);
      const response = await fetch(url); const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.results)) throw new Error('Search failed');
      if (id !== progressRequest) return;
      progressStatus.textContent = data.results.length ? `พบ ${data.results.length} รายชื่อ กรุณาเลือก` : 'ไม่พบรายชื่อที่ตรงกัน';
      data.results.forEach(person => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'result';
        const name = document.createElement('strong'); name.textContent = person.name;
        button.append(name);
        button.addEventListener('click', () => {
          const selectionId = ++progressRequest;
          document.querySelector('#progress-name').textContent = person.name;
          document.querySelector('#progress-total').textContent = Number.isFinite(person.total) ? `${person.total.toLocaleString('th-TH', {maximumFractionDigits: 2})} กม.` : 'ไม่สามารถแสดงระยะสะสมได้';
          const total=Number(person.total)||0;document.querySelector('#progress-goal-text').textContent=`${distanceText(total)} / 70 กม. • สะสมเกินเป้าหมายได้`;
          document.querySelector('#progress-goal-bar').style.width=`${Math.min(100,Math.max(0,total/70*100))}%`;
          progressResults.replaceChildren(); progressSelected.hidden = false; progressStatus.textContent = '';
          progressRank.textContent = 'กำลังโหลดอันดับ…';
          loadProgressRank(person.name, selectionId);
          historySection.hidden = false;
          loadIndividualHistory(person.name, selectionId);
        });
        progressResults.append(button);
      });
    } catch (error) { if (id === progressRequest) progressStatus.textContent = 'ค้นหาไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'; }
  }, 300);
});
async function getIndividualHistory(name) {
    const url = new URL('https://docs.google.com/spreadsheets/d/1pyi4CzPgF-pfInIK_BgbD4UfDolegvCst9RIPIGFXuY/gviz/tq');
    url.searchParams.set('tqx', 'out:json'); url.searchParams.set('sheet', 'MT_70');
    const response = await fetch(url); if (!response.ok) throw new Error('history');
    const raw = await response.text();
    const payload = raw.match(/setResponse\((\{[\s\S]*\})\);?\s*$/);
    if (!payload) throw new Error('history format');
    const data = JSON.parse(payload[1]);
    if (data.status !== 'ok' || !data.table || !Array.isArray(data.table.rows)) throw new Error('history');
    return data.table.rows.slice().reverse().filter(row => row.c && row.c[1] && String(row.c[1].v || '').trim() === name.trim()).slice(0,10).map(row => ({
      date: row.c[0] && (row.c[0].f || row.c[0].v) || '',
      distance: row.c[2] && (row.c[2].f || row.c[2].v) || '0',
      photoUrl: row.c[3] && (row.c[3].v || row.c[3].f) || ''
    }));
}
function renderIndividualHistory(entries, list) {
    entries.forEach(entry => {
      const row = document.createElement('div'); row.className = 'history-row';
      const details = document.createElement('div'); details.className = 'history-details';
      const distance = document.createElement('strong'); distance.textContent = `${entry.distance} กม.`;
      const date = document.createElement('span'); date.textContent = entry.date || 'ไม่ระบุวันเวลา';
      details.append(distance, date); row.append(details);
      let photoUrl;
      try { photoUrl = new URL(entry.photoUrl); } catch (_) { photoUrl = null; }
      if (photoUrl && photoUrl.protocol === 'https:' && photoUrl.hostname === 'drive.google.com') {
        const link = document.createElement('a'); link.className = 'history-photo';
        link.href = photoUrl.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.dataset.photoDate = entry.date || 'ไม่ระบุวันเวลา'; link.dataset.photoValue = `${entry.distance} กม.`;
        link.textContent = 'ดูภาพ'; row.append(link);
      } else {
        const noPhoto = document.createElement('span'); noPhoto.className = 'history-no-photo';
        noPhoto.textContent = 'ไม่มีภาพ'; row.append(noPhoto);
      }
      list.append(row);
    });
}
async function loadIndividualHistory(name, selectionId) {
  historyList.replaceChildren();
  historyStatus.textContent = 'กำลังโหลดประวัติ…';
  try {
    const entries=await getIndividualHistory(name);
    if (selectionId !== progressRequest) return;
    historyStatus.textContent = entries.length ? '' : 'ยังไม่มีประวัติการส่งระยะ';
    renderIndividualHistory(entries,historyList);
  } catch (error) {
    if (selectionId === progressRequest) historyStatus.textContent = 'ยังโหลดประวัติไม่ได้ กรุณาตรวจสอบการเชื่อมต่อและ Apps Script';
  }
}
async function loadRankingHistory(name, container, group) {
  const request=(group.historyRequest||0)+1;group.historyRequest=request;
  container.replaceChildren();
  const heading=document.createElement('p');heading.className='team-history-heading';heading.textContent='10 รายการล่าสุด';
  const status=document.createElement('p');status.className='team-members-status';status.textContent='กำลังโหลดประวัติ…';
  const list=document.createElement('div');list.className='history-list';container.append(heading,status,list);
  try {
    const entries=await getIndividualHistory(name);if(!group.open||group.historyRequest!==request)return;
    status.textContent=entries.length?'':'ยังไม่มีประวัติการส่งระยะ';renderIndividualHistory(entries,list);
  }catch(error){if(group.open&&group.historyRequest===request)status.textContent='โหลดประวัติไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ';}
}
async function loadProgressRank(name, selectionId) {
  try {
    const url = new URL(window.SCRIPT_URL); url.searchParams.set('action', 'individual-ranking');
    const response = await fetch(url); const data = await response.json();
    if (!response.ok || !data.ok || !data.individualRanking || !Array.isArray(data.ranking)) throw new Error('ranking');
    if (selectionId !== progressRequest) return;
    const selected = data.ranking.find(row => row.name === name);
    if (!selected) { progressRank.textContent = 'ไม่พบอันดับ'; return; }
    const total = Number(selected.total) || 0;
    if (total <= 0) { progressRank.textContent = 'ยังไม่มีอันดับ'; return; }
    const rank = data.ranking.findIndex(row => (Number(row.total) || 0) === total) + 1;
    progressRank.textContent = `อันดับ ${rank.toLocaleString('th-TH')}`;
  } catch (error) {
    if (selectionId === progressRequest) progressRank.textContent = 'ไม่สามารถโหลดอันดับได้';
  }
}


const teamToggle = document.querySelector('#team-toggle');
const individualToggle = document.querySelector('#individual-toggle');
const scoreToggle = document.querySelector('#score-toggle');
const heroEyebrow = document.querySelector('#hero-eyebrow');
const heroTitle = document.querySelector('#hero-title');
const heroLead = document.querySelector('#hero-lead');
const defaultHeroTitle = heroTitle.innerHTML;
function setMode(mode) {
  const team = mode === 'team', individual = mode === 'individual', score = mode === 'score';
  teamToggle.setAttribute('aria-pressed', String(team));
  individualToggle.setAttribute('aria-pressed', String(individual));
  scoreToggle.setAttribute('aria-pressed', String(score));
  teamToggle.classList.toggle('active', team);
  individualToggle.classList.toggle('active', individual);
  scoreToggle.classList.toggle('active', score);
  heroEyebrow.textContent = team ? "LET'S PLAY TOGETHER" : score ? 'POINTS TOGETHER' : 'LET’S RUN TOGETHER';
  if (team) {
    heroTitle.setAttribute('aria-label','เผา 70,000 kcal');
    heroTitle.innerHTML = '<svg class="hero-flame" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#ffcf5c" d="M25 3c2 10-5 12-5 19-3-2-4-5-4-8C8 20 6 25 6 30c0 10 8 16 18 16s18-6 18-16C42 20 35 11 25 3Z"/><path fill="#ff754f" d="M26 23c0 5-6 6-6 11 0 2 1 4 4 5-7 0-11-4-11-9 0-4 3-7 5-9 0 3 2 5 3 5 0-5 3-8 5-12 1 4 3 6 5 8 3 3 5 5 5 9 0 5-4 8-10 8 3-2 4-4 4-6 0-4-2-7-4-10Z"/></svg> <span class="hero-team-value">70,000 kcal</span>';
  } else {
    heroTitle.removeAttribute('aria-label');
    if (score) {
      heroTitle.setAttribute('aria-label','คะแนนสะสม');
      heroTitle.innerHTML = '<svg class="hero-star" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22" fill="#fff"/><path fill="#ffbf39" d="m24 9 4.4 9 9.9 1.4-7.2 7 1.7 9.8L24 31.5l-8.8 4.7 1.7-9.8-7.2-7 9.9-1.4z"/></svg> <span class="hero-score-value">คะแนนสะสม</span>';
    }
    else heroTitle.innerHTML = defaultHeroTitle;
  }
  heroLead.textContent = team ? 'แข่งขันทีม kcal สะสม' : score ? 'ดูคะแนนและกิจกรรมของคุณ' : '28/12/2569 - 27/1/2570';
  document.querySelector('#individual-ui').hidden = !individual;
  document.querySelector('#team-ui').hidden = !team;
  document.querySelector('#score-ui').hidden = !score;
  window.dispatchEvent(new CustomEvent('team-mode', {detail: {team}}));
  if (score) window.dispatchEvent(new CustomEvent('score-mode'));
}
teamToggle.addEventListener('click', () => setMode('team'));
individualToggle.addEventListener('click', () => setMode('individual'));
scoreToggle.addEventListener('click', () => setMode('score'));
