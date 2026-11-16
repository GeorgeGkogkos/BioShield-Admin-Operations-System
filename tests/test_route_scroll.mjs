import test from 'node:test';
import assert from 'node:assert/strict';
import {installNavigation,ROUTES,currentScreen} from '../static/typed/navigation.js';

test('search-first navigation preserves shell scroll and redirects old data pages',()=>{
  const browserEvents=new Map();
  class FakeElement {
    constructor(screen){this.dataset={bioTab:screen};}
    closest(selector){return selector==='[data-bio-tab]'?this:null;}
  }
  const makeHost=()=>({
    handlers:new Map(),
    addEventListener(type,handler){this.handlers.set(type,handler);},
    removeEventListener(type){this.handlers.delete(type);},
    contains(el){return el instanceof FakeElement;},
  });
  const side=makeHost(),bottom=makeHost(),page=makeHost();
  page.querySelector=()=>({setAttribute(){}});
  page.contains=()=>false;
  const scrollCalls=[],screens=[];
  const location={pathname:ROUTES.discovery,search:''};
  const history={
    scrollRestoration:'auto',
    pushState(_state,_title,url){location.pathname=url;},
  };
  globalThis.Element=FakeElement;
  globalThis.document={
    documentElement:{dataset:{}},
    title:'',
    getElementById(id){return id==='bio-shell-nav'?side:id==='bio-bottom-nav'?bottom:null;},
  };
  globalThis.window={
    location,history,
    scrollTo(...args){scrollCalls.push(args);},
    addEventListener(type,handler){browserEvents.set(type,handler);},
    removeEventListener(type){browserEvents.delete(type);},
  };
  const cleanup=installNavigation(page,screen=>screens.push(screen));
  assert.deepEqual(screens,['discovery']);
  assert.deepEqual(scrollCalls,[],'initial search must not scroll');
  assert.equal(history.scrollRestoration,'manual');

  function click(host,screen){
    const event={
      target:new FakeElement(screen),button:0,defaultPrevented:false,
      metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,
      preventDefault(){this.defaultPrevented=true;},
    };
    host.handlers.get('click')(event);
    assert.equal(event.defaultPrevented,true);
  }
  click(side,'sources');
  assert.equal(location.pathname,ROUTES.sources);
  assert.deepEqual(scrollCalls,[[0,0]]);
  click(side,'sources');
  assert.equal(scrollCalls.length,1,'reselecting active info page should not scroll');
  click(side,'status');
  assert.equal(location.pathname,ROUTES.status);
  assert.deepEqual(scrollCalls,[[0,0],[0,0]]);
  location.pathname=ROUTES.overview;
  browserEvents.get('popstate')();
  assert.equal(screens.at(-1),'discovery','old overview link uses the search');
  assert.deepEqual(scrollCalls,[[0,0],[0,0],[0,0]]);
  click(bottom,'map');
  assert.equal(location.pathname,ROUTES.discovery,'old map tab becomes an in-search view');
  assert.equal(screens.at(-1),'discovery');
  assert.equal(currentScreen({pathname:ROUTES.pilot,search:''}),'discovery');
  cleanup();
  assert.equal(browserEvents.has('popstate'),false);
});
