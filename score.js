const scoreSearch = document.querySelector('#score-search');
const scoreSearchStatus = document.querySelector('#score-search-status');
const scoreResults = document.querySelector('#score-results');
const scoreSelected = document.querySelector('#score-selected');
const scoreActivity = document.querySelector('#score-activity');
const scoreActivityStatus = document.querySelector('#score-activity-status');
const scoreActivityList = document.querySelector('#score-activity-list');
const scoreSearchTab = document.querySelector('#score-search-tab');
const scoreRankingTab = document.querySelector('#score-ranking-tab');
const scoreSearchPanel = document.querySelector('#score-search-panel');
const scoreRankingPanel = document.querySelector('#score-ranking-panel');
const scoreRankingStatus = document.querySelector('#score-ranking-status');
const scoreRankingList = document.querySelector('#score-ranking-list');
let scoreDataPromise, scoreSearchRequest = 0, scoreRankingRequest = 0;
const scoreNumber = value => Number(value).toLocaleString('th-TH', {maximumFractionDigits: 2});

function buildScoreData(employees, pointRows) {
  const names = new Set(), totals = new Map(), activities = new Map();
  employees.forEach(row => { const name = String(row[0]?.v || '').trim(); if (name) names.add(name); });
  pointRows.forEach(row => {
    const name = String(row[0]?.v || '').trim(); if (!name) return;
    const activity = String(row[1]?.v || '').trim();
    const value = row[2]?.v, points = value === null || value === undefined || value === '' ? null : Number(value);
    const numeric = points !== null && Number.isFinite(points) ? points : null;
    names.add(name); if (!activities.has(name)) activities.set(name, []);
    activities.get(name).push({activity, points:numeric});
    totals.set(name, (totals.get(name) || 0) + (numeric === null ? 0 : numeric));
  });
  const ranking = [...totals].map(([name,total]) => ({name,total})).sort((a,b) => b.total-a.total || a.name.localeCompare(b.name,'th'));
  return {names:[...names], activities, totals, ranking};
}
function loadScores(force = false) {
  if (force || !scoreDataPromise) {
    const request = Promise.all([readTeamSheet('Employee'), readTeamSheet('MT_Point')]).then(([employees, rows]) => buildScoreData(employees, rows));
    scoreDataPromise = request;
    request.catch(() => { if (scoreDataPromise === request) scoreDataPromise = null; });
  }
  return scoreDataPromise;
}
function setScorePage(ranking) {
  scoreSearchPanel.hidden = ranking; scoreRankingPanel.hidden = !ranking;
  [[scoreSearchTab,!ranking],[scoreRankingTab,ranking]].forEach(([tab,active]) => {
    tab.classList.toggle('active',active); if(active)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');
  });
  if (ranking) refreshScoreRanking();
}
scoreSearchTab.addEventListener('click', () => setScorePage(false));
scoreRankingTab.addEventListener('click', () => setScorePage(true));
window.addEventListener('score-mode', () => {
  ++scoreSearchRequest; ++scoreRankingRequest; scoreDataPromise = null;
  scoreSearch.value = ''; scoreSearchStatus.textContent = ''; scoreResults.replaceChildren();
  scoreSelected.hidden = true; scoreActivity.hidden = true; setScorePage(false);
});

scoreSearch.addEventListener('input', async () => {
  const id = ++scoreSearchRequest, query = scoreSearch.value.trim().toLocaleLowerCase();
  scoreResults.replaceChildren(); scoreSelected.hidden = true; scoreActivity.hidden = true;
  if (!query) { scoreSearchStatus.textContent = ''; return; }
  scoreSearchStatus.textContent = 'กำลังค้นหา…';
  try {
    const data = await loadScores(); if (id !== scoreSearchRequest) return;
    const matches = data.names.filter(name => name.toLocaleLowerCase().includes(query)).slice(0,50);
    scoreSearchStatus.textContent = matches.length ? `พบ ${matches.length} รายชื่อ กรุณาเลือก` : 'ไม่พบรายชื่อที่ตรงกัน';
    matches.forEach(name => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'result';
      const text = document.createElement('strong'); text.textContent = name; button.append(text);
      button.addEventListener('click', () => { ++scoreSearchRequest; scoreResults.replaceChildren(); scoreSearchStatus.textContent = ''; showScorePerson(name,data); });
      scoreResults.append(button);
    });
  } catch (error) { if (id === scoreSearchRequest) scoreSearchStatus.textContent = 'โหลดข้อมูลคะแนนไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ'; }
});
function showScorePerson(name, data) {
  document.querySelector('#score-name').textContent = name;
  document.querySelector('#score-total').textContent = `${scoreNumber(data.totals.get(name) || 0)} คะแนน`;
  scoreSelected.hidden = false; scoreActivity.hidden = false; scoreActivityList.replaceChildren();
  const entries = data.activities.get(name) || [];
  scoreActivityStatus.textContent = entries.length ? '' : 'ยังไม่มีรายการคะแนน';
  entries.slice().reverse().forEach(entry => {
    const row = document.createElement('div'); row.className = 'history-row';
    const title = document.createElement('strong'); title.className = 'score-activity-name'; title.textContent = entry.activity || 'ไม่ระบุกิจกรรม';
    const points = document.createElement('strong'); points.className = 'ranking-value'; points.textContent = entry.points === null ? 'ไม่ระบุคะแนน' : `${scoreNumber(entry.points)} คะแนน`;
    row.append(title, points); scoreActivityList.append(row);
  });
}
async function refreshScoreRanking(force = false) {
  const id = ++scoreRankingRequest; scoreRankingList.replaceChildren(); scoreRankingStatus.textContent = 'กำลังโหลดอันดับ…';
  try {
    const data = await loadScores(force); if (id !== scoreRankingRequest) return;
    scoreRankingStatus.textContent = data.ranking.length ? '' : 'ยังไม่มีรายการคะแนน';
    let rank = 0, previous = null;
    data.ranking.forEach((person,i) => {
      if (person.total !== previous) rank = i+1; previous = person.total;
      const row = document.createElement('div'); row.className = 'ranking-row';
      const position = document.createElement('span'); position.className = 'ranking-position'; position.textContent = rank;
      const info = document.createElement('div'); info.className = 'ranking-info';
      const name = document.createElement('strong'); name.textContent = person.name; info.append(name);
      const total = document.createElement('strong'); total.className = 'ranking-value'; total.textContent = `${scoreNumber(person.total)} คะแนน`;
      row.append(position,info,total); scoreRankingList.append(row);
    });
  } catch (error) { if (id === scoreRankingRequest) scoreRankingStatus.textContent = 'โหลดอันดับไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ'; }
}
document.querySelector('#score-ranking-refresh').addEventListener('click', () => refreshScoreRanking(true));
