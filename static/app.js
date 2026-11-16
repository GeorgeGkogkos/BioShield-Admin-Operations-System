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
// Highlight the correct destination immediately, even while discovery APIs load.
const initialScreen=currentScreen();
document.querySelectorAll('#bio-shell-nav [data-bio-tab]').forEach(link=>{
  const active=link.dataset.bioTab===initialScreen;
  link.classList.toggle('active',active);
  if(active)link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
});
// Shell navigation belongs to the application frame, not the changing page.
const menuToggle=document.getElementById('bio-mobile-menu-toggle');
const menuBackdrop=document.getElementById('bio-sidebar-backdrop');
const menuSidebar=document.getElementById('bio-sidebar');
const mobileViewport=window.matchMedia('(max-width: 960px)');
const menuIsOpen=()=>document.body.classList.contains('bio-mobile-nav-open');
function setMenuOpen(open){
  const visible=Boolean(open && mobileViewport.matches);
  document.body.classList.toggle('bio-mobile-nav-open',visible);
  menuToggle.setAttribute('aria-expanded',String(visible));
  menuToggle.setAttribute('aria-label',visible?'Κλείσιμο πλοήγησης':'Άνοιγμα πλοήγησης');
}
menuToggle.addEventListener('click',()=>setMenuOpen(!menuIsOpen()));
menuBackdrop.addEventListener('click',()=>{setMenuOpen(false);menuToggle.focus();});
menuSidebar.addEventListener('click',event=>{
  if(event.target instanceof Element && event.target.closest('[data-bio-tab]'))setMenuOpen(false);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && menuIsOpen()){setMenuOpen(false);menuToggle.focus();}
});
window.addEventListener('popstate',()=>setMenuOpen(false));
mobileViewport.addEventListener('change',()=>setMenuOpen(false));
renderBioShieldAdmin(document.getElementById('app'),{api,esc});
