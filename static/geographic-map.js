import {geographicRows} from './geographic-archive.js';
/* BIO-18: Real OpenStreetMap basemap via self-hosted Leaflet.
 * Coordinates are indicative administrative areas or issuing-authority seats,
 * NEVER verified worksite locations. Only viewport tiles are loaded.
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
export function coverageMarkup(report,esc,pilot){
  const combined=geographicRows(report,pilot);
  if(report?.status!=='ok' && !combined.combined.length)return '<div class="bio-demo-offline"><strong>Δεν είναι διαθέσιμα επαληθευμένα γεωγραφικά δεδομένα.</strong>'+
    '<p>Ο επίσημος πάροχος TED δεν επέστρεψε επιτυχημένη απάντηση. Δεν προβάλλονται παλιά δεδομένα ως νέες τοποθεσίες.</p>'+
    '<button type="button" class="bio-open-lab" id="bio-map-refresh">Επανάληψη</button></div>';
  const count=combined.combined.length;
  const regions=report?.regions||[];
  const mapRegions=[...new Set([...regions.map(r=>r.region), ...combined.combined.map(p=>p.region)])].sort((a,b)=>a.localeCompare(b,'el'));
  const tedAvailable=report?.status==='ok';
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">GEOGRAPHIC COVERAGE / VERIFIED SOURCES</p>',
    '<h2>Χάρτης πηγών και ερευνητική κάλυψη</h2>',
    '<p class="bio-muted">Στίγματα δημόσιων προκηρύξεων με ρητή γεωγραφική αναφορά.',
    ' Οι συντεταγμένες είναι <strong>ενδεικτικά κέντρα διοικητικών περιοχών ή έδρες φορέων</strong> — όχι ακριβή σημεία εργασιών, συμβάντων ή πελατών.</p></div>',
    '<span class="bio-test-badge">TED + ΔΗΜΟΣΙΟ ΑΡΧΕΙΟ DEMO</span></div>',
    '<p class="bio-note">',tedAvailable?'Επίσημο TED τελευταίων 30 ημερών και ξεχωριστό αρχείο δημόσιων προσκλήσεων από τη δοκιμαστική Supabase.':'Το επίσημο TED δεν είναι διαθέσιμο. Εμφανίζεται μόνο το αποθηκευμένο δημόσιο αρχείο.',
    ' Οι αρχειακές προσκλήσεις δεν αποτελούν επιβεβαιωμένες διαθέσιμες εργασίες. Οι ιδιωτικές επιχειρήσεις και τα προσωπικά στοιχεία δεν προβάλλονται στον δημόσιο χάρτη.</p>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric"><span>Στίγματα πηγών</span><strong>',esc(count),'</strong><small>Διοικητική θέση, όχι εργοτάξιο</small></article>',
    '<article class="bio-metric"><span>Χωρίς επαρκή γεωγραφική αναφορά</span><strong>',esc(tedAvailable?report.unlocated_notice_count:'—'),'</strong><small>Δεν τοποθετήθηκαν αυθαίρετα</small></article>',
    '<article class="bio-metric"><span>Περιφέρειες χωρίς καταγραφή TED</span><strong>',esc(tedAvailable?report.zero_observed_regions:'—'),'</strong><small>Όχι απόδειξη ανυπαρξίας ζήτησης</small></article>',
    '</div>',
    '<div class="bio-lab-filter bio-service-filter bio-map-filters" role="group" aria-label="Φίλτρα χάρτη">',
    '<div class="bio-map-filter-field"><label for="bio-map-service">Υπηρεσία</label><select id="bio-map-service"><option value="all">Όλες</option>',
    ...Object.keys(SERVICE_NAME).map(x=>'<option value="'+x+'">'+esc(SERVICE_NAME[x])+'</option>'),
    '</select></div><div class="bio-map-filter-field"><label for="bio-map-region">Περιοχή</label>',
    '<select id="bio-map-region"><option value="all">Όλη η Ελλάδα</option>',
    ...mapRegions.map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>'),
    '</select></div><div class="bio-map-filter-field"><label for="bio-map-source">Πηγή</label>',
    '<select id="bio-map-source"><option value="all">Όλες οι δημόσιες πηγές</option>',
    '<option value="ted">Επίσημο TED</option><option value="demo_public_archive">Αρχείο δοκιμαστικής βάσης</option></select>',
    '</div><div class="bio-map-filter-field"><label for="bio-map-days">Χρόνος</label>',
    '<select id="bio-map-days"><option value="30">Τελευταίες 30 ημέρες</option><option value="7">Τελευταίες 7 ημέρες</option><option value="all">Όλο το διαθέσιμο αρχείο</option></select>',
    '</div><span id="bio-map-count" role="status" aria-live="polite"></span></div>',
    '<div class="bio-coverage-layout">',
    '<div class="bio-map-host"><div id="bio-coverage-map" class="bio-map-canvas" role="region" aria-label="Χάρτης γεωγραφικής κάλυψης πραγματικών πηγών TED">',
    '<p role="status">Φόρτωση κανονικού διαδραστικού χάρτη…</p></div>',
    '<p class="bio-note">Χαρτογραφικά δεδομένα: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>. ',
    'Τα δεδομένα TED τοποθετούνται ενδεικτικά ανά διοικητική περιοχή· η έδρα ενός φορέα δεν ταυτίζεται με την περιοχή εκτέλεσης.</p></div>',
    '<aside class="bio-coverage-list"><h3>Περιοχές για περαιτέρω έρευνα</h3>',
    '<p class="bio-note">Οι αριθμοί ανά περιφέρεια εδώ αφορούν <strong>μόνο TED</strong>, όχι τις καταχωρίσεις του δημόσιου demo αρχείου. ',
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

function popupContent(p){
  const wrapper=document.createElement('div');
  wrapper.className='bio-map-popup';
  const title=document.createElement('strong');title.textContent=p.location_text;
  const caution=document.createElement('p');
  caution.className='bio-map-popup-warning';
  caution.textContent=p.location_basis==='buyer_only_not_work_site'?
    'Έδρα φορέα — δεν έχει επιβεβαιωθεί ο τόπος εκτέλεσης του έργου':
    'Ενδεικτικό κέντρο διοικητικής περιοχής — όχι πραγματικές συντεταγμένες έργου';
  const date=document.createElement('p');date.textContent='Δημοσίευση: '+p.published_on;
  const detail=document.createElement('p');detail.textContent=p.title;
  const status=document.createElement('p');status.textContent=p.status_label||'';
  const link=document.createElement('a');link.href=p.source_url;
  link.target='_blank';link.rel='noopener noreferrer';
  link.textContent=p.source_type==='ted'?'Επίσημη δημοσίευση TED '+p.notice_number:'Πηγή αρχείου '+p.notice_number;
  wrapper.append(title,caution,date,detail,status,link);
  return wrapper;
}
function renderSourceList(panel,selected,rows,esc){
  const count=panel.querySelector('#bio-map-count');
  if(count)count.textContent=selected.length+' από '+rows.length+' στίγματα';
  const list=panel.querySelector('#bio-map-locations');
  if(!list)return;
  list.innerHTML=selected.map(p=>
    '<div class="bio-coverage-source"><strong>'+esc(p.location_text)+'</strong> · '+
    esc(p.published_on)+' · '+esc((p.service_codes||[]).map(s=>SERVICE_NAME[s]||s).join(', '))+
    ' <a href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.source_type==='ted'?'TED ':'Αρχείο ')+esc(p.notice_number)+'</a>' +
    '<small>'+esc(p.location_basis==='buyer_only_not_work_site'?
      'Έδρα φορέα, όχι θέση έργου':'Διοικητικό σημείο αναφοράς, όχι θέση έργου')+'</small></div>'
  ).join('')||'<p class="bio-note">Δεν υπάρχουν στίγματα για τα επιλεγμένα κριτήρια.</p>';
}
export function setupCoverageMap(panel,report,esc,pilot){
  const container=panel.querySelector('#bio-coverage-map');
  const sourceRows=geographicRows(report,pilot);
  if(!container||(report?.status!=='ok'&&!sourceRows.combined.length))return ()=>{};
  const rows=sourceRows.combined;
  container.textContent='';
  container.setAttribute('aria-label','Πραγματικός διαδραστικός χάρτης OpenStreetMap της Ελλάδας με ενδεικτικά στίγματα TED');
  const lib=window.L;
  if(!lib||typeof lib.map!=='function'){
    const note=document.createElement('p');
    note.className='bio-map-error';
    note.textContent='Η χαρτογραφική βιβλιοθήκη δεν φορτώθηκε. Τα επαληθευμένα ευρήματα εμφανίζονται παρακάτω.';
    const link=document.createElement('a');
    link.href='https://www.openstreetmap.org/#map=6/38.5/24.5';
    link.target='_blank';link.rel='noopener noreferrer';
    link.textContent='Άνοιγμα πραγματικού χάρτη OpenStreetMap';
    container.append(note,link);
    renderSourceList(panel,rows,rows,esc);
    return ()=>{};
  }
  // Load only tiles viewed by the user. No offline download, bulk prefetch or
  // proxy. Browser manages HTTP cache and automatically sends Referer.
  const mobileViewport=window.matchMedia('(max-width: 640px)');
  const map=lib.map(container,{
    zoomControl:false,scrollWheelZoom:false,zoomSnap:0.5,zoomDelta:0.5,
    minZoom:5,maxZoom:17,worldCopyJump:false,preferCanvas:true
  }).setView([38.35,24.2],6);
  // Keep the zoom buttons away from the selected-point card on phones.
  const zoomControl=lib.control.zoom({
    position:mobileViewport.matches?'topright':'topleft'
  }).addTo(map);
  const tiles=lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    minZoom:5,maxZoom:17,maxNativeZoom:17,detectRetina:false,
    updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1
  }).addTo(map);
  const sourceLayer=lib.layerGroup().addTo(map);
  let hadTile=false,tileErrors=0;
  let tileWaitTimeout;
  const failed=document.createElement('div');
  failed.className='bio-map-tiles-error';
  failed.hidden=true;
  failed.setAttribute('role','status');
  failed.textContent='Δεν φορτώνεται προσωρινά το χαρτογραφικό υπόβαθρο. Τα επαληθευμένα στίγματα και οι πηγές παραμένουν διαθέσιμα.';
  const ext=document.createElement('a');
  ext.href='https://www.openstreetmap.org/#map=6/38.35/24.2';
  ext.target='_blank';ext.rel='noopener noreferrer';
  ext.textContent='Άνοιγμα χάρτη OpenStreetMap';
  failed.append(document.createTextNode(' '),ext);
  container.append(failed);
  // A Leaflet popup can overflow or be clipped by the map on narrow phones.
  // Show the same verified source details inside a scrollable in-map card.
  const mobileDetail=document.createElement('aside');
  mobileDetail.className='bio-map-mobile-detail';
  mobileDetail.hidden=true;
  mobileDetail.setAttribute('role','region');
  mobileDetail.setAttribute('aria-label','Πληροφορίες επιλεγμένου στίγματος');
  mobileDetail.setAttribute('aria-live','polite');
  const closeDetailButton=document.createElement('button');
  closeDetailButton.type='button';
  closeDetailButton.className='bio-map-mobile-close';
  closeDetailButton.setAttribute('aria-label','Κλείσιμο πληροφοριών σημείου');
  closeDetailButton.textContent='×';
  const detailBody=document.createElement('div');
  detailBody.className='bio-map-mobile-detail-body';
  mobileDetail.append(closeDetailButton,detailBody);
  container.append(mobileDetail);
  lib.DomEvent.disableClickPropagation(mobileDetail);
  lib.DomEvent.disableScrollPropagation(mobileDetail);
  function hideDetail(){
    mobileDetail.hidden=true;
    detailBody.replaceChildren();
  }
  closeDetailButton.addEventListener('click',hideDetail);
  const onDetailKeydown=event=>{
    if(event.key==='Escape'&&!mobileDetail.hidden)hideDetail();
  };
  container.addEventListener('keydown',onDetailKeydown);
  map.on('click',hideDetail);
  tiles.on('tileload',()=>{hadTile=true;failed.hidden=true;});
  // Fail visibly when images are entirely absent (some browsers block map
  // images without even reporting tileerror). Never display blank as success.
  tileWaitTimeout=setTimeout(()=>{
    if(!hadTile)failed.hidden=false;
  },4000);
  tiles.on('tileerror',()=>{
    tileErrors++;
    if(!hadTile&&tileErrors>=3)failed.hidden=false;
  });
  const sourceMarkers=[];
  function draw(){
    hideDetail();
    map.closePopup();
    sourceLayer.clearLayers();
    sourceMarkers.length=0;
    const service=panel.querySelector('#bio-map-service')?.value||'all';
    const region=panel.querySelector('#bio-map-region')?.value||'all';
    const dateChoice=panel.querySelector('#bio-map-days')?.value||'30';
    const source=panel.querySelector('#bio-map-source')?.value||'all';
    const days=dateChoice==='all'?null:Number(dateChoice);
    const cutoff=days===null?null:new Date(Date.now()-days*86400000);
    const selected=rows.filter(p=>{
      const when=new Date(p.published_on+'T00:00:00Z');
      return !Number.isNaN(when.getTime())&&(!cutoff||when>=cutoff)&&
        (service==='all'||(p.service_codes||[]).includes(service))&&
        (source==='all'||p.source_type===source)&&
        (region==='all'||p.region===region);
    });
    for(const p of selected){
      if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))continue;
      const issuer=p.location_basis==='buyer_only_not_work_site';
      const shade=COLORS[(p.service_codes||[])[0]]||'#0f766e';
      const marker=lib.circleMarker([p.latitude,p.longitude],{
        radius:issuer?9:11,color:shade,fillColor:shade,
        fillOpacity:issuer?0.40:0.85,weight:issuer?3:2,
        dashArray:issuer?'5 4':null,interactive:true,bubblingMouseEvents:false
      });
      if(mobileViewport.matches){
        marker.on('click',()=>{
          detailBody.replaceChildren(popupContent(p));
          mobileDetail.hidden=false;
        });
      }else{
        marker.bindPopup(popupContent(p),{
          maxWidth:Math.max(180,Math.min(350,container.clientWidth-52)),
          autoPan:true,autoPanPadding:[20,20],keepInView:true
        });
      }
      marker.bindTooltip(p.location_text,{direction:'top',offset:[0,-8]});
      marker.addTo(sourceLayer);
      sourceMarkers.push(marker);
    }
    if(sourceMarkers.length>=2){
      map.fitBounds(lib.featureGroup(sourceMarkers).getBounds(),{
        padding:[58,58],maxZoom:8,animate:false
      });
    }else if(sourceMarkers.length===1){
      const one=selected.find(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
      const maxzoom=one.precision==='region_representative_point'?7.5:8;
      if(one)map.setView([one.latitude,one.longitude],maxzoom,{animate:false});
    }else map.setView([38.35,24.2],6,{animate:false});
    renderSourceList(panel,selected,rows,esc);
    map.invalidateSize();
  }
  const onChange=e=>{
    if(['bio-map-service','bio-map-region','bio-map-source','bio-map-days'].includes(e.target.id))draw();
  };
  panel.addEventListener('change',onChange);
  const onViewportChange=()=>{
    zoomControl.setPosition(mobileViewport.matches?'topright':'topleft');
    draw();
  };
  if(mobileViewport.addEventListener)mobileViewport.addEventListener('change',onViewportChange);
  else mobileViewport.addListener(onViewportChange);
  // Leaflet otherwise keeps the previous tile layout after orientation changes.
  const resizeObserver=typeof ResizeObserver==='function'?
    new ResizeObserver(()=>map.invalidateSize({pan:false})):null;
  resizeObserver?.observe(container);
  draw();
  requestAnimationFrame(()=>map.invalidateSize({pan:false}));
  // A second layout pass handles tab visibility/size changes in slower
  // browsers. No tile prefetching: only the current visible viewport loads.
  const resizeTimeout=setTimeout(()=>map.invalidateSize({pan:false}),200);
  return ()=>{
    panel.removeEventListener('change',onChange);
    if(mobileViewport.removeEventListener)mobileViewport.removeEventListener('change',onViewportChange);
    else mobileViewport.removeListener(onViewportChange);
    resizeObserver?.disconnect();
    container.removeEventListener('keydown',onDetailKeydown);
    closeDetailButton.removeEventListener('click',hideDetail);
    map.off('click',hideDetail);
    clearTimeout(tileWaitTimeout);
    clearTimeout(resizeTimeout);
    tiles.off();
    map.remove();
  };
}
