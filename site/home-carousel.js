/* Local banner artwork, seamless wraparound, and pause while not in use. */
const homeBannerSlides=[
 {src:'assets/banners/everyday.svg',alt:'把生活的灵感，印成你的日常'},
 {src:'assets/banners/organize.svg',alt:'常用的标签，随手就能打印'},
 {src:'assets/banners/pdf.svg',alt:'从一份 PDF，到一张好标签'}
];
const homeCarousel={index:0,visual:2,position:2,timer:null,animation:null,moving:false,visible:true,hover:false,focus:false,pointer:null,reduced:matchMedia('(prefers-reduced-motion: reduce)')};
const homeBanner=document.querySelector('#home .home-banner');
homeBanner.classList.add('home-carousel');homeBanner.setAttribute('role','region');homeBanner.setAttribute('aria-roledescription','轮播图');homeBanner.setAttribute('aria-label','首页推荐');homeBanner.tabIndex=0;
const bannerImage=(slide,index,clone=false)=>`<div class="home-carousel-slide" data-index="${index}" data-clone="${clone}" ${clone?'aria-hidden="true"':''}><div class="home-carousel-card"><img src="${slide.src}" alt="${clone?'':slide.alt}" width="720" height="300" draggable="false"></div></div>`;
homeBanner.innerHTML=`<div class="home-carousel-track">${bannerImage(homeBannerSlides[1],1,true)}${bannerImage(homeBannerSlides[2],2,true)}${homeBannerSlides.map((slide,index)=>bannerImage(slide,index)).join('')}${bannerImage(homeBannerSlides[0],0,true)}${bannerImage(homeBannerSlides[1],1,true)}</div><div class="home-carousel-dots" aria-label="选择推荐图片">${homeBannerSlides.map((slide,index)=>`<button class="home-carousel-dot" aria-label="第 ${index+1} 张：${slide.alt}" aria-current="${index===0}" onclick="selectHomeBanner(${index})"></button>`).join('')}</div>`;
const homeBannerTrack=homeBanner.querySelector('.home-carousel-track');
const homeBannerCards=[...homeBannerTrack.querySelectorAll('.home-carousel-card')];
let homeBannerWidth=0,homeBannerCardWidth=0,homeBannerStep=1;
function homeBannerIndex(position){return ((Math.round(position)-2)%homeBannerSlides.length+homeBannerSlides.length)%homeBannerSlides.length}
function syncHomeBanner(){
 homeBanner.dataset.current=homeCarousel.index;
 homeBannerTrack.style.transform=`translate3d(${(homeBannerWidth-homeBannerCardWidth)/2-homeCarousel.position*homeBannerStep}px,0,0)`;
 homeBannerCards.forEach((card,index)=>{
  const emphasis=Math.max(0,1-Math.abs(index-homeCarousel.position));
  card.style.transform=`scale(${.86+.14*emphasis})`;card.style.opacity=.64+.36*emphasis;
  card.parentElement.classList.toggle('is-center',index===Math.round(homeCarousel.position));
 });
 homeBanner.querySelectorAll('.home-carousel-dot').forEach((dot,index)=>dot.setAttribute('aria-current',index===homeCarousel.index));
 homeBanner.querySelectorAll('.home-carousel-slide').forEach(slide=>{if(slide.dataset.clone==='false')slide.setAttribute('aria-hidden',Number(slide.dataset.index)!==homeCarousel.index)});
}
function stopHomeBannerAnimation(){
 cancelAnimationFrame(homeCarousel.animation);homeCarousel.animation=null;homeCarousel.moving=false;
}
function finishHomeBanner(){
 stopHomeBannerAnimation();homeCarousel.visual=homeCarousel.position=homeCarousel.index+2;syncHomeBanner();
}
function animateHomeBanner(target){
 stopHomeBannerAnimation();homeCarousel.visual=target;homeCarousel.index=homeBannerIndex(target);
 const from=homeCarousel.position,distance=target-from,start=performance.now(),duration=340+Math.min(1,Math.abs(distance))*160;
 if(homeCarousel.reduced.matches||Math.abs(distance)<.0001){finishHomeBanner();restartHomeBanner();return}
 homeCarousel.moving=true;syncHomeBanner();
 const frame=now=>{
  const progress=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-progress,3);
  homeCarousel.position=from+distance*ease;syncHomeBanner();
  if(progress<1)homeCarousel.animation=requestAnimationFrame(frame);else finishHomeBanner();
 };
 homeCarousel.animation=requestAnimationFrame(frame);
 restartHomeBanner();
}
function moveHomeBanner(delta){selectHomeBanner((homeCarousel.index+delta+homeBannerSlides.length)%homeBannerSlides.length)}
function selectHomeBanner(index){
 if(!Number.isInteger(index)||index<0||index>=homeBannerSlides.length)return;
 const candidates=[index-1,index+2,index+5],target=candidates.reduce((nearest,value)=>Math.abs(value-homeCarousel.position)<Math.abs(nearest-homeCarousel.position)?value:nearest);
 animateHomeBanner(target);
}
function restartHomeBanner(){
 clearTimeout(homeCarousel.timer);homeCarousel.timer=null;
 if(document.hidden||homeCarousel.reduced.matches||homeCarousel.hover||homeCarousel.focus||homeCarousel.pointer||!homeCarousel.visible||!document.getElementById('home').classList.contains('active')||document.getElementById('home').inert)return;
 homeCarousel.timer=setTimeout(()=>moveHomeBanner(1),3000);
}
homeBanner.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){homeCarousel.hover=true;restartHomeBanner()}});
homeBanner.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){homeCarousel.hover=false;restartHomeBanner()}});
homeBanner.addEventListener('focusin',()=>{homeCarousel.focus=homeBanner.matches(':focus-visible')||!!homeBanner.querySelector(':focus-visible');restartHomeBanner()});
homeBanner.addEventListener('focusout',()=>{homeCarousel.focus=false;restartHomeBanner()});
homeBanner.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();moveHomeBanner(event.key==='ArrowLeft'?-1:1)}});
homeBanner.addEventListener('pointerdown',event=>{
 if(event.button!==0||!event.isPrimary||event.target.closest('button'))return;
 stopHomeBannerAnimation();
 homeCarousel.pointer={id:event.pointerId,x:event.clientX,y:event.clientY,position:homeCarousel.position,axis:null,lastX:event.clientX,lastTime:event.timeStamp,velocity:0};
 homeBanner.setPointerCapture(event.pointerId);restartHomeBanner();
});
function dragHomeBanner(event){
 const pointer=homeCarousel.pointer;if(!pointer||pointer.id!==event.pointerId)return;
 const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
 if(!pointer.axis){if(Math.max(Math.abs(dx),Math.abs(dy))<5)return;pointer.axis=Math.abs(dx)>Math.abs(dy)?'x':'y'}
 if(pointer.axis!=='x')return;
 if(event.cancelable)event.preventDefault();homeBanner.classList.add('is-dragging');
 const elapsed=event.timeStamp-pointer.lastTime;
 if(elapsed>0&&event.clientX!==pointer.lastX)pointer.velocity=.45*pointer.velocity+.55*(event.clientX-pointer.lastX)/elapsed;
 pointer.lastX=event.clientX;pointer.lastTime=event.timeStamp;
 homeCarousel.position=pointer.position-dx/homeBannerStep;
 while(homeCarousel.position<1.5){homeCarousel.position+=3;pointer.position+=3}
 while(homeCarousel.position>=4.5){homeCarousel.position-=3;pointer.position-=3}
 homeCarousel.visual=Math.round(homeCarousel.position);homeCarousel.index=homeBannerIndex(homeCarousel.visual);syncHomeBanner();
}
homeBanner.addEventListener('pointermove',dragHomeBanner);
function releaseHomeBanner(event){
 const pointer=homeCarousel.pointer;if(!pointer||pointer.id!==event.pointerId)return;
 if(event.type==='pointerup'&&pointer.axis==='x'&&event.clientX!==pointer.lastX)dragHomeBanner(event);
 homeCarousel.pointer=null;homeBanner.classList.remove('is-dragging');
 if(homeBanner.hasPointerCapture(event.pointerId))homeBanner.releasePointerCapture(event.pointerId);
 let target=Math.round(homeCarousel.position);
 if(event.type==='pointerup'&&pointer.axis==='x'&&Math.abs(event.clientX-pointer.x)>12&&event.timeStamp-pointer.lastTime<120&&Math.abs(pointer.velocity)>.35)target=pointer.velocity<0?Math.ceil(homeCarousel.position):Math.floor(homeCarousel.position);
 animateHomeBanner(target);
}
homeBanner.addEventListener('pointerup',releaseHomeBanner);homeBanner.addEventListener('pointercancel',releaseHomeBanner);homeBanner.addEventListener('lostpointercapture',releaseHomeBanner);
new ResizeObserver(()=>{
 homeBannerWidth=homeBanner.clientWidth;homeBannerCardWidth=homeBannerWidth*.87-4;homeBannerStep=homeBannerCardWidth*.93+4;
 homeBanner.style.setProperty('--banner-card-width',homeBannerCardWidth+'px');homeBanner.style.setProperty('--banner-card-overlap',(homeBannerStep-homeBannerCardWidth)+'px');
 if(homeCarousel.pointer){const id=homeCarousel.pointer.id;homeCarousel.pointer=null;homeBanner.classList.remove('is-dragging');if(homeBanner.hasPointerCapture(id))homeBanner.releasePointerCapture(id)}
 finishHomeBanner();restartHomeBanner();
}).observe(homeBanner);
new MutationObserver(restartHomeBanner).observe(document.getElementById('home'),{attributes:true,attributeFilter:['class','inert']});
new IntersectionObserver(entries=>{homeCarousel.visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.1;restartHomeBanner()},{threshold:.1}).observe(homeBanner);
document.addEventListener('visibilitychange',restartHomeBanner);homeCarousel.reduced.addEventListener('change',()=>{finishHomeBanner();restartHomeBanner()});
syncHomeBanner();restartHomeBanner();
