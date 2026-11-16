/** BIO-19: typed, deep-linkable, progressive-enhancement navigation.
 * Actual server routes are FastAPI read-only pages. The client keeps shared
 * evidence data and renders transitions without page reloads.
 */
export const ROUTES = {
  overview: '/admin/operations/overview',
  discovery: '/admin/operations/discovery',
  pilot: '/admin/operations/evidence',
  map: '/admin/operations/map',
  sources: '/admin/operations/sources',
};

const SCREENS = ['overview','discovery','pilot','map','sources'];

export function currentScreen(location = window.location) {
  const path=location.pathname.replace(/\/+$/,'') || '/';
  const found=SCREENS.find(screen=>ROUTES[screen]===path);
  if(found)return found;
  // Backward compatibility for existing /admin/operations?tab=map links.
  if(path==='/admin/operations'){
    const legacy=new URLSearchParams(location.search).get('tab');
    if(legacy && SCREENS.includes(legacy))return legacy;
  }
  return 'overview';
}

export function installNavigation(page, onChange) {
  let active = currentScreen();
  const change=(next, push)=>{
    if(!SCREENS.includes(next))return;
    if(active===next && !push){onChange(next);return;}
    if(active===next && window.location.pathname===ROUTES[next])return;
    const render=()=>{
      active=next;
      document.documentElement.dataset.bioScreen=next;
      onChange(next);
      document.title='BioShield — '+({
        overview:'Επισκόπηση',discovery:'Νέες ανακαλύψεις',
        pilot:'Αποθηκευμένα ευρήματα',map:'Χάρτης / Κάλυψη',
        sources:'Πηγές & έλεγχοι',
      })[next];
      if(push)window.history.pushState({bioScreen:next},'',ROUTES[next]);
      page.querySelector('[data-bio-panel="'+next+'"] h2, [data-bio-panel="'+next+'"] h1')
        ?.setAttribute('tabindex','-1');
    };
    const doc=document;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(doc.startViewTransition && !reduced)doc.startViewTransition(render);
    else render();
  };
  const onClick=(event)=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey ||
       event.shiftKey || event.altKey)return;
    const target=event.target;
    if(!(target instanceof Element))return;
    const nav=target.closest('[data-bio-tab]');
    if(!nav || !page.contains(nav))return;
    const next=nav.dataset.bioTab;
    if(!SCREENS.includes(next))return;
    event.preventDefault();
    change(next,true);
  };
  const onPop=()=>change(currentScreen(),false);
  page.addEventListener('click',onClick);
  window.addEventListener('popstate',onPop);
  // Initial request route or bookmark. Do not rewrite address by default.
  document.documentElement.dataset.bioScreen=active;
  onChange(active);
  return ()=>{
    page.removeEventListener('click',onClick);
    window.removeEventListener('popstate',onPop);
  };
}
