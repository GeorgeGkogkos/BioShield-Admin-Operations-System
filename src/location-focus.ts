/** BIO-20 typed-origin coarse region targeting; no raw GPS leaves browser. */
export const LOCATION_CHOICES: {id:string;label:string}[] = [
  {id:'ilion',label:'Ίλιον — Αττική / Εύβοια / Κορινθία'},
  {id:'attica',label:'Αττική'},
  {id:'evia',label:'Εύβοια'},
  {id:'corinthia',label:'Κορινθία'},
  {id:'thessaloniki',label:'Θεσσαλονίκη'},
  {id:'achaia',label:'Αχαΐα / Πάτρα'},
  {id:'heraklion',label:'Ηράκλειο'},
  {id:'larisa',label:'Λάρισα'},
  {id:'rodos',label:'Ρόδος'}
];
const IDs=LOCATION_CHOICES.map(x=>x.id);
const VALID=(x:unknown):x is string=>typeof x==='string'&&IDs.includes(x);

/** Coarse client-only bounding-band hints, NOT authoritative NUTS polygons. */
export function guessRegion(latitude:number,longitude:number):string{
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return '';
  if(latitude>=37.75&&latitude<=38.40&&longitude>=21.6&&longitude<=23.12)return 'corinthia';
  if(latitude>=38.18&&latitude<=39.15&&longitude>=23.15&&longitude<=24.7)return 'evia';
  if(latitude>=37.62&&latitude<=38.35&&longitude>=23.1&&longitude<=24.25)return 'attica';
  if(latitude>=40.37&&latitude<=41.02&&longitude>=22.55&&longitude<=23.50)return 'thessaloniki';
  if(latitude>=37.90&&latitude<=38.55&&longitude>=21.1&&longitude<=22.45)return 'achaia';
  if(latitude>=34.95&&latitude<=35.55&&longitude>=24.7&&longitude<=25.6)return 'heraklion';
  if(latitude>=39.35&&latitude<=40.00&&longitude>=21.95&&longitude<=22.85)return 'larisa';
  if(latitude>=35.95&&latitude<=36.52&&longitude>=27.60&&longitude<=28.45)return 'rodos';
  return '';
}
/** This does not persist exact coordinates; only user-selected home code. */
export function installLocationFocus(panel:HTMLElement,onFocusChange:(state:{home:string;temporary:string})=>void){
  if(!(panel instanceof HTMLElement))return {selection:()=>({home:'ilion',temporary:''}),stop:()=>{}};
  const home=panel.querySelector('#bio-focus-home');
  const temporary=panel.querySelector('#bio-focus-travel');
  const start=panel.querySelector('#bio-focus-gps-start');
  const stop=panel.querySelector('#bio-focus-gps-stop');
  const status=panel.querySelector('#bio-focus-gps-status');
  if(!home||!temporary||!start||!stop||!status)
    return {selection:()=>({home:'ilion',temporary:''}),stop:()=>{}};
  let stored='ilion';
  try{stored=localStorage.getItem('bioshield-home-region')||'ilion'}catch{}
  home.value=VALID(stored)?stored:'ilion';
  temporary.value='';
  let watchId:number|null=null;
  let stopped=false;
  let gpsCurrent=false;
  const selection=()=>({home:VALID(home.value)?home.value:'ilion',
                        temporary:VALID(temporary.value)?temporary.value:''});
  const notify=()=>{if(!stopped)onFocusChange(selection())};
  const note=(value:string)=>{status.textContent=value};
  const stopTracking=()=>{
    if(watchId!==null && navigator.geolocation){
      navigator.geolocation.clearWatch(watchId);watchId=null;
    }
    gpsCurrent=false;
    start.disabled=false;stop.disabled=true;
  };
  const onHome=()=>{
    try{localStorage.setItem('bioshield-home-region',home.value)}catch{}
    note('Η μόνιμη βάση διατηρείται στη συσκευή. Δεν αποθηκεύονται συντεταγμένες.');
    notify();
  };
  const onTemp=()=>{
    if(gpsCurrent){stopTracking()}
    note(temporary.value?'Πρόσθετη περιοχή επιλογής, χωρίς αντικατάσταση της βάσης.':
      'Καμία προσωρινή περιοχή — ισχύει η μόνιμη βάση.');
    notify();
  };
  const onStart=()=>{
    if(!('geolocation' in navigator)){
      note('Η συσκευή δεν παρέχει γεωεντοπισμό. Διάλεξε περιοχή χειροκίνητα.');
      return;
    }
    if(watchId!==null)return;
    start.disabled=true;stop.disabled=false;gpsCurrent=true;
    note('Αναμονή ρητής άδειας τοποθεσίας από τον browser…');
    watchId=navigator.geolocation.watchPosition(
      pos=>{
        if(stopped||!gpsCurrent)return;
        const detected=guessRegion(pos.coords.latitude,pos.coords.longitude);
        // Coordinates are discarded immediately; only a coarse zone code
        // may be sent with a subsequent first-party TED search.
        if(!detected){
          note('Η θέση δεν αντιστοιχεί με ασφάλεια στις διαθέσιμες ζώνες. Επίλεξε προσωρινή περιοχή χειροκίνητα.');
          return;
        }
        const selected=detected===home.value?'':detected;
        note('Ενεργή αναγνώριση ευρύτερης ζώνης: '+(
          LOCATION_CHOICES.find(x=>x.id===detected)?.label||detected)+
          '. Η μόνιμη βάση συνεχίζει παράλληλα. Οι ακριβείς συντεταγμένες δεν αποστέλλονται.');
        if(temporary.value!==selected){temporary.value=selected;notify()}
      },
      err=>{
        stopTracking();
        note(err.code===1?'Δεν δόθηκε άδεια τοποθεσίας. Χρησιμοποίησε το χειροκίνητο πεδίο.':
          'Δεν ήταν δυνατός ο προσωρινός γεωεντοπισμός. Χρησιμοποίησε το χειροκίνητο πεδίο.');
      },
      {enableHighAccuracy:false,maximumAge:300000,timeout:15000}
    );
  };
  const onStop=()=>{
    stopTracking();
    if(temporary.value){temporary.value='';notify()}
    note('Η παρακολούθηση σταμάτησε. Ισχύει μόνο η μόνιμη βάση.');
  };
  const onVisibility=()=>{
    if(document.hidden&&gpsCurrent){
      stopTracking();
      note('Η τοποθεσία απενεργοποιήθηκε επειδή η καρτέλα δεν είναι ορατή. Μπορείς να την επανενεργοποιήσεις.');
    }
  };
  stop.disabled=true;
  home.addEventListener('change',onHome);
  temporary.addEventListener('change',onTemp);
  start.addEventListener('click',onStart);
  stop.addEventListener('click',onStop);
  document.addEventListener('visibilitychange',onVisibility);
  return {selection,stop:()=>{
    stopped=true;
    stopTracking();
    home.removeEventListener('change',onHome);
    temporary.removeEventListener('change',onTemp);
    start.removeEventListener('click',onStart);
    stop.removeEventListener('click',onStop);
    document.removeEventListener('visibilitychange',onVisibility);
  }};
}
