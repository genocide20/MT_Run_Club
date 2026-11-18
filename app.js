const search = document.querySelector('#search');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const selected = document.querySelector('#selected');
let timer;
let requestId = 0;

search.addEventListener('input', () => {
  clearTimeout(timer);
  const id = ++requestId;
  const query = search.value.trim();
  results.replaceChildren();
  selected.hidden = true;
  if (!query) { status.textContent = ''; return; }
  if (!window.SCRIPT_URL) { status.textContent = 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheets กรุณาติดต่อผู้ดูแล'; return; }
  status.textContent = 'กำลังค้นหา…';
  timer = setTimeout(async () => {
    try {
      const url = new URL(window.SCRIPT_URL);
      url.searchParams.set('q', query);
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.results)) throw new Error('Search failed');
      if (id !== requestId) return;
      status.textContent = data.results.length ? `พบ ${data.results.length} รายชื่อ กรุณาเลือก` : 'ไม่พบรายชื่อที่ตรงกัน';
      data.results.forEach(person => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'result';
        const name = document.createElement('strong');
        name.textContent = person.name;
        const organization = document.createElement('span');
        organization.textContent = person.organization || 'ไม่ระบุสังกัด';
        button.append(name, organization);
        button.addEventListener('click', () => {
          document.querySelector('#selected-name').textContent = person.name;
          document.querySelector('#selected-organization').textContent = person.organization || 'ไม่ระบุสังกัด';
          selected.hidden = false;
          results.replaceChildren();
          status.textContent = '';
        });
        results.append(button);
      });
    } catch (error) {
      if (id === requestId) status.textContent = 'ค้นหาไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
    }
  }, 300);
});
