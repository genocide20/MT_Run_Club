// Open Drive photos inside the app without changing their sharing permissions.
const photoDialog = document.createElement('dialog');
photoDialog.className = 'photo-viewer';
photoDialog.setAttribute('aria-labelledby', 'photo-viewer-title');
photoDialog.innerHTML = '<div class="photo-viewer-header"><h2 id="photo-viewer-title"><span class="photo-viewer-date"></span><span class="photo-viewer-value"></span></h2><button type="button" class="photo-viewer-close" aria-label="ปิดภาพ">×</button></div><iframe class="photo-viewer-frame" title="ภาพที่ส่งจาก Google Drive" allow="fullscreen"></iframe><div class="photo-viewer-footer"><span>หากภาพไม่แสดง โปรดตรวจสอบสิทธิ์เข้าถึง</span><a class="photo-viewer-external" target="_blank" rel="noopener noreferrer">เปิดใน Google Drive ↗</a></div>';
document.body.append(photoDialog);
const photoFrame = photoDialog.querySelector('.photo-viewer-frame');
const photoExternal = photoDialog.querySelector('.photo-viewer-external');
photoDialog.querySelector('.photo-viewer-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => { if (event.target === photoDialog) photoDialog.close(); });
photoDialog.addEventListener('close', () => { photoFrame.removeAttribute('src'); photoExternal.removeAttribute('href'); });

function drivePhotoPreviewUrl(value) {
  let url;
  try { url = new URL(value); } catch (_) { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') return null;
  const path = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
  const id = path ? path[1] : url.searchParams.get('id');
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const preview = new URL(`https://drive.google.com/file/d/${id}/preview`);
  const resourceKey = url.searchParams.get('resourcekey');
  if (resourceKey) preview.searchParams.set('resourcekey', resourceKey);
  return preview.href;
}
document.addEventListener('click', event => {
  const link = event.target.closest('.history-photo');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const previewUrl = drivePhotoPreviewUrl(link.href);
  if (!previewUrl || typeof photoDialog.showModal !== 'function') return;
  event.preventDefault();
  photoDialog.querySelector('.photo-viewer-date').textContent = link.dataset.photoDate || 'ไม่ระบุวันเวลา';
  photoDialog.querySelector('.photo-viewer-value').textContent = link.dataset.photoValue || 'ไม่ระบุค่าที่ส่ง';
  photoExternal.href = link.href;
  photoFrame.src = previewUrl;
  photoDialog.showModal();
});
