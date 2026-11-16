import {GREECE_OUTLINE} from './greece-outline.js';
/* Interactive administrative coverage map of real published TED metadata only.
 * Marker location is NEVER a precise worksite, customer or incident address.
 * Leaflet / © OpenStreetMap contributors attribution must remain visible.
 */
const SERVICE_NAME={
  pest_control:'Απεντόμωση', rodent_control:'Μυοκτονία',
  disinfection:'Απολύμανση',plumbing:'Υδραυλικός',
  drain_unblocking:'Αποφράξεις'
};
const COLORS={
  pest_control:'#168269',rodent_control:'#d97706',
  disinfection:'#2563eb',plumbing:'#7950ba',
  drain_unblocking:'#dc3545'
};
const safeTxt=v=>String(v==null?'':v);
export function coverageMarkup(report,esc){
  if(report?.status!=='ok')return '<div class="bio-demo-offline"><strong>Δεν είναι διαθέσιμα επαληθευμένα γεωγραφικά δεδομένα.</strong>'+
    '<p>Ο επίσημος πάροχος TED δεν επέστρεψε επιτυχημένη απάντηση. Δεν προβάλλονται παλιά δεδομένα ως νέες τοποθεσίες.</p>'+
    '<button type="button" class="bio-open-lab" id="bio-map-refresh">Επανάληψη</button></div>';
  const count=report.mapped_notice_count||0;
  const regions=report.regions||[];
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">GEOGRAPHIC COVERAGE / VERIFIED SOURCES</p>',
    '<h2>Χάρτης πηγών και ερευνητική κάλυψη</h2>',
    '<p class="bio-muted">Στίγματα δημόσιων προκηρύξεων με ρητή γεωγραφική αναφορά.',
    ' Οι συντεταγμένες είναι <strong>ενδεικτικά κέντρα διοικητικών περιοχών ή έδρες φορέων</strong> — όχι ακριβή σημεία εργασιών, συμβάντων ή πελατών.</p></div>',
    '<span class="bio-test-badge">TED · 30 ΗΜΕΡΕΣ</span></div>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric"><span>Στίγματα πηγών</span><strong>',esc(count),'</strong><small>Διοικητική θέση, όχι εργοτάξιο</small></article>',
    '<article class="bio-metric"><span>Χωρίς επαρκή γεωγραφική αναφορά</span><strong>',esc(report.unlocated_notice_count),'</strong><small>Δεν τοποθετήθηκαν αυθαίρετα</small></article>',
    '<article class="bio-metric"><span>Περιφέρειες χωρίς καταγραφή TED</span><strong>',esc(report.zero_observed_regions),'</strong><small>Όχι απόδειξη ανυπαρξίας ζήτησης</small></article>',
    '</div>',
    '<div class="bio-lab-filter bio-service-filter">',
    '<label for="bio-map-service">Υπηρεσία</label><select id="bio-map-service"><option value="all">Όλες</option>',
    ...Object.keys(SERVICE_NAME).map(x=>'<option value="'+x+'">'+esc(SERVICE_NAME[x])+'</option>'),
    '</select><label for="bio-map-region">Περιοχή</label>',
    '<select id="bio-map-region"><option value="all">Όλη η Ελλάδα</option>',
    ...regions.map(r=>'<option value="'+esc(r.region)+'">'+esc(r.region)+'</option>'),
    '</select><label for="bio-map-days">Χρόνος</label>',
    '<select id="bio-map-days"><option value="30">Τελευταίες 30 ημέρες</option><option value="7">Τελευταίες 7 ημέρες</option></select>',
    '<span id="bio-map-count" role="status"></span></div>',
    '<div class="bio-coverage-layout">',
    '<div class="bio-map-host"><div id="bio-coverage-map" class="bio-map-canvas" role="region" aria-label="Χάρτης γεωγραφικής κάλυψης πραγματικών πηγών TED">',
    '<p>Φόρτωση χάρτη…</p></div>',
    '<p class="bio-note">Ενδεικτικό γεωγραφικό περίγραμμα από <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth (public domain)</a>. ',
    'Διακριτό στίγμα για έδρα φορέα όταν δεν έχει αναφερθεί ο τόπος εκτέλεσης.</p></div>',
    '<aside class="bio-coverage-list"><h3>Περιοχές για περαιτέρω έρευνα</h3>',
    '<p class="bio-note">Καταμετρούνται μόνο δημοσιεύσεις του TED με αποδεκτή γεωγραφική ένδειξη μέσα στις τελευταίες 30 ημέρες. ',
    '<strong>Το μηδέν δεν σημαίνει μηδενική πραγματική ζήτηση.</strong></p>',
    '<div class="bio-coverage-rows">',
    ...regions.map(r=>'<div class="bio-coverage-row"><span>'+esc(r.region)+'</span><strong>'+esc(r.observed_count)+'</strong></div>'),
    '</div></aside></div>',
    '<div id="bio-map-locations" class="bio-real-map-locations" aria-live="polite"></div>',
    '<p class="bio-note"><strong>Όριο ερμηνείας:</strong> Οι γεωγραφικές αναφορές προκύπτουν μόνο από τον τίτλο προκήρυξης ή από σαφώς δηλωμένο φορέα. ',
    'Τοποθεσίες που προκύπτουν μόνο από τον φορέα σημαίνονται ως «Έδρα φορέα, όχι βεβαιωμένος τόπος έργου». ',
    'Χωρίς τεκμηριωμένη αναφορά δεν δημιουργείται pin. Δεν εμφανίζονται ακριβείς ιδιωτικές διευθύνσεις.</p>',
  ].join('');
}

const NS='http://www.w3.org/2000/svg';
const WIDTH=800, HEIGHT=510;
function createSvg(tag,attrs={}){
  const el=document.createElementNS(NS,tag);
  for(const [name,val] of Object.entries(attrs))el.setAttribute(name,String(val));
  return el;
}
function projected(lon,lat){
  // Equirectangular projection over a bounded Greece-only viewport.
  return [Math.round((lon-18.4)/12.5*WIDTH*100)/100,
          Math.round((42.0-lat)/7.6*HEIGHT*100)/100];
}
function addOutline(svg){
  const polygons=GREECE_OUTLINE.type==='MultiPolygon'?
    GREECE_OUTLINE.coordinates:[GREECE_OUTLINE.coordinates];
  for(const poly of polygons){
    for(const ring of poly){
      if(!Array.isArray(ring)||ring.length<3)continue;
      const d=ring.map((xy,i)=>{
        const p=projected(xy[0],xy[1]);
        return (i?'L':'M')+p[0]+' '+p[1];
      }).join(' ')+' Z';
      svg.append(createSvg('path',{d,fill:'#dce9dd',stroke:'#748f87',
        'stroke-width':1.6,'fill-rule':'evenodd'}));
    }
  }
}
export function setupCoverageMap(panel, report,esc){
  const container=panel.querySelector('#bio-coverage-map');
  if(!container||report?.status!=='ok')return ()=>{};
  container.textContent='';
  container.setAttribute('aria-label','Διαδραστικός διανυσματικός χάρτης Ελλάδας με ενδεικτικά διοικητικά στίγματα TED');
  const svg=createSvg('svg',{viewBox:'0 0 '+WIDTH+' '+HEIGHT,
    class:'bio-map-svg',role:'img','aria-label':'Σχηματικός γεωγραφικός χάρτης Ελλάδας με επιλεγόμενα στίγματα'});
  svg.append(createSvg('rect',{x:0,y:0,width:WIDTH,height:HEIGHT,fill:'#e9f3f7'}));
  for(let lat=35;lat<=42;lat++){
    const y=projected(20,lat)[1];
    svg.append(createSvg('line',{x1:0,y1:y,x2:WIDTH,y2:y,stroke:'#cbdde4',
      'stroke-width':.6,'stroke-dasharray':'4 5'}));
  }
  for(let lon=20;lon<=30;lon+=2){
    const x=projected(lon,36)[0];
    svg.append(createSvg('line',{x1:x,y1:0,x2:x,y2:HEIGHT,stroke:'#cbdde4',
      'stroke-width':.6,'stroke-dasharray':'4 5'}));
  }
  addOutline(svg);
  const label=createSvg('text',{x:260,y:155,'font-size':25,
    'font-weight':700,fill:'#4e7772',opacity:.5});
  label.textContent='ΕΛΛΑΔΑ';svg.append(label);
  const sea=createSvg('text',{x:520,y:160,'font-size':14,fill:'#88a6b0'});
  sea.textContent='Αιγαίο Πέλαγος';svg.append(sea);
  const pins=createSvg('g',{'aria-label':'Πηγές TED ανά περιοχή'});svg.append(pins);
  container.append(svg);
  const popup=document.createElement('div');popup.className='bio-map-selected';popup.hidden=true;
  container.append(popup);
  const controls=document.createElement('div');controls.className='bio-map-zoom';
  const plus=document.createElement('button');plus.type='button';plus.textContent='+';
  plus.setAttribute('aria-label','Μεγέθυνση χάρτη');
  const minus=document.createElement('button');minus.type='button';minus.textContent='−';
  minus.setAttribute('aria-label','Σμίκρυνση χάρτη');
  controls.append(plus,minus);container.append(controls);
  let zoom=1;
  function applyZoom(){
    const w=WIDTH/zoom,h=HEIGHT/zoom;
    svg.setAttribute('viewBox',[(WIDTH-w)/2,(HEIGHT-h)/2,w,h].join(' '));
  }
  plus.addEventListener('click',()=>{zoom=Math.min(3,zoom*1.3);applyZoom();});
  minus.addEventListener('click',()=>{zoom=Math.max(1,zoom/1.3);applyZoom();});
  const rows=report.points||[];
  function select(p){
    popup.textContent='';
    const title=document.createElement('strong');title.textContent=p.location_text;
    const note=document.createElement('p');
    note.textContent=(p.location_basis==='buyer_only_not_work_site'?
      'Έδρα φορέα, όχι βεβαιωμένος τόπος εκτέλεσης.':
      'Ενδεικτικό διοικητικό σημείο, όχι ακριβής θέση έργου.')+
      ' Δημοσίευση: '+p.published_on;
    const detail=document.createElement('p');detail.textContent=p.title;
    const link=document.createElement('a');
    link.href=p.source_url;link.textContent='TED '+p.notice_number;
    link.target='_blank';link.rel='noopener noreferrer';
    const close=document.createElement('button');close.type='button';close.textContent='×';
    close.setAttribute('aria-label','Κλείσιμο πληροφορίας χάρτη');
    close.addEventListener('click',()=>{popup.hidden=true;});
    popup.append(close,title,note,detail,link);popup.hidden=false;
  }
  function draw(){
    pins.replaceChildren();popup.hidden=true;
    const service=panel.querySelector('#bio-map-service')?.value||'all';
    const region=panel.querySelector('#bio-map-region')?.value||'all';
    const days=Number(panel.querySelector('#bio-map-days')?.value||30);
    const cutoff=new Date(Date.now()-days*86400000);
    const selected=rows.filter(p=>{
      const when=new Date(p.published_on+'T00:00:00Z');
      return !Number.isNaN(when.getTime())&&when>=cutoff&&
        (service==='all'||(p.service_codes||[]).includes(service))&&
        (region==='all'||p.region===region);
    });
    for(const p of selected){
      if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))continue;
      const [x,y]=projected(p.longitude,p.latitude);
      const shade=COLORS[(p.service_codes||[])[0]]||'#0f766e';
      const issuer=p.location_basis==='buyer_only_not_work_site';
      const ring=createSvg('circle',{cx:x,cy:y,r:issuer?12:13,fill:shade,
        'fill-opacity':issuer ? 0.35 : 0.84,stroke:shade,'stroke-width':2,
        'stroke-dasharray':issuer?'4 3':'none',tabindex:0,role:'button',
        'aria-label':p.location_text+' — TED '+p.notice_number});
      ring.style.cursor='pointer';ring.addEventListener('click',()=>select(p));
      ring.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p);}
      });
      const tooltip=createSvg('title');tooltip.textContent=p.location_text+' — '+p.notice_number;
      ring.append(tooltip);pins.append(ring);
      const text=createSvg('text',{x:x+13,y:y-13,'font-size':13,
        'font-weight':600,fill:'#184b57'});
      text.textContent=p.location_text;pins.append(text);
    }
    const count=panel.querySelector('#bio-map-count');
    if(count)count.textContent=selected.length+' από '+rows.length+' στίγματα';
    const list=panel.querySelector('#bio-map-locations');
    if(list)list.innerHTML=selected.map(p=>
      '<div class="bio-coverage-source"><strong>'+esc(p.location_text)+'</strong> · '+
      esc(p.published_on)+' · '+esc((p.service_codes||[]).map(s=>SERVICE_NAME[s]||s).join(', '))+
      ' <a href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">TED '+esc(p.notice_number)+'</a>'+
      '<small>'+esc(p.location_basis==='buyer_only_not_work_site'?
        'Έδρα φορέα, όχι θέση έργου':'Διοικητικό σημείο αναφοράς, όχι θέση έργου')+'</small></div>'
    ).join('')||'<p class="bio-note">Δεν υπάρχουν στίγματα για τα επιλεγμένα κριτήρια.</p>';
  }
  const onChange=e=>{
    if(['bio-map-service','bio-map-region','bio-map-days'].includes(e.target.id))draw();
  };
  panel.addEventListener('change',onChange);
  draw();
  return ()=>{panel.removeEventListener('change',onChange);};
}
