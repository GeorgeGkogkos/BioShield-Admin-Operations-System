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
  status: '/admin/operations/status',
} as const;

export type Screen = keyof typeof ROUTES;
export type RouteChange = (screen: Screen) => void;
const canonical = (screen: Screen): Screen => (['overview','pilot','map'] as string[]).includes(screen)?'discovery':screen;
const SCREENS: Screen[] = ['overview','discovery','pilot','map','sources','status'];

export function currentScreen(location: Pick<Location,'pathname'|'search'> = window.location): Screen {
  const path=location.pathname.replace(/\/+$/,'') || '/';
  const found=SCREENS.find(screen=>ROUTES[screen]===path);
  if(found)return canonical(found);
  // Backward compatibility for existing /admin/operations?tab=map links.
  if(path==='/admin/operations'){
    const legacy=new URLSearchParams(location.search).get('tab');
    if(legacy && SCREENS.includes(legacy as Screen))return canonical(legacy as Screen);
  }
  return 'discovery';
}

export function installNavigation(page: HTMLElement, onChange: RouteChange): () => void {
  const shellNavigation=document.getElementById('bio-shell-nav');
  const bottomNavigation=document.getElementById('bio-bottom-nav');
  // Native history restoration can reapply a previous page's offset after popstate.
  if('scrollRestoration' in window.history)window.history.scrollRestoration='manual';
  let active: Screen = currentScreen();
  let leaving: Animation|null=null;
  let pending: Screen|null=null;
  let revision=0;
  const change=(requested: Screen, push: boolean): void=>{
    if(!SCREENS.includes(requested))return;
    const next=canonical(requested);
    if(pending===next)return;
    if(active===next && !leaving && !push){onChange(next);return;}
    if(active===next && !leaving && window.location.pathname===ROUTES[next])return;

    // Cancel any superseded navigation before scheduling a newer one.
    const currentRevision=++revision;
    if(leaving){leaving.cancel();leaving=null;pending=null;}
    // Update the URL immediately; the visual hand-off does not block History.
    if(push && window.location.pathname!==ROUTES[next]){
      window.history.pushState({bioScreen:next},'',ROUTES[next]);
    }
    const render=()=>{
      if(currentRevision!==revision)return;
      active=next;
      document.documentElement.dataset.bioScreen=next;
      onChange(next);
      document.title='BioShield — '+({
        overview:'Επισκόπηση',discovery:'Νέες ανακαλύψεις',
        pilot:'Αποθηκευμένα ευρήματα',map:'Χάρτης / Κάλυψη',
        sources:'Πηγές & έλεγχοι',status:'Κατάσταση & διαφάνεια',
      } as const)[next];
      page.querySelector<HTMLElement>('[data-bio-panel="'+next+'"] h2, [data-bio-panel="'+next+'"] h1')
        ?.setAttribute('tabindex','-1');
      // Always reset the *content* scroll, not the permanent chrome.
      window.scrollTo(0,0);
    };

    const oldPanel=page.querySelector<HTMLElement>('[data-bio-panel="'+active+'"]');
    const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
    if(next!==active && oldPanel && !oldPanel.hidden &&
       typeof oldPanel.animate==='function' && !reducedMotion){
      // In-flow Web Animations cannot paint above the sticky header/sidebar.
      // The new panel then uses the CSS 250ms fade/slide entrance.
      pending=next;
      const animation=oldPanel.animate([
        {opacity:1,transform:'translateY(0)'},
        {opacity:0,transform:'translateY(-6px)'}
      ],{duration:145,easing:'ease-in',fill:'forwards'});
      leaving=animation;
      const finish=()=>{
        if(currentRevision!==revision)return;
        leaving=null;pending=null;
        animation.cancel();
        render();
      };
      void animation.finished.then(finish,finish);
    }else{
      render();
    }
  };
  const onClick=(event: MouseEvent): void=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey ||
       event.shiftKey || event.altKey)return;
    const target=event.target;
    if(!(target instanceof Element))return;
    const nav=target.closest<HTMLElement>('[data-bio-tab]');
    if(!nav || (!page.contains(nav) && !shellNavigation?.contains(nav) && !bottomNavigation?.contains(nav)))return;
    const next=nav.dataset.bioTab as Screen;
    if(!SCREENS.includes(next))return;
    event.preventDefault();
    change(next,true);
  };
  const onPop=():void=>change(currentScreen(),false);
  page.addEventListener('click',onClick);
  shellNavigation?.addEventListener('click',onClick);
  bottomNavigation?.addEventListener('click',onClick);
  window.addEventListener('popstate',onPop);
  // Initial request route or bookmark. Do not rewrite address by default.
  document.documentElement.dataset.bioScreen=active;
  onChange(active);
  return ()=>{
    revision++;
    if(leaving){leaving.cancel();leaving=null;pending=null;}
    page.removeEventListener('click',onClick);
    shellNavigation?.removeEventListener('click',onClick);
    bottomNavigation?.removeEventListener('click',onClick);
    window.removeEventListener('popstate',onPop);
  };
}
