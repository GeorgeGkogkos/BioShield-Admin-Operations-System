/* BioShield sandbox-only public-procurement overlay.
 * Source: read-only, already public-safe /demo/evidence adapter.
 * Never read/plot bioshield_demo_research_records (private company contacts).
 * These are representative ADMINISTRATIVE POINTS, never work locations.
 * Explicitly known source-region labels only; unknown labels are omitted.
 */
const ADMIN_PLACES = Object.freeze({
  'Αττική — Πειραιάς':['Πειραιάς','Αττική',37.943,23.647],
  'Αττική — Πέραμα':['Πέραμα','Αττική',37.968,23.568],
  'Χαλκιδική':['Χαλκιδική (ενδεικτικό κέντρο)','Κεντρική Μακεδονία',40.371,23.438],
  'Θεσσαλονίκη':['Θεσσαλονίκη','Κεντρική Μακεδονία',40.641,22.943],
  'Αχαΐα':['Αχαΐα (ενδεικτικό κέντρο)','Δυτική Ελλάδα',38.249,21.735],
  'Πέλλα':['Πέλλα (ενδεικτικό κέντρο)','Κεντρική Μακεδονία',40.844,22.255],
  'Θεσσαλία — Ελασσόνα':['Ελασσόνα','Θεσσαλία',39.894,22.187],
  'Αττική — Περιστέρι':['Περιστέρι','Αττική',38.014,23.690],
  'Αττική — Αιγάλεω':['Αιγάλεω','Αττική',37.990,23.681],
  'Αττική — Μαρούσι':['Μαρούσι','Αττική',38.054,23.806],
  'Αττική — Αχαρνές':['Αχαρνές','Αττική',38.083,23.735],
  'Αττική — Σαλαμίνα':['Σαλαμίνα','Αττική',37.962,23.478],
  'Κορινθία':['Κορινθία (ενδεικτικό κέντρο)','Πελοπόννησος',37.938,22.928],
  'Λασίθι — Κρήτη':['Λασίθι (ενδεικτικό κέντρο)','Κρήτη',35.258,25.594],
  'Θεσπρωτία — Ηγουμενίτσα':['Ηγουμενίτσα','Ήπειρος',39.503,20.264],
  'Θεσσαλία — Λάρισα':['Λάρισα','Θεσσαλία',39.640,22.419],
  'Αττική — Άγιοι Ανάργυροι / Καματερό':['Άγιοι Ανάργυροι / Καματερό','Αττική',38.028,23.725],
  'Αττική — Ίλιον':['Ίλιον','Αττική',38.030,23.697],
  'Αττική':['Αττική (ενδεικτικό κέντρο)','Αττική',38.005,23.802],
  'Πελοπόννησος — Περιφέρεια (Π.Ε. Αργολίδας, Αρκαδίας και λοιπές)':['Πελοπόννησος (ενδεικτικό κέντρο)','Πελοπόννησος',37.570,22.420],
  'Ήπειρος — Πρέβεζα':['Πρέβεζα','Ήπειρος',38.960,20.751],
  'Δυτική Μακεδονία — Κοζάνη':['Κοζάνη','Δυτική Μακεδονία',40.303,21.787],
  'Ιόνια Νησιά — Κέρκυρα':['Κέρκυρα','Ιόνια Νησιά',39.625,19.921]
});

export function publicArchivePoints(pilot){
  if(pilot?.demo_supabase_connected!==true || !Array.isArray(pilot.tenders))return [];
  const seen=new Set();
  const points=[];
  for(const tender of pilot.tenders){
    if(!/^ORG-\d{3,}$/.test(tender?.id||'') ||
      tender?.audience_segment!=='public_sector' ||
      tender?.contact_eligible!==false ||
      typeof tender?.source_url!=='string' ||
      !tender.source_url.startsWith('https://'))continue;
    const place=ADMIN_PLACES[tender.region];
    if(!place || seen.has(tender.id) || !/^\d{4}-\d{2}-\d{2}$/.test(tender.published_on||''))continue;
    seen.add(tender.id);
    const words=String(tender.service||'').toLocaleLowerCase('el-GR');
    const service_codes=[];
    if(/απεντόμ|εντομοκτον|κουνουποκτον|κουνουπι/.test(words))service_codes.push('pest_control');
    if(/μυοκτον/.test(words))service_codes.push('rodent_control');
    if(/απολύμαν/.test(words))service_codes.push('disinfection');
    if(/φρεάτ|αποφράξ|εκκένωσ/.test(words))service_codes.push('drain_unblocking');
    const tedMatch=String(tender.notice_id||'').match(/\bTED\s+(\d{5,7}-20\d{2})\b/i);
    points.push({
      id:tender.id,notice_number:tender.id,
      ted_duplicate_number:tedMatch?.[1]||null,
      title:String(tender.service||tender.summary||'Δημόσια πρόσκληση').slice(0,320),
      buyer:String(tender.authority||'').slice(0,160),
      published_on:tender.published_on,
      source_url:tender.source_url,
      source_type:'demo_public_archive', source_label:'Αρχείο δημόσιας έρευνας',
      service_codes,audience_segment:'public_sector',
      region:place[1],location_text:place[0],
      latitude:place[2],longitude:place[3],
      location_basis:'buyer_only_not_work_site',
      precision:'representative_administrative_point',
      is_actual_work_site:false,contact_eligible:false,
      confidence:'archive_issuer_area_only',
      status_label:'Αρχειακή καταχώριση — η διαθεσιμότητα δεν έχει επαληθευτεί',
      source_region:tender.region
    });
  }
  return points;
}

export function geographicRows(report,pilot){
  const live=report?.status==='ok' && Array.isArray(report.points)
    ? report.points.filter(p=>p?.source_type==='ted' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map(p=>({...p,source_label:'Επίσημο TED (30 ημέρες)',status_label:'Επίσημη δημοσίευση · όχι επιβεβαιωμένη ενεργή ανάθεση'}))
    : [];
  const archived=publicArchivePoints(pilot);
  // Do not show two symbols for one tender replicated between official TED
  // and the manually collected sandbox archive.
  const officialIds=new Set(live.map(p=>p.notice_number));
  const combined=[...live,...archived.filter(p=>!p.ted_duplicate_number || !officialIds.has(p.ted_duplicate_number))];
  return {live,archived,combined};
}
