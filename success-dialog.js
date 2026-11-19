const successDialog = document.createElement('dialog');
successDialog.className = 'success-dialog';
successDialog.setAttribute('aria-labelledby', 'success-title');
successDialog.setAttribute('aria-describedby', 'success-detail');
successDialog.innerHTML = '<div class="success-icon" aria-hidden="true">✓</div><p class="success-eyebrow">บันทึกสำเร็จ</p><h2 id="success-title">เรียบร้อยแล้ว!</h2><p id="success-detail"></p><button type="button" class="success-close">ตกลง</button>';
document.body.append(successDialog);
successDialog.querySelector('.success-close').addEventListener('click', () => successDialog.close());
function showSuccess(message) {
  if (typeof successDialog.showModal !== 'function') { window.alert(message); return; }
  successDialog.querySelector('#success-detail').textContent = message;
  if (!successDialog.open) successDialog.showModal();
}
if (new URLSearchParams(location.search).get('preview') === 'success') {
  showSuccess('ตัวอย่าง: บันทึกระยะทาง 5.43 กม. พร้อมภาพเรียบร้อยแล้ว');
}
