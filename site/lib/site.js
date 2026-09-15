// Shared behaviour: mark the active tab, and turn $XXXX inside <code> into links to the Source tab.
(function(){
  var here=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.gametabs a.tab').forEach(function(a){
    if((a.getAttribute('href')||'')===here) a.classList.add('on');
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
