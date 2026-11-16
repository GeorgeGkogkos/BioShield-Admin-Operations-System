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
} as const;

export type Screen = keyof typeof ROUTES;
export type RouteChange = (screen: Screen) => void;
const SCREENS: Screen[] = ['overview','discovery','pilot','map','sources'];

export function currentScreen(location: Pick<Location,'pathname'|'search'> = window.location): Screen {
  const path=location.pathname.replace(/\/+$/,'') || '/';
  const found=SCREENS.find(screen=>ROUTES[screen]===path);
  if(found)return found;
  // Backward compatibility for existing /admin/operations?tab=map links.
  if(path==='/admin/operations'){
    const legacy=new URLSearchParams(location.search).get('tab');
    if(legacy && SCREENS.includes(legacy as Screen))return legacy as Screen;
  }
  return 'overview';
}

export function installNavigation(page: HTMLElement, onChange: RouteChange): () => void {
  const shellNavigation=document.getElementById('bio-shell-nav');
  let active: Screen = currentScreen();
  const change=(next: Screen, push: boolean): void=>{
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
      } as const)[next];
      if(push)window.history.pushState({bioScreen:next},'',ROUTES[next]);
      page.querySelector<HTMLElement>('[data-bio-panel="'+next+'"] h2, [data-bio-panel="'+next+'"] h1')
        ?.setAttribute('tabindex','-1');
    };
    // Document-level snapshots paint in the browser top layer over sticky
    // app chrome. Switch the real DOM panel instead; its in-flow CSS entrance
    // animation stays underneath the persistent header and sidebar.
    render();
  };
  const onClick=(event: MouseEvent): void=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey ||
       event.shiftKey || event.altKey)return;
    const target=event.target;
    if(!(target instanceof Element))return;
    const nav=target.closest<HTMLElement>('[data-bio-tab]');
    if(!nav || (!page.contains(nav) && !shellNavigation?.contains(nav)))return;
    const next=nav.dataset.bioTab as Screen;
    if(!SCREENS.includes(next))return;
    event.preventDefault();
    change(next,true);
  };
  const onPop=():void=>change(currentScreen(),false);
  page.addEventListener('click',onClick);
  shellNavigation?.addEventListener('click',onClick);
  window.addEventListener('popstate',onPop);
  // Initial request route or bookmark. Do not rewrite address by default.
  document.documentElement.dataset.bioScreen=active;
  onChange(active);
  return ()=>{
    page.removeEventListener('click',onClick);
    shellNavigation?.removeEventListener('click',onClick);
    window.removeEventListener('popstate',onPop);
  };
}
