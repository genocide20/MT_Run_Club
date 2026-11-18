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
  results.replaceChildren(); selected.hidden = true; form.hidden = true; chosenPerson = null; saveStatus.textContent = '';
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
    const response = await fetch(window.SCRIPT_URL, {method: 'POST', body}); const data = await response.json();
    if (!response.ok || !data.ok) throw new Error('Save failed');
    form.reset(); showTotal(data.total); saveStatus.textContent = 'บันทึกระยะทางเรียบร้อยแล้ว';
  } catch (error) { saveStatus.textContent = 'ไม่สามารถยืนยันการบันทึกได้ กรุณาตรวจสอบข้อมูลในชีตก่อนลองอีกครั้ง เพื่อป้องกันการบันทึกซ้ำ'; }
  finally { button.disabled = false; search.disabled = false; }
});
