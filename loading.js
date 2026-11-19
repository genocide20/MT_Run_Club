// Show a spinner only while an existing status message indicates ongoing work.
function updateLoadingIndicators() {
  document.querySelectorAll('[role="status"], .team-members-status').forEach(status => {
    status.classList.toggle('is-loading', /^กำลัง/.test(status.textContent.trim()));
  });
}
let loadingUpdatePending = false;
const loadingObserver = new MutationObserver(() => {
  if (loadingUpdatePending) return;
  loadingUpdatePending = true;
  requestAnimationFrame(() => { loadingUpdatePending = false; updateLoadingIndicators(); });
});
loadingObserver.observe(document.body, {childList:true, characterData:true, subtree:true});
updateLoadingIndicators();
