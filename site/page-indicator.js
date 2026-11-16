/* Shared pagination: stretch the leading edge, then let the trailing edge catch up. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function mount(rail,{buttonSelector,loop=false}){
  const buttons=[...rail.querySelectorAll(buttonSelector)],count=buttons.length;
  rail.classList.add('page-indicator');
  const worms=Array.from({length:loop?3:1},()=>{
   const span=document.createElement('span');span.className='page-indicator-worm';span.setAttribute('aria-hidden','true');rail.append(span);return span;
  });
  let position=0;
  function update(value=position){
   if(!Number.isFinite(value))return;
   position=value;if(!rail.clientWidth||!count)return;
   let progress=loop?((value%count)+count)%count:Math.max(0,Math.min(count-1,value));
   if(reduced.matches)progress=loop?Math.round(progress)%count:Math.round(progress);
   const index=Math.floor(progress),fraction=progress-index;
   const step=count>1?buttons[1].offsetLeft-buttons[0].offsetLeft:16;
   const origin=buttons[0].offsetLeft+buttons[0].offsetWidth/2;
   const size=5,head=Math.min(1,fraction*2),tail=Math.max(0,fraction*2-1);
   const left=origin+(index+tail)*step-size/2,width=size+(head-tail)*step;
   worms.forEach((worm,i)=>{
    const shift=loop?(i-1)*count*step:0;
    worm.style.width=width+'px';worm.style.transform=`translate3d(${left+shift}px,-50%,0)`;
   });
  }
  new ResizeObserver(()=>update()).observe(rail);
  reduced.addEventListener('change',()=>update());
  update();return{update};
 }
 window.esprintPageIndicator={mount};
})();
