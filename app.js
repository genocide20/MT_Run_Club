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
        const organization = document.createElement('span'); organization.textContent = person.organization || 'ไม่ระบุสังกัด';
        button.append(name, organization);
        button.addEventListener('click', () => {
          chosenPerson = person;
          document.querySelector('#selected-name').textContent = person.name;
          document.querySelector('#selected-organization').textContent = person.organization || 'ไม่ระบุสังกัด';
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
  button.disabled = true; search.disabled = true; saveStatus.textContent = 'กำลังบันทึก…';
  try {
    const body = new URLSearchParams({name: chosenPerson.name, distance: String(distance)});
    if (screenshot.files.length) {
      const checkUrl = new URL(window.SCRIPT_URL); checkUrl.searchParams.set('capability', 'photo-upload');
      const capability = await (await fetch(checkUrl)).json();
      if (!capability.photoUpload) { saveStatus.textContent = 'ยังไม่ได้อัปเดต Google Apps Script สำหรับบันทึกรูป กรุณาติดต่อผู้ดูแล'; return; }
      saveStatus.textContent = 'กำลังบีบอัดรูปและบันทึก…';
      body.set('photo', await compressPhoto(screenshot.files[0]));
    }
    const response = await fetch(window.SCRIPT_URL, {method: 'POST', body}); const data = await response.json();
    if (!response.ok || !data.ok || (screenshot.files.length && !data.photoSaved)) throw new Error('Save failed');
    form.reset(); resetPhoto(); showTotal(data.total); saveStatus.textContent = 'บันทึกระยะทางเรียบร้อยแล้ว';
  } catch (error) { saveStatus.textContent = 'ไม่สามารถยืนยันการบันทึกได้ กรุณาตรวจสอบข้อมูลในชีตก่อนลองอีกครั้ง เพื่อป้องกันการบันทึกซ้ำ'; }
  finally { button.disabled = false; search.disabled = false; }
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
  let worker;
  try {
    const library = await loadOcrLibrary();
    worker = await library.createWorker(['tha', 'eng']);
    const result = await worker.recognize(file);
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
    if (job === imageJob) ocrStatus.textContent = 'อ่านภาพไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตหรือกรอกระยะทางด้วยตนเอง';
  } finally { if (worker) await worker.terminate(); }
});





