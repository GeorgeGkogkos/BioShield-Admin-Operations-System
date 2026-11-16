/** BIO-21: accessible skeletons for initial load and real provider searches.
 * Skeletons indicate work in progress; NEVER imply actual source success.
 */
export function skeletonCards(count=4){
  return Array.from({length:count},(_,i)=>
    '<div class="bio-skeleton-card" aria-hidden="true">'+
    '<span class="bio-skeleton bio-sk-w35"></span>'+
    '<span class="bio-skeleton bio-sk-w55 bio-sk-tall"></span>'+
    '<span class="bio-skeleton bio-sk-w70"></span></div>').join('');
}
export function skeletonRows(count=5){
  return Array.from({length:count},(_,i)=>
    '<div class="bio-skeleton-row" aria-hidden="true">'+
    '<span class="bio-skeleton bio-sk-circle"></span>'+
    '<div class="bio-skeleton-row-lines"><span class="bio-skeleton bio-sk-w65"></span>'+
    '<span class="bio-skeleton bio-sk-w35"></span></div>'+
    '<span class="bio-skeleton bio-sk-w20"></span></div>').join('');
}
export function skeletonBlock(kind='table'){
  if(kind==='map')return '<div class="bio-skeleton-map" aria-hidden="true">'+
    '<span class="bio-skeleton bio-sk-map"></span>'+
    '<span class="bio-skeleton bio-sk-w50"></span></div>';
  if(kind==='cards')return '<div class="bio-skeleton-metrics">'+skeletonCards(3)+'</div>';
  if(kind==='compact')return '<div class="bio-skeleton-lines" aria-hidden="true">'+
    '<span class="bio-skeleton bio-sk-w70"></span><span class="bio-skeleton bio-sk-w50"></span>'+
    '<span class="bio-skeleton bio-sk-w35"></span></div>';
  return '<div class="bio-skeleton-table">'+skeletonRows(5)+'</div>';
}
/** The header shows the single company brand/busy indicator; main shows data placeholders only. */
export function pageSkeleton(path='/admin/operations/overview'){
  const which=path.endsWith('/map')?'map':
    path.endsWith('/sources')?'cards':path.endsWith('/overview')?'cards':'table';
  return '<div class="bio-skeleton-page" aria-busy="true" aria-label="Φόρτωση περιεχομένου">'+
    '<div class="bio-skeleton-metrics">'+skeletonCards(4)+'</div>'+
    '<div class="bio-skeleton-content"><div class="bio-skeleton-work">'+
    '<span class="bio-skeleton bio-sk-w50 bio-sk-heading"></span>'+
    skeletonBlock(which)+'</div>'+
    '<div class="bio-skeleton-work"><span class="bio-skeleton bio-sk-w35 bio-sk-heading"></span>'+
    skeletonRows(4)+'</div></div>'+
    '</div>';
}
/** Non-destructive overlay: existing results remain beneath a busy shimmer. */
export function showLoadingOverlay(target,label='Αναζήτηση σε εξέλιξη…',kind='table'){
  if(!target)return ()=>{};
  const old=target.querySelector(':scope > .bio-skeleton-overlay');
  if(old)old.remove();
  target.classList.add('bio-loading-host');
  target.setAttribute('aria-busy','true');
  const overlay=document.createElement('div');
  overlay.className='bio-skeleton-overlay';
  overlay.setAttribute('role','status');
  overlay.setAttribute('aria-label',label);
  overlay.innerHTML='<div class="bio-skeleton-overlay-caption">'+
    '<span class="bio-skeleton-loader" aria-hidden="true"></span><strong>'+
    escapeHtml(label)+'</strong></div>'+skeletonBlock(kind);
  target.appendChild(overlay);
  let ended=false;
  return ()=>{
    if(ended)return;
    ended=true;
    if(overlay.isConnected)overlay.remove();
    target.removeAttribute('aria-busy');
    target.classList.remove('bio-loading-host');
  };
}
const ESCAPE_MAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,ch=>ESCAPE_MAP[ch]||ch);
}
