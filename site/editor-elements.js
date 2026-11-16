/* V1.0.0. The property-panel state is separate from the printable model. */
(() => {
  const editor=window.esprintEditor,renderer=window.esprintElementRenderer,geometry=window.esprintGeometry;if(!editor||!renderer||!geometry)return;
  const {state,screen,paper,dock,menu,workspace}=editor,footer=editor.actions;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={
    close:'<path d="m6 6 12 12M6 18 18 6"/>',plus:'<path d="M5 12h14M12 5v14"/>',minus:'<path d="M5 12h14"/>',
    star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z"/>',
    alignLeft:'<path d="M4 3v18M8 7h12v3H8zm0 7h7v3H8z"/>',alignCenter:'<path d="M12 3v18M4 7h16v3H4zm4 7h8v3H8z"/>',alignRight:'<path d="M20 3v18M4 7h12v3H4zm5 7h7v3H9z"/>',
    alignTop:'<path d="M3 4h18M7 8h3v12H7zm7 0h3v7h-3z"/>',alignMiddle:'<path d="M3 12h18M7 4h3v16H7zm7 4h3v8h-3z"/>',alignBottom:'<path d="M3 20h18M7 4h3v12H7zm7 5h3v7h-3z"/>',
    up:'<path d="M12 19V5m-5 5 5-5 5 5"/>',down:'<path d="M12 5v14m-5-5 5 5 5-5"/>',left:'<path d="M19 12H5m5-5-5 5 5 5"/>',right:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
    mirrorX:'<path d="M12 3v18M3 17l5-10v10Zm18 0L16 7v10Z"/>',mirrorY:'<path d="M3 12h18M7 3l10 5H7Zm0 18 10-5H7Z"/>',mirrorBoth:'<path d="M12 2v20M2 12h20M4 8l4-4v4Zm16 8-4 4v-4Z"/>',
    chevron:'<path d="m7 10 5 5 5-5"/>',retry:'<path d="M20 7v5h-5M4 17v-5h5M20 12a8 8 0 0 0-14-5m-2 5a8 8 0 0 0 14 5"/>',
    rotate:'<path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"/>',crop:'<path d="M7 3v14h14M3 7h14v14"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .4-1 1.2-1 2.2M12 17v.1"/>'
  };
  const glyph=name=>renderer.svg(paths[name]||paths.close);
  const titles={image:'图片',shape:'形状',icon:'图标',border:'边框',barcode:'条形码',qr:'二维码'};
  const tabMemory=new Map(),assetStatus=new Map();
  let pickerKind=null,currentId=null,sequence=1,category='all',limit=15,selectionError='',catalog=[],catalogStatus='idle';
  let codeSession=null,imageSession=null,rangeSession=null,gesture=null,dragged=false,encodingPopover=null,encodingCleanup=null,assetRequest=0,pendingFavorite=null;
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}}
  let history=read('esprint-material-history'),favorites=read('esprint-material-favorites');
  const persist=()=>{try{localStorage.setItem('esprint-material-history',JSON.stringify(history));localStorage.setItem('esprint-material-favorites',JSON.stringify(favorites));}catch{}};
  const selected=()=>{const item=editor.selected();return item&&renderer.supported.has(item.kind)?item:null;};
  const unlocked=()=>{const item=selected();return item&&!item.locked?item:null;};
  function tabsFor(kind){
    if(kind==='image')return [['style','样式'],['alignment','对齐与镜像']];
    if(kind==='shape')return [['shape','形状'],['size','尺寸'],['style','样式'],['alignment','对齐与镜像']];
    if(kind==='qr')return [['content','内容'],['encoding','编码'],['alignment','对齐']];
    if(kind==='barcode')return [['content','内容'],['encoding','编码'],['style','样式'],['alignment','对齐']];
    return [['material','素材'],['size','尺寸'],['style','样式'],['alignment','对齐与镜像']];
  }
  const kindNow=()=>unlocked()?.kind||pickerKind;
  const activeTab=()=>tabMemory.get(state.selected||'picker')||tabsFor(kindNow()||'shape')[0][0];
  const properties=document.createElement('section');properties.className='text-properties element-properties';properties.hidden=true;properties.setAttribute('aria-label','元素属性');
  properties.innerHTML='<div class="text-property-tabs element-property-tabs" role="tablist" aria-label="元素设置"></div><div class="text-property-body element-property-body" id="element-property-body" role="tabpanel"></div>';
  dock.append(properties);const tabs=properties.firstElementChild,body=properties.lastElementChild;
  const composer=document.createElement('section');composer.className='editor-text-composer element-code-composer';composer.hidden=true;
  composer.innerHTML=`<div class="text-composer-top"><span>编辑内容</span><button type="button" class="text-input-cancel" aria-label="取消编码输入">${glyph('close')}</button></div><div class="text-composer-row"><div class="text-composer-field"><textarea rows="1" aria-label="编码内容" enterkeyhint="done"></textarea><button type="button" class="text-input-clear" aria-label="清空编码输入">${glyph('close')}</button></div><button type="button" class="text-input-done primary">完成</button></div><p class="element-input-error" role="alert"></p>`;
  dock.append(composer);const codeInput=composer.querySelector('textarea');
  function switchRow(key,label,value){return `<div class="text-toggle-row"><span class="text-toggle-label" id="element-label-${key}">${label}</span><button type="button" class="text-switch" role="switch" data-setting-toggle="${key}" aria-labelledby="element-label-${key}" aria-checked="${!!value}"></button></div>`;}
  function rangeRow(key,label,value,min,max,step){return `<div class="element-range-card"><div class="text-size-row"><span class="text-field-label">${label}</span><input class="text-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-element-range="${key}" aria-label="${label}" style="--range-progress:${(value-min)/(max-min)*100}%"><output data-element-value="${key}">${step<1?value.toFixed(1):value}</output><button type="button" class="text-step-button" data-element-step="${key}" data-delta="-${step}" aria-label="减少${label}" ${value<=min?'disabled':''}>${glyph('minus')}</button><button type="button" class="text-step-button" data-element-step="${key}" data-delta="${step}" aria-label="增加${label}" ${value>=max?'disabled':''}>${glyph('plus')}</button></div></div>`;}
  function sizeMarkup(item){return switchRow('equal','等比缩放',renderer.settings(item).equal);}
  function shapeMarkup(item){
    const paths={line:'<path d="M3 12h18"/>',rectangle:'<rect x="4" y="4" width="16" height="16"/>',rounded:'<rect x="4" y="4" width="16" height="16" rx="4"/>',triangle:'<path d="m12 3 10 18H2Z"/>',rightTriangle:'<path d="M3 3v18h18Z"/>',vertical:'<path d="M12 3v18"/>',diamond:'<path d="m12 2 9 10-9 10-9-10Z"/>',circle:'<circle cx="12" cy="12" r="9"/>'};
    return `<div class="element-shape-grid" role="group" aria-label="形状选择">${renderer.shapeTypes.map(([key,label])=>`<button type="button" data-element-shape="${key}" aria-label="${label}" title="${label}" aria-pressed="${item?.shape===key}">${renderer.svg(paths[key])}</button>`).join('')}</div>`;
  }
  function styleMarkup(item){
    const s=renderer.settings(item);
    if(item.kind==='image')return switchRow('thresholdEnabled','启用清晰度',s.thresholdEnabled)+(s.thresholdEnabled?rangeRow('threshold','清晰度',s.threshold,0,255,1):'')+sizeMarkup(item);
    if(item.kind==='shape')return `<div class="element-line-style"><span>线型</span><div role="group" aria-label="线型"><button type="button" data-line-style="solid" aria-label="实线" aria-pressed="${!s.dashed}"><i></i></button><button type="button" data-line-style="dashed" aria-label="虚线" aria-pressed="${s.dashed}"><i class="is-dashed"></i></button></div></div>`+rangeRow('lineWidth','线粗',s.lineWidth,.3,3,.1);
    if(item.kind==='barcode')return `<div class="element-small-label">条码样式</div><div class="element-code-styles">${[['below','条码在上，文字在下'],['bars','纯条码'],['above','文字在上，条码在下']].map(([key,label])=>`<button type="button" data-code-style="${key}" aria-label="${label}" aria-pressed="${(item.codeStyle||'below')===key}"><span class="element-code-style-preview ${key}"><i></i>${key!=='bars'?'<small>1234</small>':''}</span></button>`).join('')}</div>`+(item.codeStyle!=='bars'?rangeRow('codeFont','字号',item.codeFont||10,1,72,1):'');
    return switchRow('invert','反白',s.invert);
  }
  function alignmentMarkup(item){
    const mirror=['image','shape','icon','border'].includes(item.kind),s=renderer.settings(item);
    return `<div class="text-alignment-layout"><div><span class="text-alignment-caption">画布对齐</span><div class="text-align-buttons">${[['left','alignLeft','左对齐'],['center','alignCenter','水平居中'],['right','alignRight','右对齐'],['top','alignTop','顶部对齐'],['middle','alignMiddle','垂直居中'],['bottom','alignBottom','底部对齐']].map(([key,icon,label])=>`<button type="button" data-element-align="${key}" aria-label="${label}">${glyph(icon)}</button>`).join('')}</div></div><div><span class="text-alignment-caption">微调</span><div class="text-nudge-buttons">${[['up','向上微移'],['left','向左微移'],['right','向右微移'],['down','向下微移']].map(([key,label])=>`<button type="button" data-element-nudge="${key}" data-nudge="${key}" aria-label="${label}">${glyph(key)}</button>`).join('')}<span class="text-nudge-center"></span></div></div></div>${mirror?`<div class="element-small-label mirror-caption">镜像</div><div class="element-mirror-options">${[['mirrorX','水平镜像',s.mirrorX],['mirrorY','垂直镜像',s.mirrorY],['mirrorBoth','双向镜像',s.mirrorX&&s.mirrorY]].map(([key,label,pressed])=>`<button type="button" data-element-mirror="${key}" aria-label="${label}" aria-pressed="${pressed}">${glyph(key)}<small>${label}</small></button>`).join('')}</div>`:''}`;
  }
  function contentMarkup(item){return `<label class="element-small-label" for="element-content-display">${titles[item.kind]}内容</label><textarea id="element-content-display" class="element-content-display" rows="3" readonly aria-label="编辑${titles[item.kind]}内容">${esc(item.content||'123456')}</textarea>`;}
  function encodingMarkup(item){return `<div class="element-encoding-row"><span>编码类型</span><button type="button" class="element-encoding-trigger" aria-label="选择编码类型" aria-haspopup="listbox" aria-expanded="false">${esc(item.encoding||(item.kind==='qr'?'QR_CODE':'Code128'))}${glyph('chevron')}</button></div>${selectionError?`<p class="element-input-error" role="alert">${esc(selectionError)}</p>`:''}`;}
  function materialMarkup(kind){
    if(catalogStatus==='idle'){loadCatalog();return loadingMarkup();}
    if(catalogStatus==='loading')return loadingMarkup();
    if(catalogStatus==='error')return '<div class="element-material-empty">素材加载失败<button type="button" data-catalog-retry>重试</button></div>';
    const available=catalog.filter(asset=>asset.kind===kind),target=unlocked(),replaceable=target?.kind===kind;
    const groups=[['all','全部'],['history','最近'],['favorites','收藏'],...Array.from(new Set(available.map(asset=>asset.category))).map(value=>[value,value])];
    let items=available;
    if(category==='history')items=history.map(id=>available.find(asset=>asset.id===id)).filter(Boolean);
    else if(category==='favorites')items=available.filter(asset=>favorites.includes(asset.id));
    else if(category!=='all')items=available.filter(asset=>asset.category===category);
    return `<div class="element-material-categories">${groups.map(([key,label])=>`<button type="button" data-material-category="${esc(key)}" aria-pressed="${category===key}">${esc(label)}</button>`).join('')}</div>${items.length?`<div class="element-material-grid">${items.slice(0,limit).map(asset=>{
      const resource=assetStatus.get(asset.id),busy=resource?.status==='loading',error=resource?.status==='error';
      return `<div class="element-material-card"><button type="button" data-material="${asset.id}" aria-label="${error?'重试加载':replaceable?'替换为':'添加'}${esc(asset.name)}" aria-pressed="${target?.assetId===asset.id}" aria-busy="${!!busy}"><img src="${asset.url}" alt="${esc(asset.name)}" loading="lazy" draggable="false">${busy?`<span class="element-material-progress">${resource.progress}%</span>`:error?'<span class="element-material-progress">重试</span>':''}</button><button type="button" class="element-material-favorite" data-material-favorite="${asset.id}" aria-label="${favorites.includes(asset.id)?'取消收藏':'收藏'}${esc(asset.name)}" aria-pressed="${favorites.includes(asset.id)}">${glyph('star')}</button></div>`;
    }).join('')}</div>${items.length>limit?'<button type="button" class="element-load-more" data-material-more>加载更多</button>':''}`:'<div class="element-material-empty">'+(category==='favorites'?'还没有收藏的素材':category==='history'?'还没有使用记录':'暂无素材')+'</div>'}`;
  }
  function loadingMarkup(){return '<div class="element-material-empty"><span class="element-mini-spinner"></span>正在加载</div>';}
  async function loadCatalog(){
    catalogStatus='loading';
    try{const response=await fetch('assets/materials/catalog.json');if(!response.ok)throw new Error('load');catalog=(await response.json()).filter(asset=>['icon','border'].includes(asset.kind));catalogStatus='ready';}
    catch{catalogStatus='error';}
    if(!properties.hidden&&activeTab()==='material')renderPanel();
  }
  function renderPanel(){
    const kind=kindNow(),item=unlocked();if(!kind||codeSession||imageSession||(window.esprintText?.isEditing() || window.esprintData?.isEditing()))return;
    const active=activeTab(),scroll=body.dataset.tab===active&&body.dataset.id===(state.selected||'picker')?body.scrollTop:0;
    closeEncoding();
    const order=JSON.stringify(tabsFor(kind));
    if(tabs.dataset.order!==order)tabs.innerHTML=tabsFor(kind).map(([key,label])=>`<button type="button" role="tab" id="element-tab-${key}" data-element-tab="${key}" aria-selected="${active===key}" aria-controls="element-property-body" ${!item&&!['material','shape'].includes(key)?'disabled':''}>${label}</button>`).join('');
    tabs.dataset.order=order;
    tabs.querySelectorAll('[data-element-tab]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.elementTab===active));button.disabled=!item&&!['material','shape'].includes(button.dataset.elementTab);});
    body.dataset.id=state.selected||'picker';body.dataset.tab=active;body.setAttribute('aria-labelledby','element-tab-'+active);
    body.innerHTML=active==='material'?materialMarkup(kind):active==='shape'?shapeMarkup(item):!item?'':active==='size'?sizeMarkup(item):active==='style'?styleMarkup(item):active==='content'?contentMarkup(item):active==='encoding'?encodingMarkup(item):alignmentMarkup(item);
    body.scrollTop=scroll;
    window.esprintEditorChrome?.syncSelectors(properties);
  }
  function refresh(){
    paper.querySelectorAll('.editor-object').forEach(element=>{const item=state.items.find(value=>value.id===element.dataset.id);if(item&&renderer.supported.has(item.kind))renderer.paint(item,element);});
    if(currentId!==state.selected){if(currentId)tabMemory.delete(currentId);currentId=state.selected;selectionError='';if(window.esprintText?.supports(editor.selected()?.kind))pickerKind=null;}
    if(codeSession){properties.hidden=true;menu.hidden=true;composer.hidden=false;return;}
    if((window.esprintText?.isEditing() || window.esprintData?.isEditing())){properties.hidden=true;return;}
    const item=unlocked(),kind=item?.kind||pickerKind;
    const show=!!kind&&(!editor.selected()||!!item);
    properties.hidden=!show;composer.hidden=true;
    if(show){menu.hidden=true;renderPanel();}
    else if(!window.esprintText?.supports(editor.selected()?.kind)||editor.selected()?.locked){menu.hidden=false;}
    if(!show)closeEncoding();geometry.drawRulers();
  }
  function viewChanged(){
    geometry.drawRulers();
    paper.querySelectorAll('.editor-graphic').forEach(element=>{const item=state.items.find(value=>value.id===element.dataset.id);if(item)renderer.paint(item,element);});
  }
  function createItem(kind,extra={},widthPx=80,heightPx=80){
    const width=Math.min(widthPx,paper.clientWidth*.75),height=heightPx*width/widthPx;
    return {id:`graphic-${sequence++}`,kind,x:(100-width/paper.clientWidth*100)/2,y:24,w:width/paper.clientWidth*100,h:height/paper.clientHeight*100,rotation:0,settings:renderer.settings({}),...extra};
  }
  function addItem(item,tab){
    pickerKind=null;currentId=item.id;tabMemory.set(item.id,tab||tabsFor(item.kind)[0][0]);
    editor.commit(()=>{state.items.push(item);state.selected=item.id;});
  }
  function addFromMenu(kind){
    if(!renderer.supported.has(kind))return false;
    selectionError='';category='all';limit=15;assetRequest++;
    if(['icon','border','shape'].includes(kind)){pickerKind=kind;tabMemory.set('picker',tabsFor(kind)[0][0]);refresh();return true;}
    if(kind==='image'){chooseImage();return true;}
    if(kind==='barcode'||kind==='qr'){
      const item=createItem(kind,{content:'123456',encoding:kind==='qr'?'QR_CODE':'Code128',codeStyle:'below',codeFont:state.width>=60?10:4},kind==='qr'?80:200,kind==='qr'?80:75);
      renderer.code(item);addItem(item,'content');return true;
    }
    return false;
  }
  function patchSettings(patch){const item=unlocked();if(!item)return;editor.commit(()=>{item.settings={...renderer.settings(item),...patch};});}
  function changeShape(key){
    const item=unlocked();
    if(item?.kind==='shape'){editor.commit(()=>{item.shape=key;});return;}
    const size=Math.min(80,paper.clientHeight*.48);addItem(createItem('shape',{shape:key},size,size),'shape');
  }
  tabs.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.elementTab){if(!unlocked()&&!['material','shape'].includes(button.dataset.elementTab))return;tabMemory.set(state.selected||'picker',button.dataset.elementTab);renderPanel();}
  });
  body.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(event.target.closest('.element-content-display')){openCodeInput(unlocked());return;}
    if(!button||button.disabled)return;
    const item=unlocked(),s=item?renderer.settings(item):null;
    if(button.dataset.elementShape)changeShape(button.dataset.elementShape);
    if(button.dataset.settingToggle)patchSettings({[button.dataset.settingToggle]:!s[button.dataset.settingToggle]});
    if(button.dataset.lineStyle)patchSettings({dashed:button.dataset.lineStyle==='dashed'});
    if(button.dataset.codeStyle)editor.commit(()=>{item.codeStyle=button.dataset.codeStyle;});
    if(button.dataset.elementStep)stepValue(button.dataset.elementStep,Number(button.dataset.delta));
    if(button.dataset.elementMirror){const key=button.dataset.elementMirror;patchSettings(key==='mirrorBoth'?{mirrorX:!(s.mirrorX&&s.mirrorY),mirrorY:!(s.mirrorX&&s.mirrorY)}:{[key]:!s[key]});}
    if(button.dataset.elementAlign)align(button.dataset.elementAlign);
    if(button.dataset.elementNudge&&!nudgeHeld)nudge(button.dataset.elementNudge);
    if(button.classList.contains('element-encoding-trigger'))openEncoding(button);
    if(button.dataset.materialCategory){category=button.dataset.materialCategory;limit=15;renderPanel();}
    if(button.dataset.material)chooseMaterial(button.dataset.material);
    if(button.dataset.materialFavorite)favorite(button.dataset.materialFavorite);
    if(button.hasAttribute('data-material-more')){limit+=15;renderPanel();}
    if(button.hasAttribute('data-catalog-retry')){loadCatalog();renderPanel();}
  });
  body.addEventListener('input',event=>{
    const key=event.target.dataset.elementRange,item=unlocked();if(!key||!item)return;
    if(!rangeSession)rangeSession={item:structuredClone(item),key,value:0};
    const value=Number(event.target.value),preview=structuredClone(rangeSession.item);
    if(key==='codeFont')preview.codeFont=value;else preview.settings={...renderer.settings(preview),[key]:value};
    rangeSession.value=value;renderer.paint(preview,paper.querySelector(`[data-id="${item.id}"]`));
    body.querySelector(`[data-element-value="${key}"]`).textContent=key==='lineWidth'?value.toFixed(1):value;
    const {min,max}=event.target;event.target.style.setProperty('--range-progress',(value-Number(min))/(Number(max)-Number(min))*100+'%');
  });
  body.addEventListener('change',event=>{
    if(!event.target.dataset.elementRange||!rangeSession)return;
    const {key,value,item:old}=rangeSession;rangeSession=null;const item=unlocked();if(item?.id!==old.id)return;
    editor.commit(()=>{if(key==='codeFont')item.codeFont=value;else item.settings={...renderer.settings(item),[key]:value};});
  });
  const valueLimits={threshold:[0,255],lineWidth:[.3,3],codeFont:[1,72]};
  function stepValue(key,delta){const item=unlocked();if(!item)return;const [min,max]=valueLimits[key],value=key==='codeFont'?item.codeFont||10:renderer.settings(item)[key],next=Math.max(min,Math.min(max,Number((value+delta).toFixed(1))));if(key==='codeFont')editor.commit(()=>item.codeFont=next);else patchSettings({[key]:next});}
  function closeEncoding(){encodingPopover?.remove();encodingPopover=null;encodingCleanup?.();encodingCleanup=null;body.querySelector('.element-encoding-trigger')?.setAttribute('aria-expanded','false');}
  function openEncoding(button){
    if(encodingPopover){closeEncoding();return;}
    const item=unlocked();if(!item)return;
    const popup=document.createElement('div');popup.className='element-encoding-popover';popup.setAttribute('role','listbox');popup.setAttribute('aria-label','编码类型');
    popup.innerHTML=(item.kind==='qr'?renderer.qrTypes:renderer.barcodeTypes).map(([name])=>`<button type="button" role="option" data-encoding="${name}" aria-selected="${item.encoding===name}">${name}<span>${item.encoding===name?'✓':''}</span></button>`).join('')+'<p class="element-input-error" role="alert"></p>';
    properties.append(popup);encodingPopover=popup;button.setAttribute('aria-expanded','true');
    popup.addEventListener('click',event=>{
      const encoding=event.target.closest('[data-encoding]')?.dataset.encoding;if(!encoding)return;
      const candidate={...item,encoding};
      try{
        const encoded=renderer.code(candidate);selectionError='';
        editor.commit(()=>{item.encoding=encoding;if(item.kind==='qr')item.w=item.h/100*state.height*(encoding==='PDF417'?encoded.width/encoded.height:1)/state.width*100;});
      }catch(error){popup.querySelector('.element-input-error').textContent=renderer.codeError(error,candidate);}
    });
    const dismiss=event=>{if(!popup.contains(event.target)&&!event.target.closest('.element-encoding-trigger')){event.stopPropagation();closeEncoding();}};
    const key=event=>{if(event.key==='Escape')closeEncoding();};
    document.addEventListener('pointerdown',dismiss,true);document.addEventListener('keydown',key);
    encodingCleanup=()=>{document.removeEventListener('pointerdown',dismiss,true);document.removeEventListener('keydown',key);};
  }
  function previewCodeInput(){
    if(!codeSession)return;
    const raw=codeInput.value.replace(/[\r\n]/g,''),value=raw||(!codeSession.touched?codeSession.item.content:'');
    const candidate={...codeSession.item,content:value};let error='';try{renderer.code(candidate);}catch(e){error=renderer.codeError(e,candidate);}
    codeSession.value=value;codeSession.valid=!error;
    composer.querySelector('.element-input-error').textContent=error;composer.querySelector('.text-input-done').disabled=!!error;
    codeInput.style.height='0px';codeInput.style.height=Math.max(22,Math.min(66,codeInput.scrollHeight))+'px';
    let element=paper.querySelector('.element-code-draft');if(!element){element=document.createElement('div');element.className='editor-object element-code-draft';element.dataset.kind=candidate.kind;paper.append(element);}
    element.style.cssText=`left:${candidate.x}%;top:${candidate.y}%;width:${candidate.w}%;height:${candidate.h}%;transform:rotate(${candidate.rotation||0}deg)`;
    renderer.paint(candidate,element,false);paper.querySelector(`[data-id="${candidate.id}"]`)?.style.setProperty('visibility','hidden');
  }
  function openCodeInput(item){
    if(!item||item.locked||!['barcode','qr'].includes(item.kind))return;
    if(codeSession){codeInput.focus();return;}
    closeEncoding();codeSession={item:structuredClone(item),touched:false,value:item.content,valid:true};
    properties.hidden=true;menu.hidden=true;composer.hidden=false;screen.classList.add('is-text-input');
    codeInput.value=item.content==='123456'?'':item.content;codeInput.placeholder=item.content==='123456'?'123456':'请输入内容';
    composer.querySelector('.text-composer-top span').textContent='编辑'+titles[item.kind];previewCodeInput();codeInput.focus({preventScroll:true});editor.renderToolbar?.();
  }
  function finishCodeInput(cancel=false){
    if(!codeSession||!cancel&&!codeSession.valid)return;
    const session=codeSession;codeSession=null;paper.querySelector('.element-code-draft')?.remove();codeInput.blur();screen.classList.remove('is-text-input');screen.style.removeProperty('--editor-keyboard-inset');composer.hidden=true;
    const item=state.items.find(item=>item.id===session.item.id);
    if(!cancel&&item&&session.value!==item.content)editor.commit(()=>{
      item.content=session.value;
      if(item.kind==='qr'&&item.encoding==='PDF417'){const encoded=renderer.code(item);item.w=item.h/100*state.height*(encoded.width/encoded.height)/state.width*100;}
    });else editor.render();
  }
  codeInput.addEventListener('input',()=>{codeSession.touched=true;previewCodeInput();});
  codeInput.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();finishCodeInput(true);}if(event.key==='Enter'&&!event.isComposing){event.preventDefault();finishCodeInput();}});
  composer.querySelector('.text-input-done').onclick=()=>finishCodeInput();composer.querySelector('.text-input-cancel').onclick=()=>finishCodeInput(true);composer.querySelector('.text-input-clear').onclick=()=>{codeInput.value='';codeSession.touched=true;previewCodeInput();codeInput.focus();};
  function keyboard(){if(!codeSession)return;const viewport=window.visualViewport;screen.style.setProperty('--editor-keyboard-inset',viewport&&matchMedia('(max-width:760px)').matches?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)+'px':'0px');}
  window.visualViewport?.addEventListener('resize',keyboard);window.visualViewport?.addEventListener('scroll',keyboard);
  async function chooseMaterial(id){
    const asset=catalog.find(asset=>asset.id===id);if(!asset||!['icon','border'].includes(asset.kind))return;
    const request=++assetRequest,target=unlocked(),replace=target?.kind===asset.kind;if(replace&&target.assetId===id)return;assetStatus.set(id,{status:'loading',progress:0});renderPanel();
    try{
      let content=renderer.assets.get(id);
      if(!content){
        const response=await fetch(asset.url);if(!response.ok)throw new Error('资源加载失败');
        const total=Number(response.headers.get('content-length')),reader=response.body.getReader(),chunks=[];let length=0;
        while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);length+=value.length;assetStatus.set(id,{status:'loading',progress:total?Math.min(99,Math.round(length/total*100)):0});if(request===assetRequest&&!properties.hidden)renderPanel();}
        const bytes=new Uint8Array(length);let start=0;chunks.forEach(chunk=>{bytes.set(chunk,start);start+=chunk.length;});content=new TextDecoder().decode(bytes);if(!content.includes('<svg'))throw new Error('素材格式不正确');renderer.assets.set(id,content);
      }
      assetStatus.set(id,{status:'ready',progress:100});if(request!==assetRequest||!screen.classList.contains('active')||kindNow()!==asset.kind)return;
      history=[id,...history.filter(value=>value!==id)].slice(0,30);persist();
      const fields={assetId:id,assetName:asset.name,src:asset.url};
      if(replace){
        if(!target||target.kind!==asset.kind||unlocked()?.id!==target.id)return;
        editor.commit(()=>Object.assign(target,fields));
      }else{
        const size=Math.min(80,paper.clientHeight*.5);addItem(createItem(asset.kind,fields,size,size),'material');
      }
    }catch{assetStatus.set(id,{status:'error',progress:0});renderPanel();toast('fail','素材加载失败，点击重试');}
  }
  function favorite(id){if(!authState.loggedIn){pendingFavorite=id;startLogin('editor');return;}favorites=favorites.includes(id)?favorites.filter(value=>value!==id):[id,...favorites];persist();renderPanel();}
  function align(direction){
    const item=unlocked();if(!item)return;const r=geometry.rect(item);
    editor.commit(()=>{if(direction==='left')item.x-=r.left/state.width*100;if(direction==='center')item.x+=(state.width/2-r.cx)/state.width*100;if(direction==='right')item.x+=(state.width-r.right)/state.width*100;if(direction==='top')item.y-=r.top/state.height*100;if(direction==='middle')item.y+=(state.height/2-r.cy)/state.height*100;if(direction==='bottom')item.y+=(state.height-r.bottom)/state.height*100;});
  }
  function nudge(direction,amount=.1){const item=unlocked();if(!item)return;editor.commit(()=>{item.x+=(direction==='left'?-amount:direction==='right'?amount:0)/state.width*100;item.y+=(direction==='up'?-amount:direction==='down'?amount:0)/state.height*100;});}
  let nudgeHeld=false,nudgeSession=null,nudgeTimer=null,nudgeRepeat=null;
  body.addEventListener('pointerdown',event=>{
    const button=event.target.closest('[data-element-nudge]'),item=unlocked();if(!button||!item)return;
    nudgeHeld=false;nudgeSession={id:item.id,direction:button.dataset.elementNudge,x:item.x,y:item.y,amount:0};
    nudgeTimer=setTimeout(()=>{nudgeHeld=true;const tick=()=>{if(!nudgeSession)return;const s=nudgeSession;s.amount+=.1;const element=paper.querySelector(`[data-id="${s.id}"]`);if(!element)return;element.style.left=s.x+(s.direction==='left'?-s.amount:s.direction==='right'?s.amount:0)/state.width*100+'%';element.style.top=s.y+(s.direction==='up'?-s.amount:s.direction==='down'?s.amount:0)/state.height*100+'%';};tick();nudgeRepeat=setInterval(tick,80);},350);
  });
  function stopNudge(){clearTimeout(nudgeTimer);clearInterval(nudgeRepeat);const s=nudgeSession;nudgeSession=null;if(nudgeHeld&&s?.amount&&state.selected===s.id)nudge(s.direction,s.amount);setTimeout(()=>nudgeHeld=false,0);}
  document.addEventListener('pointerup',stopNudge);document.addEventListener('pointercancel',stopNudge);
  paper.addEventListener('pointerdown',event=>{
    const element=event.target.closest('.editor-graphic');if(!element||codeSession||imageSession||event.button>0)return;
    const item=state.items.find(value=>value.id===element.dataset.id);if(!item)return;
    event.stopPropagation();dragged=false;const handle=event.target.closest('[data-element-handle]')?.dataset.elementHandle;
    if(item.locked&&handle!=='delete'){toast('warn','当前元素已锁定');return;}
    if(handle==='delete'){event.preventDefault();pickerKind=null;editor.commit(()=>{state.items=state.items.filter(value=>value.id!==item.id);state.selected=null;});return;}
    const rect=element.getBoundingClientRect();gesture={id:event.pointerId,item:structuredClone(item),handle:handle||'move',x:event.clientX,y:event.clientY,cx:rect.x+rect.width/2,cy:rect.y+rect.height/2,preview:null};
  });
  paper.addEventListener('click',event=>{if(event.target.closest('[data-element-handle]')){event.preventDefault();event.stopPropagation();}},true);
  paper.addEventListener('dblclick',event=>{const item=selected();if(item?.kind==='image'&&!item.locked&&event.target.closest('.editor-graphic'))startImageEditor(item.src,item);});
  document.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.hypot(dx,dy)<4&&!dragged)return;
    if(!dragged){dragged=true;editor.select(gesture.item.id);paper.setPointerCapture(event.pointerId);closeEncoding();}
    const original=gesture.item,preview=structuredClone(original),config=renderer.settings(original);
    if(gesture.handle==='move'){preview.x+=dx/(paper.clientWidth*state.zoom)*100;preview.y+=dy/(paper.clientHeight*state.zoom)*100;geometry.guideMove(preview);}
    if(gesture.handle==='resize')Object.assign(preview,geometry.resizeFromCorner(original,dx/state.zoom,dy/state.zoom,config.equal||original.kind==='qr'));
    if(gesture.handle==='rotate'){const a=Math.atan2(gesture.y-gesture.cy,gesture.x-gesture.cx),b=Math.atan2(event.clientY-gesture.cy,event.clientX-gesture.cx);preview.rotation=Math.round(((original.rotation||0)+(b-a)*180/Math.PI)/5)*5;}
    gesture.preview=preview;const element=paper.querySelector(`[data-id="${original.id}"]`);element.style.cssText=`left:${preview.x}%;top:${preview.y}%;width:${preview.w}%;height:${preview.h}%;transform:rotate(${preview.rotation||0}deg)`;renderer.paint(preview,element);geometry.drawRulers(preview);
  });
  function finishGesture(event){
    if(!gesture||event.pointerId!==gesture.id)return;const s=gesture;gesture=null;
    if(s.preview){const item=state.items.find(item=>item.id===s.item.id);if(item)editor.commit(()=>Object.assign(item,s.preview));}
    geometry.clearGuides();setTimeout(()=>dragged=false,0);
  }
  document.addEventListener('pointerup',finishGesture);document.addEventListener('pointercancel',finishGesture);
  async function chooseImage(){
    const picker=document.createElement('input');picker.type='file';picker.accept='image/*';
    picker.onchange=()=>{const file=picker.files[0];if(!file)return;const reader=new FileReader();reader.onerror=()=>toast('fail','图片读取失败，请重新选择');reader.onload=()=>startImageEditor(reader.result);reader.readAsDataURL(file);};picker.click();
  }
  async function startImageEditor(source,target=null){
    try{
      const image=await renderer.loadImage(source);if(!screen.classList.contains('active'))return;
      const overlay=document.createElement('section');overlay.className='element-image-editor';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','编辑图片');
      overlay.innerHTML=`<header class="topbar"><button type="button" class="back" data-image-cancel aria-label="取消图片编辑">${glyph('close')}</button><h1>编辑图片</h1><button type="button" class="element-image-done primary">完成</button></header><div class="element-image-stage"><div class="element-image-frame"><img alt="图片裁剪预览" draggable="false"><div class="element-crop-box"><span class="element-crop-grid"></span><button type="button" class="element-crop-resize" aria-label="调整裁剪区域"></button></div></div></div><div class="element-image-tools"><div class="element-image-edit-actions"><button type="button" data-image-rotate>${glyph('rotate')}旋转</button><button type="button" data-image-reset>${glyph('retry')}还原</button></div><div class="element-image-crop-ratios">${['原图','1:1','3:4','4:3','9:16','16:9'].map(value=>`<button type="button" data-image-ratio="${value}" aria-pressed="${value==='原图'}">${value}</button>`).join('')}</div></div>`;
      document.getElementById('phone').append(overlay);imageSession={overlay,source,working:source,image,target,crop:{x:0,y:0,w:1,h:1},rotation:0,drag:null};
      const preview=overlay.querySelector('img');preview.src=source;fitImageEditor();editor.renderToolbar?.();
      const close=()=>{overlay.remove();imageSession=null;editor.renderToolbar?.();};
      overlay.querySelector('[data-image-cancel]').onclick=close;
      overlay.querySelector('.element-image-done').onclick=async()=>{
        if(!imageSession)return;const session=imageSession,button=overlay.querySelector('.element-image-done');button.disabled=true;
        try{
          const c=session.crop,canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(session.image.naturalWidth*c.w));canvas.height=Math.max(1,Math.round(session.image.naturalHeight*c.h));
          const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(session.image,c.x*session.image.naturalWidth,c.y*session.image.naturalHeight,c.w*session.image.naturalWidth,c.h*session.image.naturalHeight,0,0,canvas.width,canvas.height);
          const src=canvas.toDataURL('image/png'),ratio=canvas.width/canvas.height;close();
          if(session.target){editor.commit(()=>{session.target.src=src;session.target.h=session.target.w/100*state.width/ratio/state.height*100;});}
          else{const width=Math.min(160,paper.clientWidth*.6,paper.clientHeight*.65*ratio);addItem(createItem('image',{src,originalSrc:source},width,width/ratio),'style');}
        }catch{button.disabled=false;toast('fail','图片处理失败，请重试');}
      };
      overlay.querySelector('[data-image-rotate]').onclick=async()=>{
        const session=imageSession;if(!session)return;const canvas=document.createElement('canvas');canvas.width=session.image.naturalHeight;canvas.height=session.image.naturalWidth;const ctx=canvas.getContext('2d');ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(session.image,0,0);session.working=canvas.toDataURL('image/png');session.image=await renderer.loadImage(session.working);session.crop={x:0,y:0,w:1,h:1};preview.src=session.working;fitImageEditor();
      };
      overlay.querySelector('[data-image-reset]').onclick=async()=>{const session=imageSession;if(!session)return;session.working=source;session.image=image;session.crop={x:0,y:0,w:1,h:1};preview.src=source;overlay.querySelectorAll('[data-image-ratio]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.imageRatio==='原图')));fitImageEditor();};
      overlay.querySelectorAll('[data-image-ratio]').forEach(button=>button.onclick=()=>{
        const session=imageSession;if(!session)return;const value=button.dataset.imageRatio;
        overlay.querySelectorAll('[data-image-ratio]').forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
        if(value==='原图')session.crop={x:0,y:0,w:1,h:1};else{const [a,b]=value.split(':').map(Number),ratio=a/b/(session.image.naturalWidth/session.image.naturalHeight);session.crop=ratio>=1?{x:0,y:(1-1/ratio)/2,w:1,h:1/ratio}:{x:(1-ratio)/2,y:0,w:ratio,h:1};}fitCrop();
      });
      const crop=overlay.querySelector('.element-crop-box');crop.addEventListener('pointerdown',event=>{event.preventDefault();crop.setPointerCapture(event.pointerId);imageSession.drag={id:event.pointerId,x:event.clientX,y:event.clientY,old:{...imageSession.crop},resize:!!event.target.closest('.element-crop-resize')};});
      crop.addEventListener('pointermove',event=>{const s=imageSession,d=s?.drag;if(!d||d.id!==event.pointerId)return;const frame=overlay.querySelector('.element-image-frame').getBoundingClientRect(),dx=(event.clientX-d.x)/frame.width,dy=(event.clientY-d.y)/frame.height;
        s.crop=d.resize?{...d.old,w:Math.max(.08,Math.min(1-d.old.x,d.old.w+dx)),h:Math.max(.08,Math.min(1-d.old.y,d.old.h+dy))}:{...d.old,x:Math.max(0,Math.min(1-d.old.w,d.old.x+dx)),y:Math.max(0,Math.min(1-d.old.h,d.old.y+dy))};fitCrop();});
      const end=()=>{if(imageSession)imageSession.drag=null;};crop.addEventListener('pointerup',end);crop.addEventListener('pointercancel',end);
    }catch{toast('fail','无法读取这张图片，请选择有效的图片文件');}
  }
  function fitCrop(){if(!imageSession)return;const {overlay,crop}=imageSession;overlay.querySelector('.element-crop-box').style.cssText=`left:${crop.x*100}%;top:${crop.y*100}%;width:${crop.w*100}%;height:${crop.h*100}%`;}
  function fitImageEditor(){if(!imageSession)return;const {overlay,image}=imageSession,stage=overlay.querySelector('.element-image-stage'),frame=overlay.querySelector('.element-image-frame');const scale=Math.min((stage.clientWidth-44)/image.naturalWidth,(stage.clientHeight-36)/image.naturalHeight);frame.style.width=Math.max(1,image.naturalWidth*scale)+'px';frame.style.height=Math.max(1,image.naturalHeight*scale)+'px';fitCrop();}
  window.addEventListener('resize',fitImageEditor);
  new MutationObserver(()=>{
    if(!screen.classList.contains('active')){closeEncoding();geometry.clearGuides();assetRequest++;if(codeSession)finishCodeInput(true);if(imageSession){imageSession.overlay.remove();imageSession=null;}}
    else if(pendingFavorite){const id=pendingFavorite;pendingFavorite=null;if(authState.loggedIn)favorite(id);}
  }).observe(screen,{attributes:true,attributeFilter:['class']});
  window.esprintElements={addFromMenu,addScannedCode(kind,content,encoding){
    if(!['qr','barcode'].includes(kind)||!content)throw new Error('未识别到有效编码');
    const size=Math.min(110,paper.clientWidth*.65,paper.clientHeight*.6);
    const item=createItem(kind,{content,encoding,codeStyle:'below',codeFont:state.width>=60?10:4},kind==='qr'?size:Math.min(200,paper.clientWidth*.8),kind==='qr'?size:Math.min(75,paper.clientHeight*.4));
    renderer.code(item);addItem(item,'content');return item;
  },dismissPanel(){pickerKind=null;assetRequest++;closeEncoding();},refresh,viewChanged,openCodeInput,isEditing:()=>!!codeSession||!!imageSession,consumeClick:()=>dragged};
  refresh();
})();
