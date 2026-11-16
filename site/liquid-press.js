/* Shared glass press: independent scale preserves existing transforms and layout. */
(() => {
 const root=document.getElementById('phone');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),states=new Map();
 const selector='button,[role="button"],.template-large,.print-setting .row:first-child';
 let pointer=null,key=null;
 function target(node){
  const el=node instanceof Element?node.closest(selector):null;
  return el&&root.contains(el)&&!el.closest('.canvas-wrap,.print-preview-workspace,[data-liquid-press="off"]')?el:null;
 }
 function available(el){return el.isConnected&&!el.matches(':disabled,[aria-disabled="true"]')&&!el.closest('[inert],[hidden]')&&el.getClientRects().length>0}
 function currentScale(el){
  const values=getComputedStyle(el).scale.split(/\s+/).map(Number);
  return Number.isFinite(values[0])?[values[0],values[1]??values[0]]:[1,1];
 }
 function clear(el){
  const state=states.get(el);if(!state)return;
  states.delete(el);state.animation?.cancel();el.classList.remove('glass-pressed','glass-settling');
 }
 function press(el){
  if(reduced.matches||!available(el))return;
  const from=currentScale(el);clear(el);
  // Round controls grow uniformly; wide controls gently thicken like liquid glass.
  const width=el.offsetWidth||el.getBoundingClientRect().width,height=el.offsetHeight||el.getBoundingClientRect().height;
  let x=1+Math.min(.14,8/width),y=1+Math.min(.14,5/height);
  if(width/height<1.5&&height/width<1.5)x=y=Math.min(x,y);
  const animation=el.animate([{scale:from.join(' ')},{scale:`${x} ${y}`}],{duration:160,easing:'cubic-bezier(.2,.75,.25,1)',fill:'forwards'});
  states.set(el,{animation});el.classList.add('glass-pressed');
 }
 function release(el,cancelled=false){
  if(!states.has(el))return;
  if(reduced.matches||!available(el)){clear(el);return}
  const [x,y]=currentScale(el);clear(el);
  const duration=cancelled?260:540,frames=[];
  for(let i=0;i<=36;i++){
   const t=i/36*(duration/1000),decay=cancelled?18:12,frequency=cancelled?12:18;
   const spring=i===36?0:Math.exp(-decay*t)*(Math.cos(frequency*t)+decay/frequency*Math.sin(frequency*t));
   frames.push({offset:i/36,scale:`${1+(x-1)*spring} ${1+(y-1)*spring}`});
  }
  const animation=el.animate(frames,{duration,easing:'linear'});
  states.set(el,{animation});el.classList.add('glass-settling');
  animation.onfinish=()=>{if(states.get(el)?.animation===animation)clear(el)};
 }
 function cancelPointer(){if(pointer){release(pointer.el,true);pointer=null}}
 function reset(){pointer=null;key=null;for(const el of [...states.keys()])clear(el)}
 root.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  cancelPointer();const el=target(event.target);if(!el||!available(el))return;
  pointer={el,id:event.pointerId,x:event.clientX,y:event.clientY};press(el);
 },{capture:true,passive:true});
 document.addEventListener('pointermove',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const {el,x,y}=pointer,rect=el.getBoundingClientRect();
  if(Math.hypot(event.clientX-x,event.clientY-y)>10||event.clientX<rect.left-4||event.clientX>rect.right+4||event.clientY<rect.top-4||event.clientY>rect.bottom+4)cancelPointer();
 },{capture:true,passive:true});
 document.addEventListener('pointerup',event=>{if(pointer?.id===event.pointerId){release(pointer.el);pointer=null}},{capture:true,passive:true});
 document.addEventListener('pointercancel',event=>{if(pointer?.id===event.pointerId)cancelPointer()},{capture:true,passive:true});
 root.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')cancelPointer()},{passive:true});
 root.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key)||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
  const el=target(event.target);if(!el||!available(el))return;
  if(key)release(key.el,true);key={el,value:event.key};press(el);
 },true);
 document.addEventListener('keyup',event=>{if(key?.value===event.key){release(key.el);key=null}},true);
 root.addEventListener('focusout',event=>{if(key?.el===event.target){release(key.el,true);key=null}},true);
 root.addEventListener('scroll',cancelPointer,{capture:true,passive:true});
 window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
 reduced.addEventListener('change',reset);
 // Navigation, disabled states and replaced dialog contents must never retain a press.
 new MutationObserver(()=>{
  for(const el of [...states.keys()])if(!available(el)){clear(el);if(pointer?.el===el)pointer=null;if(key?.el===el)key=null}
 }).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled','aria-disabled','inert']});
})();
