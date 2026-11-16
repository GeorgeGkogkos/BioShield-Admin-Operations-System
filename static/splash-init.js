/* BIO-30: A branded splash is shown on first full load per tab session and on refresh.
   Normal History API navigation never evaluates this boot script again. */
(function initializeBioSplash(){
  let initialVisit=true;
  try{
    initialVisit=sessionStorage.getItem('bioshield-splash-seen')!=='1';
    sessionStorage.setItem('bioshield-splash-seen','1');
  }catch{/* Restrictive storage settings: displaying the logo is the safe fallback. */}
  let isRefresh=false;
  try{
    const navigation=performance.getEntriesByType('navigation')[0];
    isRefresh=navigation?.type==='reload' ||
      (!navigation && performance.navigation?.type===1);
  }catch{/* The first-visit check still works if timing data are unavailable. */}
  try{
    const theme=localStorage.getItem('bioshield-theme');
    if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme;
  }catch{/* Follow the system color scheme. */}
  if(initialVisit||isRefresh){
    document.documentElement.dataset.bioSplash='show';
    window.__bioSplashStartedAt=performance.now();
  }
})();
