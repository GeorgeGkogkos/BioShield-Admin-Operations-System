import test from 'node:test';
import assert from 'node:assert/strict';
import {installNavigation,ROUTES} from '../static/typed/navigation.js';

test('route changes reset scroll without moving shell or restoring stale offsets',()=>{
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
  const location={pathname:ROUTES.overview,search:''};
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
  assert.deepEqual(screens,['overview']);
  assert.deepEqual(scrollCalls,[],'initial render must not scroll');
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
  click(side,'discovery');
  assert.equal(location.pathname,ROUTES.discovery);
  assert.deepEqual(scrollCalls,[[0,0]]);
  click(side,'discovery');
  assert.equal(scrollCalls.length,1,'reselecting active page should not scroll');
  click(bottom,'map');
  assert.equal(location.pathname,ROUTES.map);
  assert.deepEqual(scrollCalls,[[0,0],[0,0]]);
  location.pathname=ROUTES.overview;
  browserEvents.get('popstate')();
  assert.equal(screens.at(-1),'overview');
  assert.deepEqual(scrollCalls,[[0,0],[0,0],[0,0]],'Back/Forward uses top of page too');
  cleanup();
  assert.equal(browserEvents.has('popstate'),false);
});
