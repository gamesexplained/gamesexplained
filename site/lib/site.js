// Shared behaviour: mark the active tab, and turn $XXXX inside <code> into links to the Source tab.
// In a game of several parts an address belongs to one of them: an element's data-part="<id>" sends
// the addresses inside it to that part's Source page, and data-part="" links none of them.
(function(){
  var seg=location.pathname.split('/').pop();
  var here=(seg&&seg.indexOf('.html')>-1)?seg:'index.html';   /* clean URLs land on the directory */
  document.querySelectorAll('.gametabs a.tab').forEach(function(a){
    var h=a.getAttribute('href')||'';
    if(h==='./')h='index.html';
    if(h===here||(h==='source.html'&&/^source-.+\.html$/.test(here))) a.classList.add('on');   /* a part's Source page */
  });
  // a list that goes somewhere: the parts beside a listing (build.py, part_step)
  document.querySelectorAll('select[data-go]').forEach(function(s){
    s.addEventListener('change',function(){ if(s.value) location.href=s.value; });
  });
  document.querySelectorAll('button[data-copy]').forEach(function(b){
    var src=document.querySelector(b.dataset.copy); if(!src) return;
    b.addEventListener('click',function(){
      var text=src.textContent.trim(), done=function(){ b.textContent='Copied'; b.classList.add('did'); setTimeout(function(){ b.textContent='Copy'; b.classList.remove('did'); },1600); };
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done,function(){ select(); });
      else select();
      function select(){ var r=document.createRange(); r.selectNodeContents(src); var s=getSelection(); s.removeAllRanges(); s.addRange(r); try{ if(document.execCommand('copy')) done(); }catch(e){} }
    });
  });
  // platform chips on the home page: hide every card whose data-platform is not the chosen one
  document.querySelectorAll('.platforms a[data-filter]').forEach(function(a){
    a.addEventListener('click',function(ev){
      ev.preventDefault(); var f=a.dataset.filter;
      a.closest('.platforms').querySelectorAll('a').forEach(function(x){ x.classList.toggle('on',x===a); });
      document.querySelectorAll('[data-platform]').forEach(function(el){ el.classList.toggle('hidden',!!f&&el.dataset.platform!==f); });
    });
  });
  // About page: a # beside each section heading, shown on hover, links straight to that section
  document.querySelectorAll('.about h2[id]').forEach(function(h){
    var a=document.createElement('a'); a.className='hash'; a.href='#'+h.id; a.textContent='#';
    a.setAttribute('aria-label','Link to this section'); h.appendChild(a);
  });
  // Every tab but Source: the sections in the margin, listed by build.py. Mark the one being read and keep
  // it in view; below 1200px the list is a drawer, opened from a Contents button. A section or heading the
  // page's own script writes (a levels page drawn from the game's bytes) joins the list when it appears.
  var pn=document.querySelector('.pagenav');
  if(!pn) (function(){   // the Source tab: its index sticks beneath the tab bar, however many rows of tabs the game has
    var tabs=document.querySelector('.gametabs');
    function measure(){ if(tabs) document.documentElement.style.setProperty('--tabs-h',tabs.offsetHeight+'px'); }
    measure(); addEventListener('resize',measure);
  })();
  if(pn) (function(){
    var root=document.documentElement, tabs=document.querySelector('.gametabs'), list=pn.querySelector('ol');
    var cur=-2, busy=false, links=[], secs=[];
    var btn=document.createElement('button'), scrim=document.createElement('div');
    btn.type='button'; btn.className='pagenav-btn'; btn.setAttribute('aria-controls','pagenav'); btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h8"/></svg>Contents <span class="n"></span>';
    scrim.className='pagenav-scrim';
    document.body.appendChild(scrim); document.body.appendChild(btn);
    function open(on){
      root.classList.toggle('pagenav-open',on); btn.setAttribute('aria-expanded',String(on));
      if(on){ keep(true); var a=links[cur]||links[0]; if(a) a.focus({preventScroll:true}); }
    }
    btn.addEventListener('click',function(){ open(true); });
    scrim.addEventListener('click',function(){ open(false); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&root.classList.contains('pagenav-open')){ open(false); btn.focus(); } });
    pn.addEventListener('click',function(e){
      var a=e.target.closest('a'); if(!a) return;
      var id=decodeURIComponent(a.hash.slice(1)), el=id&&document.getElementById(id);
      var how=matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
      e.preventDefault(); open(false);
      if(el){ el.scrollIntoView({behavior:how,block:'start'}); history.replaceState(null,'','#'+id); }
      else{ scrollTo({top:0,behavior:how}); history.replaceState(null,'',location.pathname+location.search); }
    });
    function keep(force){   // scroll the list, not the page, to bring the marked section into view
      var a=links[cur]; if(!a||(!force&&pn.matches(':hover'))) return;
      var pr=pn.getBoundingClientRect(), ar=a.getBoundingClientRect();
      if(force||ar.top<pr.top+48||ar.bottom>pr.bottom-48) pn.scrollTop+=ar.top-pr.top-pr.height/3;
    }
    function spy(){
      busy=false;
      var line=(tabs?tabs.offsetHeight:0)+Math.min(200,innerHeight*.28), i=-1, k;
      for(k=0;k<secs.length;k++) if(secs[k]&&secs[k].getBoundingClientRect().top<=line) i=k;
      if(innerHeight+scrollY>=document.documentElement.scrollHeight-2)   // at the foot: the last section in sight
        for(k=secs.length-1;k>i;k--) if(secs[k]&&secs[k].getBoundingClientRect().top<innerHeight*.8){ i=k; break; }
      if(i===cur) return;
      cur=i;
      links.forEach(function(a,k){ a.classList.toggle('on',k===i); if(k===i) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
      btn.querySelector('.n').textContent=i<0?'':(i<9?'0':'')+(i+1)+'/'+links.length;
      keep(false);
    }
    function measure(){ if(tabs) root.style.setProperty('--tabs-h',tabs.offsetHeight+'px'); }
    function collect(){
      links=[].slice.call(list.querySelectorAll('a'));
      secs=links.map(function(a){ return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
      btn.hidden=!links.length; cur=-2;
    }
    // The page's outline read the way build.py reads it: each top-level section, by its first h2 or
    // its label, and every other h2 as an entry of its own. Nothing inside a block hidden with the page
    // editor (data-cut) is listed, as build.py lists none of it.
    function bare(el){ var c=el.cloneNode(true); [].forEach.call(c.querySelectorAll('.tag, .badge'),function(x){ x.remove(); }); return c.textContent.replace(/\s+/g,' ').trim(); }
    function slug(s){ return s.toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40).replace(/-+$/,''); }
    function outline(){
      var out=[], top=new Map();
      [].forEach.call(document.querySelectorAll('section, h2'),function(el){
        if(pn.contains(el)||el.closest('[data-cut]')) return;
        var s=el.tagName==='SECTION'?el:el.closest('section');
        while(s&&s.parentElement&&s.parentElement.closest('section')) s=s.parentElement.closest('section');
        if(el.tagName==='SECTION'){ if(s===el){ var e={el:el,h2:null}; out.push(e); top.set(el,e); } return; }
        var t=s&&top.get(s);
        if(t&&!t.h2) t.h2=el; else out.push({el:el,h2:el});
      });
      return out;
    }
    function entry(e){
      var fig=e.el.tagName==='SECTION'&&e.el.querySelector('.fig'), num='', label='', tag='';
      if(fig&&(!e.h2||fig.compareDocumentPosition(e.h2)&Node.DOCUMENT_POSITION_FOLLOWING)){
        var f=bare(fig), m=/^(\d+)\s*[·:.–—-]\s*(.*)$/.exec(f); num=m?m[1]:''; label=m?m[2]:f;
      }
      var head=(e.h2?bare(e.h2):'')||label, p=/^(bug|secret|music|sound)\s*:\s*/i.exec(head);
      if(p){ tag=p[1].toLowerCase(); head=head.slice(p[0].length); head=head.charAt(0).toUpperCase()+head.slice(1); }
      return {num:num,label:label,head:head,tag:tag};
    }
    function grow(){   // add what the page wrote after the build, in page order
      var have={}, prev=null, added=0;
      links.forEach(function(a){ have[decodeURIComponent(a.hash.slice(1))]=a.parentNode; });
      outline().forEach(function(e){
        if(e.el.id&&have[e.el.id]){ prev=have[e.el.id]; return; }
        var d=entry(e); if(!d.head) return;
        if(!e.el.id){ var base=slug(d.label||d.head)||'section', id=base, n=2; while(document.getElementById(id)) id=base+'-'+n++; e.el.id=id; }
        var li=document.createElement('li'), a=document.createElement('a'), num=document.createElement('span'), h=document.createElement('span');
        a.href='#'+e.el.id; num.className='n'; num.textContent=d.num; h.className='h';
        if(d.tag){ var k=document.createElement('span'); k.className='k '+d.tag; k.textContent=d.tag.charAt(0).toUpperCase()+d.tag.slice(1); h.appendChild(k); h.appendChild(document.createTextNode(' ')); }
        h.appendChild(document.createTextNode(d.head)); a.appendChild(num); a.appendChild(h); li.appendChild(a);
        list.insertBefore(li,prev?prev.nextSibling:list.firstChild); prev=have[e.el.id]=li; added++;
        if(location.hash==='#'+e.el.id&&scrollY<50) e.el.scrollIntoView();   // a link to it arrived before it did
      });
      if(added){ collect(); spy(); }
    }
    var H2=document.getElementsByTagName('h2'), SEC=document.getElementsByTagName('section'), count=-1, soon=0;
    function watch(){ soon=0; var n=H2.length+SEC.length; if(n!==count){ count=n; grow(); } }
    new MutationObserver(function(){ if(!soon) soon=setTimeout(watch,200); }).observe(document.body,{childList:true,subtree:true});
    addEventListener('scroll',function(){ if(!busy){ busy=true; requestAnimationFrame(spy); } },{passive:true});
    addEventListener('resize',function(){ measure(); cur=-2; spy(); });
    collect(); watch(); measure(); spy();
  })();
  if(document.body.dataset.nolink) return;
  document.querySelectorAll('code').forEach(function(c){
    if(c.closest('a')||c.closest('pre')||c.children.length) return;
    var t=c.textContent, m=/^\$([0-9A-Fa-f]{4})$/.exec(t.trim());
    if(!m) return;
    var d=c.closest('[data-part]'), page=d?(d.dataset.part?'source-'+d.dataset.part+'.html':''):'source.html';
    if(!page) return;
    var a=document.createElement('a'); a.href=page+'#'+m[1].toUpperCase(); a.textContent=t;
    a.dataset.auto='';   /* not in the source: the page editor leaves it out of what it saves */
    c.textContent=''; c.appendChild(a);
  });
})();
