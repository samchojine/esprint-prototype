/* V1.0.0: navigation actions, transactional label settings and connected selectors. */
(() => {
  const editor=window.esprintEditor;if(!editor)return;
  const {screen,actions,state}=editor,nav=screen.querySelector('.topbar'),heading=nav.querySelector('h1'),dimension=heading.querySelector('small');
  const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const editIcon=icon('<path d="m15.5 4.5 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.5 15Z"/><path d="M12 20h8"/>');
  const save=actions.querySelector('.secondary'),print=actions.querySelector('.primary');
  save.innerHTML=icon('<path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h9V3M7 21v-8h10v8M13 5v2"/>');
  save.title='保存';save.setAttribute('aria-label','保存标签');save.dataset.editorAction='save';
  print.innerHTML=icon('<path d="M7 8V3h10v5M7 17H4a1 1 0 0 1-1-1v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5a1 1 0 0 1-1 1h-3"/><path d="M7 14h10v7H7zM17 11h.1"/>');
  print.title='打印预览';print.setAttribute('aria-label','打印预览');print.dataset.editorAction='print';
  const name=document.createElement('span');name.className='editor-label-name';name.textContent=heading.firstChild.textContent.trim();heading.firstChild.replaceWith(name);
  const settingsButton=document.createElement('button');settingsButton.type='button';settingsButton.className='editor-label-settings';settingsButton.setAttribute('aria-label','打开标签设置');
  heading.before(settingsButton);settingsButton.append(heading);
  const pill=document.createElement('span');pill.className='editor-dimension-pill';dimension.before(pill);pill.append(dimension);pill.insertAdjacentHTML('beforeend',editIcon);
  let session=null;
  const newPage=document.getElementById('new'),newHeading=newPage.querySelector('.topbar h1'),newBack=newPage.querySelector('.back'),create=newPage.querySelector('.create-label');
  function configureNewPage(){
    newPage.classList.toggle('is-label-settings',!!session);newHeading.textContent=session?'标签设置':'新建标签';create.textContent=session?'保存':'创建';newBack.onclick=()=>go(session?'editor':'home');
  }
  function openSettings(){
    if(settingsButton.disabled||session)return;
    session={width:state.width,height:state.height,shape:labelShape,returnTo:templateEditorReturn,saving:false};
    newPhysicalSize.splice(0,2,state.width,state.height);syncNewLabel();configureNewPage();go('new');
  }
  settingsButton.onclick=openSettings;
  const previousGo=go;
  go=function(id,options={}){
    const leaving=session&&document.querySelector('.screen.active')?.id==='new'&&id!=='new'?session:null;
    if(leaving){
      if(!leaving.saving){labelShape=leaving.shape;newPhysicalSize.splice(0,2,leaving.width,leaving.height);syncNewLabel();}
      session=null;
    }
    if(id==='new')configureNewPage();
    previousGo(id,options);
    if(leaving&&id==='editor'){
      templateEditorReturn=leaving.returnTo;screen.querySelector('.back').onclick=()=>go(templateEditorReturn);editor.updateView();editor.render();
    }
    if(id==='editor')syncSelectors();
  };
  const previousCreate=createLabel;
  createLabel=function(){
    if(!session){previousCreate();return;}
    if(newInputs.some(input=>!Number.isFinite(Number(input.value))||Number(input.value)<=0)){toast('warn','请输入有效的宽度和高度');return;}
    session.saving=true;editor.applyDimensions(...newPhysicalSize);go('editor');
  };
  const railSelector='.text-property-tabs,.text-font-categories,.element-material-categories,.data-picker-header [role="tablist"],.text-layout-modes';
  const slidingSelector='.text-property-tabs,.text-font-categories,.element-material-categories';
  const motions=new WeakMap(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function paintSelection(motion){
    if(!motion.thumb.isConnected)return;
    const box=motion.current;
    motion.thumb.style.width=box.width+'px';motion.thumb.style.height=box.height+'px';
    motion.thumb.style.transform=`translate(${box.x}px,${box.y}px)`;
  }
  function advanceSelection(motion,now){
    const progress=reducedMotion.matches?1:Math.min(1,(now-motion.started)/300),ease=1-Math.pow(1-progress,3);
    for(const key of ['x','y','width','height'])motion.current[key]=motion.from[key]+(motion.target[key]-motion.from[key])*ease;
    paintSelection(motion);
    motion.frame=progress<1?requestAnimationFrame(time=>advanceSelection(motion,time)):0;
  }
  function slideSelection(rail,thumb,target){
    // Keep geometry outside the row DOM: font/material rows are rebuilt on selection.
    const owner=rail.closest('.text-properties'),key=[...rail.classList].find(name=>['text-property-tabs','text-font-categories','element-material-categories'].includes(name));
    let rows=motions.get(owner);if(!rows){rows=new Map();motions.set(owner,rows);}
    let motion=rows.get(key);
    if(!motion){motion={current:{...target},target:{...target},frame:0};rows.set(key,motion);}
    if(motion.rail&&motion.rail!==rail)rail.scrollLeft=motion.scrollLeft;
    motion.rail=rail;motion.scrollLeft=rail.scrollLeft;
    motion.thumb=thumb;
    const changed=Object.keys(target).some(key=>Math.abs(target[key]-motion.target[key])>.1);
    if(changed){
      cancelAnimationFrame(motion.frame);motion.from={...motion.current};motion.target={...target};motion.started=performance.now();
      if(reducedMotion.matches){motion.current={...target};motion.frame=0;}
      else motion.frame=requestAnimationFrame(time=>advanceSelection(motion,time));
    }
    paintSelection(motion);
  }
  const watched=new WeakSet();let frame=0;
  function updateRail(rail){
    if(!rail.isConnected||!rail.clientWidth)return;
    const buttons=[...rail.children].filter(node=>node.tagName==='BUTTON'),active=buttons.find(button=>button.getAttribute('aria-selected')==='true'||button.getAttribute('aria-pressed')==='true');
    let thumb=rail.querySelector(':scope > .editor-selector-thumb');
    const created=!thumb;
    if(!thumb){thumb=document.createElement('span');thumb.style.transition='none';thumb.className='editor-selector-thumb';thumb.setAttribute('aria-hidden','true');thumb.dataset.editorOnly='';rail.prepend(thumb);}
    thumb.hidden=!active;if(!active)return;
    const rect=active.getBoundingClientRect(),parent=rail.getBoundingClientRect();
    const target={x:rect.left-parent.left+rail.scrollLeft,y:rect.top-parent.top+rail.scrollTop,width:rect.width,height:rect.height};
    if(rail.matches(slidingSelector))slideSelection(rail,thumb,target);
    else{thumb.style.width=target.width+'px';thumb.style.height=target.height+'px';thumb.style.transform=`translate(${target.x}px,${target.y}px)`;}
    rail.classList.toggle('is-selector-disabled',buttons.every(button=>button.disabled));
    if(created)requestAnimationFrame(()=>{if(thumb.isConnected)thumb.style.removeProperty('transition');});
  }
  function syncSelectors(root=screen){
    root.querySelectorAll(railSelector).forEach(rail=>{
      rail.classList.add('editor-menu-selector');
      if(!watched.has(rail)){watched.add(rail);rail.addEventListener('scroll',()=>updateRail(rail),{passive:true});new ResizeObserver(()=>updateRail(rail)).observe(rail);}
      updateRail(rail);
    });
  }
  window.addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>syncSelectors());});
  window.esprintEditorChrome={openSettings,syncSelectors,isSettings:()=>!!session};
  configureNewPage();syncSelectors();editor.renderToolbar();editor.updateView();
})();
