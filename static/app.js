import {renderBioShieldAdmin} from './bioshield-admin.js';
import {currentScreen} from './typed/navigation.js';
const esc = value => String(value??'').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
async function api(path) {
  const response=await fetch('/api'+path,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok){const error=new Error('Service unavailable');error.status=response.status;throw error;}
  return response.json();
}
const themeButton=document.getElementById('theme-toggle');
const valid=['system','light','dark'];
let theme=localStorage.getItem('bioshield-theme')||'system';
if(!valid.includes(theme))theme='system';
function applyTheme(){
  if(theme==='system')delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=theme;
  themeButton.textContent=theme==='dark'?'Σκούρο':theme==='light'?'Φωτεινό':'Αυτόματο';
}
applyTheme();
themeButton.addEventListener('click',()=>{
  theme=theme==='system'?'dark':theme==='dark'?'light':'system';
  localStorage.setItem('bioshield-theme',theme);applyTheme();
});
// Highlight persistent navigation immediately, even while discovery APIs load.
const initialScreen=currentScreen();
const shellLinks=[...document.querySelectorAll('#bio-shell-nav [data-bio-tab]'),
  ...document.querySelectorAll('#bio-bottom-nav [data-bio-tab]')];
shellLinks.forEach(link=>{
  const active=link.dataset.bioTab===initialScreen;
  link.classList.toggle('active',active);
  if(active)link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
});
// The app shell stays mounted while pages change. Drawer is keyboard accessible.
const menuToggle=document.getElementById('bio-mobile-menu-toggle');
const menuClose=document.getElementById('bio-mobile-menu-close');
const menuBackdrop=document.getElementById('bio-sidebar-backdrop');
const menuSidebar=document.getElementById('bio-sidebar');
const mobileViewport=window.matchMedia('(max-width: 960px)');
// A phone already has the full bottom navigation; a drawer is only needed on tablets.
const drawerViewport=window.matchMedia('(min-width: 701px) and (max-width: 960px)');
const menuIsOpen=()=>document.body.classList.contains('bio-mobile-nav-open');
function setMenuOpen(open,restoreFocus=true){
  const wasOpen=menuIsOpen();
  const visible=Boolean(open && drawerViewport.matches);
  const shouldRestore=wasOpen && !visible && restoreFocus && menuSidebar.contains(document.activeElement);
  document.body.classList.toggle('bio-mobile-nav-open',visible);
  menuToggle.setAttribute('aria-expanded',String(visible));
  menuToggle.setAttribute('aria-label',visible?'Κλείσιμο πλοήγησης':'Άνοιγμα πλοήγησης');
  menuSidebar.inert=mobileViewport.matches && !visible;
  if(mobileViewport.matches){
    menuSidebar.setAttribute('role','dialog');
    menuSidebar.setAttribute('aria-modal',String(visible));
  }else{
    menuSidebar.removeAttribute('role');
    menuSidebar.removeAttribute('aria-modal');
  }
  if(visible && !wasOpen)menuClose.focus();
  if(shouldRestore)menuToggle.focus();
}
setMenuOpen(false);
menuToggle.addEventListener('click',()=>setMenuOpen(!menuIsOpen()));
menuClose.addEventListener('click',()=>setMenuOpen(false));
menuBackdrop.addEventListener('click',()=>{setMenuOpen(false);menuToggle.focus();});
menuSidebar.addEventListener('click',event=>{
  if(event.target instanceof Element && event.target.closest('[data-bio-tab]')){
    setMenuOpen(false,false);
    // Focus the new content for keyboard users without undoing the route scroll reset.
    document.getElementById('content').focus({preventScroll:true});
  }
});
document.addEventListener('keydown',event=>{
  if(!menuIsOpen())return;
  if(event.key==='Escape'){setMenuOpen(false);menuToggle.focus();return;}
  if(event.key!=='Tab')return;
  const focusable=[...menuSidebar.querySelectorAll('a[href],button:not([disabled])')]
    .filter(el=>el.getClientRects().length>0);
  if(!focusable.length){event.preventDefault();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey && (document.activeElement===first || !menuSidebar.contains(document.activeElement))){
    event.preventDefault();last.focus();
  }else if(!event.shiftKey && (document.activeElement===last || !menuSidebar.contains(document.activeElement))){
    event.preventDefault();first.focus();
  }
});
window.addEventListener('popstate',()=>setMenuOpen(false));
mobileViewport.addEventListener('change',()=>setMenuOpen(false));
drawerViewport.addEventListener('change',()=>setMenuOpen(false));
// Keep the application shell mounted: only the header's status changes.
const appMount=document.getElementById('app');
renderBioShieldAdmin(appMount,{api,esc}).catch(error=>{
  console.error('BioShield initial data render failed:',error);
  appMount.innerHTML='<div class="bio-initial-load-error" role="alert"><strong>Αδυναμία φόρτωσης δεδομένων</strong><p>Δεν ήταν δυνατή η αρχική εμφάνιση των δεδομένων. Δοκιμάστε ανανέωση της σελίδας.</p></div>';
}).finally(()=>{
  document.querySelector('.topbar')?.classList.remove('bio-is-loading');
});
