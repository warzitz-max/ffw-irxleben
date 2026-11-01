(function(){
  var bar=document.querySelector('.bar');
  function s(){bar.classList.toggle('solid',scrollY>40)} s(); addEventListener('scroll',s,{passive:true});
  var b=document.querySelector('.burger'),n=document.querySelector('.nav');
  if(b){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o);b.textContent=o?'Schließen':'Menü'});
    n.addEventListener('click',function(e){if(e.target.tagName==='A'){n.classList.remove('open');b.textContent='Menü'}})}
  document.querySelectorAll('[data-strip]').forEach(function(w){
    var st=w.querySelector('.strip'),bar=w.querySelector('.progress i');
    function p(){var m=st.scrollWidth-st.clientWidth;bar.style.width=(20+80*(m?st.scrollLeft/m:1))+'%'}
    st.addEventListener('scroll',p,{passive:true}); p();
    w.querySelectorAll('[data-dir]').forEach(function(btn){btn.addEventListener('click',function(){
      st.scrollBy({left:btn.dataset.dir*Math.min(420,st.clientWidth*.8),behavior:'smooth'})})});
    var d=false,x0=0,l0=0;
    st.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;d=true;x0=e.clientX;l0=st.scrollLeft;st.style.scrollSnapType='none'});
    addEventListener('pointerup',function(){if(d){d=false;st.style.scrollSnapType=''}});
    addEventListener('pointermove',function(e){if(d)st.scrollLeft=l0-(e.clientX-x0)});
  });
  var f=document.querySelector('form[data-mail]');
  if(f)f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f),t='';
    d.forEach(function(v,k){t+=k+': '+v+'\n'});
    location.href='mailto:?subject='+encodeURIComponent(f.dataset.mail)+'&body='+encodeURIComponent(t)});
  document.querySelectorAll('[data-reveal]').forEach(function(el){
    if(!('IntersectionObserver' in window))return;
    var o=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');o.unobserve(x.target)}})},{threshold:.2});o.observe(el)});
})();
