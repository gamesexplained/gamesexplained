// Shared behaviour: mark the active tab, and turn $XXXX inside <code> into links to the Source tab.
(function(){
  var seg=location.pathname.split('/').pop();
  var here=(seg&&seg.indexOf('.html')>-1)?seg:'index.html';   /* clean URLs land on the directory */
  document.querySelectorAll('.gametabs a.tab').forEach(function(a){
    var h=a.getAttribute('href')||'';
    if(h==='./')h='index.html';
    if(h===here) a.classList.add('on');
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
  if(document.body.dataset.nolink) return;
  document.querySelectorAll('code').forEach(function(c){
    if(c.closest('a')||c.closest('pre')||c.children.length) return;
    var t=c.textContent, m=/^\$([0-9A-Fa-f]{4})$/.exec(t.trim());
    if(!m) return;
    var a=document.createElement('a'); a.href='source.html#'+m[1].toUpperCase(); a.textContent=t;
    c.textContent=''; c.appendChild(a);
  });
})();
