import {renderBioShieldAdmin} from './bioshield-admin.js';
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
renderBioShieldAdmin(document.getElementById('app'),{api,esc});
