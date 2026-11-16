/* V1.0.0. Reference: 文字.mp4; rendering and state remain local to this prototype. */
(() => {
  const editor = window.esprintEditor;
  if (!editor) return;
  const { state, screen, paper, dock, menu, workspace } = editor;
  const footer = editor.actions;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icons = {
    minus:'<path d="M5 12h14"/>', plus:'<path d="M5 12h14M12 5v14"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    left:'<path d="M4 5h16M4 10h10M4 15h16M4 20h10"/>',
    center:'<path d="M4 5h16M7 10h10M4 15h16M7 20h10"/>',
    right:'<path d="M4 5h16M10 10h10M4 15h16M10 20h10"/>',
    straight:'<path d="M3 20h18M4 13l2-7 2 7m-3.5-2h3M11 6v7h2a1.8 1.8 0 0 0 0-3.5H11m0-3.5h1.5a1.75 1.75 0 0 1 0 3.5M21 7a3 3 0 1 0 0 5"/>',
    curved:'<path d="M3 20q9-12 18 0M3 12l-1-6 5 4m-4-1 2.5-1.5M9 3v6h2a1.5 1.5 0 0 0 0-3H9m0-3h1.5a1.5 1.5 0 0 1 0 3M20 8a3 3 0 1 0-2 5"/>',
    alignLeft:'<path d="M4 3v18M8 7h12v3H8zm0 7h7v3H8z"/>',
    alignCenter:'<path d="M12 3v18M4 7h16v3H4zm4 7h8v3H8z"/>',
    alignRight:'<path d="M20 3v18M4 7h12v3H4zm5 7h7v3H9z"/>',
    alignTop:'<path d="M3 4h18M7 8h3v12H7zm7 0h3v7h-3z"/>',
    alignMiddle:'<path d="M3 12h18M7 4h3v16H7zm7 4h3v8h-3z"/>',
    alignBottom:'<path d="M3 20h18M7 4h3v12H7zm7 5h3v7h-3z"/>',
    up:'<path d="M12 19V5m-5 5 5-5 5 5"/>', down:'<path d="M12 5v14m-5-5 5 5 5-5"/>',
    nudgeLeft:'<path d="M19 12H5m5-5-5 5 5 5"/>', nudgeRight:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
    resize:'<path d="M5 15v4h4M19 9V5h-4M5 19l14-14"/>',
    rotate:'<path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"/>',
    star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .4-1 1.2-1 2.2M12 17v.1"/>',
    history:'<path d="M3 3v6h6M3 9a9 9 0 1 1 1 9M12 7v6l4 2"/>'
  };
  const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.close}</svg>`;
  const fonts = [
    {id:'system',name:'默认字体',family:'-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',group:'zh'},
    {id:'pingfang',name:'苹方',family:'"PingFang SC", "Microsoft YaHei", sans-serif',group:'zh'},
    {id:'songti',name:'宋体',family:'"Songti SC", "STSong", "SimSun", serif',group:'zh'},
    {id:'kaiti',name:'楷体',family:'"Kaiti SC", "STKaiti", "KaiTi", serif',group:'zh'},
    {id:'heiti',name:'黑体',family:'"Heiti SC", "STHeiti", sans-serif',group:'zh'},
    {id:'serif',name:'经典衬线',family:'Georgia, "Times New Roman", serif',group:'en'},
    {id:'mono',name:'等宽字体',family:'"SFMono-Regular", Menlo, Consolas, monospace',group:'en'},
    {id:'rounded',name:'圆润字体',family:'"Arial Rounded MT Bold", "Hiragino Maru Gothic ProN", sans-serif',group:'en'},
    {id:'liberation',name:'Liberation Sans',family:'"ESPrint Liberation", Arial, sans-serif',face:'ESPrint Liberation',url:'vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf',group:'en'},
    {id:'liberation-italic',name:'Liberation Italic',family:'"ESPrint Liberation Italic", Georgia, serif',face:'ESPrint Liberation Italic',url:'vendor/pdfjs/standard_fonts/LiberationSans-Italic.ttf',group:'en'}
  ];
  const fontFor = id => fonts.find(font => font.id === id) || fonts[0];
  const tabs = new Map();
  const resources = new Map();
  let category = 'all', currentId = null, inputSession = null;
  let warningDismissed = new Set(), textSequence = 1, dragged = false, gesture = null;
  let cachedPreview = '', previewFrame = 0;
  let pendingFavorite = null;
  function readList(key) { try { return JSON.parse(localStorage.getItem(key) || '[]').filter(id => fonts.some(font => font.id === id)); } catch { return []; } }
  let history = readList('esprint-text-font-history'), favorites = readList('esprint-text-font-favorites');
  const persist = () => { try { localStorage.setItem('esprint-text-font-history',JSON.stringify(history)); localStorage.setItem('esprint-text-font-favorites',JSON.stringify(favorites)); } catch {} };
  const defaults = () => ({ size: state.width >= 60 ? 22 : 6, font: state.textDefaultFont || 'system', bold:false, italic:false, underline:false, strike:false, align:'center', letterSpacing:0, lineSpacing:0, wordWrap:false, invert:false, curved:false, angle:180 });
  const supports = kind => ['text','time','serial','table'].includes(kind);
  const styleFor = item => ({...defaults(), ...(window.esprintData?.styleTarget(item) || item.textStyle)});
  const textItem = () => { const item = editor.selected(); return supports(item?.kind) && !item.locked ? item : null; };
  const properties = document.createElement('section');
  properties.className = 'text-properties'; properties.hidden = true; properties.setAttribute('aria-label','文字属性');
  properties.innerHTML = `<div class="text-property-tabs" role="tablist" aria-label="文字设置"><button type="button" role="tab" data-text-tab="content" aria-selected="false">内容</button>${[['font','字体'],['style','样式'],['alignment','对齐']].map(([key,label])=>`<button type="button" role="tab" id="text-tab-${key}" data-text-tab="${key}" aria-selected="false" aria-controls="text-property-body">${label}</button>`).join('')}</div><div class="text-property-body" id="text-property-body" role="tabpanel"></div>`;
  dock.append(properties);
  const body = properties.querySelector('.text-property-body');
  const composer = document.createElement('section');
  composer.className = 'editor-text-composer'; composer.hidden = true; composer.setAttribute('aria-label','文字输入');
  composer.innerHTML = `<div class="text-composer-top"><span>编辑文字</span><button type="button" class="text-input-cancel" aria-label="取消文字输入">${glyph('close')}</button></div><div class="text-composer-row"><div class="text-composer-field"><textarea rows="1" placeholder="请输入文字" aria-label="标签文字" enterkeyhint="done"></textarea><button type="button" class="text-input-clear" aria-label="清空当前输入">${glyph('close')}</button></div><button type="button" class="text-input-done primary">完成</button></div>`;
  dock.append(composer);
  const input = composer.querySelector('textarea');
  const activeTab = () => tabs.get(state.selected) || window.esprintData?.defaultTab(editor.selected()) || 'style';
  const stepper = (key,label,value,min,max,step) => `<div class="text-spacing-group"><span>${label}</span><div class="text-spacing-control"><button type="button" class="text-step-button" data-step="${key}" data-delta="-${step}" aria-label="减少${label}" ${value<=min?'disabled':''}>${glyph('minus')}</button><output data-value="${key}">${value.toFixed(1)}</output><button type="button" class="text-step-button" data-step="${key}" data-delta="${step}" aria-label="增加${label}" ${value>=max?'disabled':''}>${glyph('plus')}</button></div><input class="text-range text-mini-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${key}" aria-label="${label}" style="--range-progress:${(value-min)/(max-min)*100}%"></div>`;
  function layoutMarkup(s) {
    return `<div class="text-layout-card"><div class="text-layout-row"><span class="text-field-label">排列</span><div class="text-layout-modes" role="group" aria-label="文字排列"><button type="button" data-layout="straight" aria-pressed="${!s.curved}">${glyph('straight')}直线</button><button type="button" data-layout="curved" aria-pressed="${s.curved}">${glyph('curved')}弯曲</button></div></div>${s.curved?`<div class="text-curve-control"><input type="range" class="text-range" data-range="angle" min="-360" max="360" step="1" value="${s.angle}" aria-label="弯曲角度" style="--range-progress:${(s.angle+360)/720*100}%"><output data-value="angle">${s.angle}°</output></div>`:''}</div>`;
  }
  function styleMarkup(item) {
    const s = styleFor(item);
    return `${item.kind==='table'?layoutMarkup({...s,curved:false}).replaceAll('data-layout=', 'disabled data-layout='):layoutMarkup(s)}${s.size<5&&!warningDismissed.has(item.id)?`<div class="text-small-warning"><span>字号较小，打印时可能不够清晰</span><button type="button" data-dismiss-warning aria-label="关闭字号提示">${glyph('close')}</button></div>`:''}<div class="text-control-card"><div class="text-size-row"><span class="text-field-label">字号</span><input type="range" class="text-range" min="1" max="120" step="1" value="${s.size}" data-range="size" aria-label="字号" style="--range-progress:${(s.size-1)/119*100}%"><output data-value="size">${s.size}</output><button type="button" class="text-step-button" data-step="size" data-delta="-1" aria-label="减小字号" ${s.size<=1?'disabled':''}>${glyph('minus')}</button><button type="button" class="text-step-button" data-step="size" data-delta="1" aria-label="增大字号" ${s.size>=120?'disabled':''}>${glyph('plus')}</button></div><div class="text-format-row">${[['bold','粗体','<b>B</b>'],['underline','下划线','<span class="type-underline">U</span>'],['italic','斜体','<span class="type-italic">I</span>'],['strike','删除线','<span class="type-strike">S</span>']].map(([key,label,mark])=>`<button type="button" data-style-toggle="${key}" aria-label="${label}" aria-pressed="${s[key]}" ${s.curved&&['underline','strike'].includes(key)?'disabled':''}>${mark}</button>`).join('')}${['left','center','right'].map((key,index)=>`<button type="button" data-text-align="${key}" aria-label="文字${['左对齐','居中','右对齐'][index]}" aria-pressed="${s.align===key}">${glyph(key)}</button>`).join('')}</div></div><div class="text-spacing-row">${stepper('letterSpacing','字距',s.letterSpacing,0,5,.1)}${stepper('lineSpacing','行距',s.lineSpacing,-5,5,.1)}</div><div class="text-toggle-row"><label id="text-word-wrap-label">单词换行</label><button type="button" class="text-switch" role="switch" aria-labelledby="text-word-wrap-label" aria-checked="${s.wordWrap}" data-style-toggle="wordWrap"></button></div><div class="text-toggle-row"><span class="text-toggle-label" id="text-invert-label">反白<button type="button" class="text-help-trigger" data-reverse-help aria-label="反白说明">${glyph('help')}</button></span><button type="button" class="text-switch" role="switch" aria-labelledby="text-invert-label" aria-checked="${s.invert}" data-style-toggle="invert"></button></div>`;
  }
  function fontMarkup(item) {
    const fontId = styleFor(item).font;
    const groups = [['history','最近'],['favorites','收藏'],['all','全部'],['zh','中文'],['en','英文']];
    const visible = category==='history'?history.map(id=>fontFor(id)):category==='favorites'?fonts.filter(font=>favorites.includes(font.id)):fonts.filter(font=>category==='all'||font.group===category);
    return `<div class="text-font-categories" role="group" aria-label="字体分类">${groups.map(([key,label])=>`<button type="button" data-font-category="${key}" aria-pressed="${category===key}">${key==='history'?glyph('history'):key==='favorites'?glyph('star'):''}${label}</button>`).join('')}</div>${visible.length?`<div class="text-font-grid">${visible.map(font=>{
      const resource = resources.get(font.id), ready = !font.url || resource?.status==='ready', failed = resource?.status==='error', loading = resource?.status==='loading';
      return `<div class="text-font-card"><button type="button" class="text-font-select" data-font="${font.id}" aria-label="${failed?'重试下载':ready?'使用':'下载'}${escape(font.name)}" aria-pressed="${fontId===font.id}" aria-busy="${!!loading}"><span class="text-font-sample" style="font-family:${escape(font.family)}">${font.group==='zh'?'标签文字':'Aa Bb'}</span><span class="text-font-name">${escape(font.name)}</span></button><span class="text-font-status">${failed?'重试':loading?resource.progress+'%':ready?'':glyph('download')}</span><button type="button" class="text-font-favorite" data-favorite="${font.id}" aria-label="${favorites.includes(font.id)?'取消收藏':'收藏'}${escape(font.name)}" aria-pressed="${favorites.includes(font.id)}">${glyph('star')}</button>${loading?`<span class="text-font-progress" style="width:${resource.progress}%"></span>`:''}</div>`;
    }).join('')}</div>`:'<div class="text-font-empty">'+(category==='favorites'?'还没有收藏的字体':'还没有使用记录')+'</div>'}`;
  }
  function alignmentMarkup() {
    return `<div class="text-alignment-layout"><div><span class="text-alignment-caption">画布对齐</span><div class="text-align-buttons">${[['left','alignLeft','左对齐'],['center','alignCenter','水平居中'],['right','alignRight','右对齐'],['top','alignTop','顶部对齐'],['middle','alignMiddle','垂直居中'],['bottom','alignBottom','底部对齐']].map(([key,icon,label])=>`<button type="button" data-canvas-align="${key}" aria-label="${label}" title="${label}">${glyph(icon)}</button>`).join('')}</div></div><div><span class="text-alignment-caption">微调</span><div class="text-nudge-buttons">${[['up','up','向上微移'],['left','nudgeLeft','向左微移'],['right','nudgeRight','向右微移'],['down','down','向下微移']].map(([key,icon,label])=>`<button type="button" data-nudge="${key}" aria-label="${label}">${glyph(icon)}</button>`).join('')}<span class="text-nudge-center"></span></div></div></div>`;
  }
  function renderPanel() {
    const item = textItem();
    if (!item || inputSession) return;
    const tab = activeTab(), scroll = body.dataset.item===item.id&&body.dataset.tab===tab?body.scrollTop:0;
    
    const labels=window.esprintData?.tabsFor(item) || [['content','内容'],['font','字体'],['style','样式'],['alignment','对齐']];
    const tabBar=properties.querySelector('.text-property-tabs'),order=labels.map(([key,label])=>key+label).join('|');
    if(tabBar.dataset.order!==order)tabBar.innerHTML=labels.map(([key,label])=>`<button type="button" role="tab" id="text-tab-${key}" data-text-tab="${key}" aria-selected="false" aria-controls="text-property-body">${label}</button>`).join('');
    tabBar.dataset.order=order;
    properties.setAttribute('aria-label',item.kind==='text'?'文字属性':({time:'时间',serial:'序列号',table:'表格'}[item.kind]+'属性'));
    properties.querySelectorAll('[data-text-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.textTab===tab)));
    body.setAttribute('aria-labelledby', 'text-tab-'+tab);
    body.dataset.item=item.id; body.dataset.tab=tab;
    body.innerHTML=window.esprintData?.panelMarkup(item,tab) ?? (tab==='font'?fontMarkup(item):tab==='alignment'?alignmentMarkup():styleMarkup(item));
    window.esprintData?.decoratePanel(item,tab);
    body.scrollTop=scroll;
    window.esprintEditorChrome?.syncSelectors(properties);
  }
  function refresh() {
    refreshTypography();
    const item=textItem();
    if (currentId!==state.selected) {
      if (currentId) { tabs.delete(currentId); warningDismissed.delete(currentId); }
      currentId=state.selected; 
    }
    if (inputSession || window.esprintData?.isEditing()) return;
    properties.hidden=!item; menu.hidden=!!item;  composer.hidden=true;
    if(item) renderPanel();
  }
  const measure=document.createElement('canvas').getContext('2d');
  function paint(item,element,handles=true) {
    if(item.kind==='table'){window.esprintData?.paintTable(item,element,handles);return;}
    if(['time','serial'].includes(item.kind))item={...item,text:window.esprintData?.displayText(item)||''};
    const s=styleFor(item), family=fontFor(s.font).family;
    const unit=(paper.clientWidth || 324)/state.width;
    const px=s.size*25.4/72*unit;
    element.style.height='auto';
    element.style.fontFamily=family;
    element.style.fontSize=px+'px';
    element.style.fontWeight=s.bold?'700':'400';
    element.style.fontStyle=s.italic?'italic':'normal';
    element.replaceChildren();
    const ink=document.createElement('span'); ink.className=`editor-text-ink${s.invert?' is-reversed':''}${s.curved?' is-curved':''}`;
    ink.style.cssText=`font-family:${family};font-size:${px}px;font-weight:${s.bold?700:400};font-style:${s.italic?'italic':'normal'};text-align:${s.align};letter-spacing:${s.letterSpacing*unit}px;line-height:${Math.max(.5,1.25+s.lineSpacing*.08)};overflow-wrap:${s.wordWrap?'normal':'anywhere'};word-break:${s.wordWrap?'normal':'break-all'};text-decoration:${[s.underline&&!s.curved?'underline':'',s.strike&&!s.curved?'line-through':''].filter(Boolean).join(' ')||'none'};`;
    if(s.curved&&Math.abs(s.angle)>1&&item.text) {
      const content=item.text.replace(/\n/g,' '), angle=Math.max(-359.9,Math.min(359.9,s.angle)), radians=Math.abs(angle)*Math.PI/180;
      measure.font=`${s.italic?'italic ':''}${s.bold?'700':'400'} ${px}px ${family}`;
      const length=measure.measureText(content).width+Math.max(0,content.length-1)*s.letterSpacing*unit;
      const radius=Math.max(px*.6,length/radians), sign=Math.sign(angle), points=[];
      for(let i=0;i<=90;i++){const theta=-radians/2+radians*i/90;points.push([radius*Math.sin(theta),sign*radius*(1-Math.cos(theta))]);}
      const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxX=Math.max(...points.map(p=>p[0])),maxY=Math.max(...points.map(p=>p[1])),pad=px*1.05;
      const width=Math.max(px,maxX-minX+pad*2),height=Math.max(px*1.8,maxY-minY+pad*2),id=`text-arc-${item.id}`;
      const path=points.map((p,i)=>`${i?'L':'M'}${(p[0]-minX+pad).toFixed(2)},${(p[1]-minY+pad).toFixed(2)}`).join(' ');
      ink.innerHTML=`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="${escape(content)}"><defs><path id="${id}" d="${path}"/></defs><text fill="currentColor" stroke="none" font-family="${escape(family)}" font-size="${px}" font-weight="${s.bold?700:400}" font-style="${s.italic?'italic':'normal'}" letter-spacing="${s.letterSpacing*unit}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${escape(content)}</textPath></text></svg>`;
    } else ink.textContent=item.text || '';
    element.append(ink);
    if(handles&&item.id===state.selected) {
      [['delete','close','删除文字'],['rotate','rotate','旋转文字'],['resize','resize','调整文字大小']].forEach(([key,icon,label])=>{
        const button=document.createElement('button'); button.type='button'; button.className='text-object-handle'; button.dataset.textHandle=key; button.setAttribute('aria-label',label);
        button.innerHTML=glyph(icon); button.disabled=!!item.locked&&key!=='delete'; element.append(button);
      });
    }
  }
  function refreshTypography() {
    paper.querySelectorAll('.editor-object').forEach(element=>{
      const item=state.items.find(item=>item.id===element.dataset.id);
      if(item&&supports(item.kind)) { item.textStyle ||= defaults(); paint(item,element); }
    });
    if(inputSession) previewInput();
    if(!previewFrame)previewFrame=requestAnimationFrame(()=>{previewFrame=0;if(!inputSession)previewMarkup();});
  }
  function showTab(tab) {
    if(!textItem())return;
    if(tab==='content'&&textItem().kind==='text'){openInput(textItem());return;}
    tabs.set(state.selected,tab); renderPanel();
  }
  properties.querySelector('.text-property-tabs').addEventListener('click',event=>{
    const tab=event.target.closest('[data-text-tab]')?.dataset.textTab;
    if(tab)showTab(tab);
  });
  properties.querySelector('.text-property-tabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();const order=(window.esprintData?.tabsFor(textItem())||[['content'],['font'],['style'],['alignment']]).map(([key])=>key);
    const next=order[(order.indexOf(activeTab())+(event.key==='ArrowRight'?1:order.length-1))%order.length];showTab(next);properties.querySelector(`[data-text-tab="${next}"]`).focus();
  });
  function patchStyle(patch) {
    const item=textItem();if(!item)return;
    const old=styleFor(item);
    editor.commit(()=>{
      if(item.kind==='table'){window.esprintData.applyStyle(item,patch);return;}
      item.textStyle={...old,...patch};
      if(patch.size!==undefined)item.w=Math.max(3,Math.min(240,item.w*patch.size/old.size));
      if(patch.font)state.textDefaultFont=patch.font;
    });
  }
  const limits={size:[1,120],letterSpacing:[0,5],lineSpacing:[-5,5],angle:[-360,360]};
  function rangeValue(key,value) { const [min,max]=limits[key];return Math.max(min,Math.min(max,Number(Number(value).toFixed(key==='letterSpacing'||key==='lineSpacing'?1:0)))); }
  let rangeSession=null;
  body.addEventListener('input',event=>{
    const key=event.target.dataset.range,item=textItem();if(!key||!item)return;
    if(!rangeSession)rangeSession={id:item.id,key,old:structuredClone(item),value:styleFor(item)[key]};
    const value=rangeValue(key,event.target.value),preview=structuredClone(rangeSession.old);
    if(item.kind==='table')window.esprintData.applyStyle(preview,{[key]:value});
    else preview.textStyle={...styleFor(preview),[key]:value};
    if(key==='size'&&item.kind!=='table')preview.w=Math.max(3,Math.min(240,preview.w*value/styleFor(rangeSession.old).size));
    const element=paper.querySelector(`[data-id="${item.id}"]`);element.style.width=preview.w+'%';paint(preview,element);
    event.target.style.setProperty('--range-progress',`${(value-limits[key][0])/(limits[key][1]-limits[key][0])*100}%`);
    body.querySelector(`[data-value="${key}"]`).textContent=key==='angle'?value+'°':key==='size'?value:value.toFixed(1);
    rangeSession.value=value;
  });
  function finishRange(){if(!rangeSession)return;const {key,value,id}=rangeSession;rangeSession=null;if(state.selected===id)patchStyle({[key]:value});}
  body.addEventListener('change',finishRange);
  body.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    const item=textItem();if(!item)return;
    const s=styleFor(item);
    if(button.dataset.step){const key=button.dataset.step;patchStyle({[key]:rangeValue(key,s[key]+Number(button.dataset.delta))});}
    if(button.dataset.styleToggle)patchStyle({[button.dataset.styleToggle]:!s[button.dataset.styleToggle]});
    if(button.dataset.textAlign)patchStyle({align:button.dataset.textAlign});
    if(button.hasAttribute('data-dismiss-warning')){warningDismissed.add(item.id);renderPanel();}
    if(button.dataset.layout&&s.curved!==(button.dataset.layout==='curved'))patchStyle({curved:button.dataset.layout==='curved'});
    if(button.hasAttribute('data-reverse-help'))showReverseHelp();
    if(button.dataset.fontCategory){category=button.dataset.fontCategory;renderPanel();}
    if(button.dataset.font&&!fontLongPressed)selectFont(button.dataset.font,item.id);
    if(button.dataset.favorite)toggleFavorite(button.dataset.favorite);
    if(button.dataset.canvasAlign)alignCanvas(button.dataset.canvasAlign);
    if(button.dataset.nudge&&!nudgeHeld)nudge(button.dataset.nudge);
    fontLongPressed=false;
  });
  function showReverseHelp(){
    showModal('success','反白','');
    document.getElementById('modalIcon').innerHTML=glyph('help');
    document.getElementById('modalText').innerHTML='<div class="text-reverse-example"><div>标签文字<small>普通</small></div><div>标签文字<small>反白</small></div></div><div class="text-reverse-note">开启后，文字以白色显示，背景打印为黑色。<br>注意：反白会增加黑色打印区域，建议先试打一张，确认清晰度和打印效果。</div>';
    const backdrop=document.getElementById('modal'),controller=new AbortController();
    const dismiss=event=>{if(event.target===backdrop)closeModal();};
    backdrop.addEventListener('click',dismiss,{signal:controller.signal});
    const observer=new MutationObserver(()=>{if(!backdrop.classList.contains('show')){controller.abort();observer.disconnect();}});
    observer.observe(backdrop,{attributes:true,attributeFilter:['class']});
  }
  function previewInput(){
    if(!inputSession)return;
    const original=state.items.find(item=>item.id===inputSession.id);
    let element=paper.querySelector('.editor-text-draft');
    if(!element){element=document.createElement('div');element.className='editor-object editor-text-draft';element.dataset.kind='text';paper.append(element);}
    if(original)paper.querySelector(`[data-id="${original.id}"]`)?.style.setProperty('visibility','hidden');
    const draft={...inputSession.draft,text:input.value};
    element.style.cssText=`left:${draft.x}%;top:${draft.y}%;width:${draft.w}%;transform:rotate(${draft.rotation||0}deg)`;
    element.hidden=!input.value;paint(draft,element,false);
  }
  function resizeInput(){input.style.height='0px';input.style.height=Math.min(66,Math.max(22,input.scrollHeight))+'px';composer.querySelector('.text-input-clear').disabled=!input.value;}
  function openInput(item){
    if(inputSession){input.focus();return;}
    if(item?.locked)return;
    finishRange();
    inputSession={id:item?.id,tab:activeTab(),draft:item?structuredClone(item):{id:`text-${textSequence++}`,kind:'text',x:15,y:25,w:65,h:20,rotation:0,text:'',textStyle:defaults()}};
    properties.hidden=true;menu.hidden=true;composer.hidden=false;
    screen.classList.add('is-text-input');input.value=item?.text||'';
    composer.querySelector('.text-composer-top span').textContent=item?'编辑文字':'添加文字';
    composer.querySelector('.text-input-done').disabled=!input.value.trim();
    resizeInput();previewInput();updateKeyboard();input.focus({preventScroll:true});editor.renderToolbar?.();
  }
  function finishInput(cancel=false){
    if(!inputSession)return;
    const text=input.value.trim(),session=inputSession;
    if(!cancel&&!text){input.focus();return;}
    inputSession=null;paper.querySelector('.editor-text-draft')?.remove();input.blur();
    screen.classList.remove('is-text-input');screen.style.removeProperty('--editor-keyboard-inset');
    composer.hidden=true;
    const item=state.items.find(value=>value.id===session.id);
    if(!cancel){
      const first=!item;
      const id=item?.id||session.draft.id;
      tabs.set(id,first?'font':session.tab);
      currentId=id;
      if(first||text!==item.text)editor.commit(()=>{
        if(item)item.text=text;else state.items.push({...session.draft,text});
        state.selected=id;
      });else editor.render();
    }else editor.render();
    refresh();
  }
  input.addEventListener('input',()=>{resizeInput();previewInput();composer.querySelector('.text-input-done').disabled=!input.value.trim();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();finishInput(true);}
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();finishInput();}
  });
  composer.querySelector('.text-input-done').onclick=()=>finishInput();
  composer.querySelector('.text-input-cancel').onclick=()=>finishInput(true);
  composer.querySelector('.text-input-clear').onclick=()=>{input.value='';resizeInput();previewInput();composer.querySelector('.text-input-done').disabled=true;input.focus();};
  function updateKeyboard(){
    if(!inputSession)return;
    const viewport=window.visualViewport;
    const inset=viewport&&matchMedia('(max-width:760px)').matches?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
    screen.style.setProperty('--editor-keyboard-inset',inset+'px');
  }
  window.visualViewport?.addEventListener('resize',updateKeyboard);
  window.visualViewport?.addEventListener('scroll',updateKeyboard);
  async function selectFont(id,itemId){
    const font=fontFor(id),resource=resources.get(id),scope=window.esprintData?.scopeKey(editor.selected());
    if(resource?.status==='loading')return;
    if(font.url&&resource?.status!=='ready'){
      resources.set(id,{status:'loading',progress:0});renderPanel();
      try{
        const response=await fetch(font.url);if(!response.ok)throw new Error('下载失败');
        const total=Number(response.headers.get('content-length'))||0;
        const reader=response.body.getReader(),chunks=[];let loaded=0;
        while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;resources.set(id,{status:'loading',progress:total?Math.min(99,Math.round(loaded/total*100)):0});if(activeTab()==='font')renderPanel();}
        const buffer=new Uint8Array(loaded);let offset=0;chunks.forEach(chunk=>{buffer.set(chunk,offset);offset+=chunk.length;});
        const face=new FontFace(font.face,buffer.buffer);await face.load();document.fonts.add(face);resources.set(id,{status:'ready',progress:100});
      }catch{resources.set(id,{status:'error',progress:0});if(activeTab()==='font')renderPanel();toast('fail','字体下载失败，点击重试');return;}
    }
    if(state.selected!==itemId||!textItem()||!screen.classList.contains('active')||scope!==window.esprintData?.scopeKey(editor.selected()))return;
    history=[id,...history.filter(value=>value!==id)].slice(0,10);persist();patchStyle({font:id});
  }
  function toggleFavorite(id){
    if(!authState.loggedIn){pendingFavorite=id;startLogin('editor');return;}
    favorites=favorites.includes(id)?favorites.filter(value=>value!==id):[id,...favorites];persist();renderPanel();
  }
  let fontLongPressed=false,fontPressTimer=null,fontPressOrigin=null;
  body.addEventListener('pointerdown',event=>{
    const button=event.target.closest('[data-font]');if(!button)return;
    fontLongPressed=false;fontPressOrigin={x:event.clientX,y:event.clientY};
    fontPressTimer=setTimeout(()=>{fontLongPressed=true;toggleFavorite(button.dataset.font);},500);
  });
  body.addEventListener('pointermove',event=>{if(fontPressOrigin&&Math.hypot(event.clientX-fontPressOrigin.x,event.clientY-fontPressOrigin.y)>7)clearTimeout(fontPressTimer);});
  const stopFontPress=()=>{clearTimeout(fontPressTimer);fontPressOrigin=null;};
  document.addEventListener('pointerup',stopFontPress);document.addEventListener('pointercancel',stopFontPress);
  body.addEventListener('contextmenu',event=>{if(event.target.closest('[data-font]'))event.preventDefault();});
  function itemHeight(item){const element=paper.querySelector(`[data-id="${item.id}"]`);return(element?.offsetHeight||0)/(paper.clientHeight||1)*100;}
  function alignCanvas(direction){
    const item=textItem();if(!item)return;
    editor.commit(()=>{if(direction==='left')item.x=0;if(direction==='center')item.x=(100-item.w)/2;if(direction==='right')item.x=100-item.w;if(direction==='top')item.y=0;if(direction==='middle')item.y=(100-itemHeight(item))/2;if(direction==='bottom')item.y=100-itemHeight(item);});
  }
  function nudge(direction,amount=.1){
    const item=textItem();if(!item)return;
    editor.commit(()=>{item.x+=direction==='left'?-amount/state.width*100:direction==='right'?amount/state.width*100:0;item.y+=direction==='up'?-amount/state.height*100:direction==='down'?amount/state.height*100:0;});
  }
  let nudgeHeld=false,nudgeTimer=null,nudgeRepeat=null,nudgeSession=null;
  body.addEventListener('pointerdown',event=>{
    const button=event.target.closest('[data-nudge]'),item=textItem();if(!button||!item)return;
    nudgeHeld=false;
    nudgeSession={item,original:{x:item.x,y:item.y},direction:button.dataset.nudge,amount:0};
    nudgeTimer=setTimeout(()=>{
      nudgeHeld=true;
      const tick=()=>{
        if(!nudgeSession)return;const s=nudgeSession;s.amount+=.1;
        const x=s.original.x+(s.direction==='left'?-s.amount/state.width*100:s.direction==='right'?s.amount/state.width*100:0),y=s.original.y+(s.direction==='up'?-s.amount/state.height*100:s.direction==='down'?s.amount/state.height*100:0);
        const element=paper.querySelector(`[data-id="${s.item.id}"]`);if(element){element.style.left=x+'%';element.style.top=y+'%';}
      };
      tick();nudgeRepeat=setInterval(tick,80);
    },350);
  });
  function stopNudge(){
    clearTimeout(nudgeTimer);clearInterval(nudgeRepeat);
    const session=nudgeSession;nudgeSession=null;
    if(nudgeHeld&&session?.amount&&state.selected===session.item.id)nudge(session.direction,session.amount);
    setTimeout(()=>{nudgeHeld=false;},0);
  }
  document.addEventListener('pointerup',stopNudge);document.addEventListener('pointercancel',stopNudge);
  paper.addEventListener('pointerdown',event=>{
    const element=event.target.closest('.editor-object');if(!element||!supports(element.dataset.kind)||inputSession||window.esprintData?.isEditing()||event.button>0)return;
    const item=state.items.find(item=>item.id===element.dataset.id);if(!item)return;
    const handle=event.target.closest('[data-text-handle]')?.dataset.textHandle;
    if(item.locked&&handle!=='delete'){event.stopPropagation();toast('warn','当前元素已锁定');return;}
    event.stopPropagation();dragged=false;
    if(handle==='delete'){event.preventDefault();editor.commit(()=>{state.items=state.items.filter(value=>value.id!==item.id);state.selected=null;});return;}
    const rect=element.getBoundingClientRect();
    gesture={id:event.pointerId,item:structuredClone(item),handle:handle||'move',x:event.clientX,y:event.clientY,center:{x:rect.x+rect.width/2,y:rect.y+rect.height/2},preview:null};
  });
  paper.addEventListener('click',event=>{
    if(event.target.closest('[data-text-handle]')){event.stopPropagation();event.preventDefault();}
  },true);
  document.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(Math.hypot(dx,dy)<4&&!dragged)return;
    if(!dragged){dragged=true;editor.select(gesture.item.id);paper.setPointerCapture(event.pointerId);}
    const original=gesture.item,preview=structuredClone(original),baseWidth=paper.clientWidth*state.zoom,baseHeight=paper.clientHeight*state.zoom;
    if(gesture.handle==='move'){preview.x+=dx/baseWidth*100;preview.y+=dy/baseHeight*100;window.esprintGeometry?.guideMove(preview);}
    if(gesture.handle==='rotate'){
      const a=Math.atan2(gesture.y-gesture.center.y,gesture.x-gesture.center.x),b=Math.atan2(event.clientY-gesture.center.y,event.clientX-gesture.center.x);
      preview.rotation=Math.round((original.rotation+(b-a)*180/Math.PI)/5)*5;
    }
    if(gesture.handle==='resize'&&original.kind==='table'){Object.assign(preview,window.esprintData.resizeTable(original,dx,dy));}
    if(gesture.handle==='resize'&&original.kind!=='table'){
      const rad=(original.rotation||0)*Math.PI/180,localX=dx*Math.cos(rad)+dy*Math.sin(rad);
      preview.w=Math.max(8,Math.min(240,original.w+localX/baseWidth*100));
      const s=styleFor(original);preview.textStyle={...s,size:Math.max(1,Math.min(120,Number((s.size*preview.w/original.w).toFixed(1))))};
    }
    gesture.preview=preview;
    const element=paper.querySelector(`[data-id="${original.id}"]`);element.style.left=preview.x+'%';element.style.top=preview.y+'%';element.style.width=preview.w+'%';element.style.transform=`rotate(${preview.rotation||0}deg)`;paint(preview,element);
  });
  function finishGesture(event){
    if(!gesture||event.pointerId!==gesture.id)return;
    const value=gesture;gesture=null;
    if(value.preview){const item=state.items.find(item=>item.id===value.item.id);if(item)editor.commit(()=>Object.assign(item,value.preview));}
    window.esprintGeometry?.clearGuides();
    setTimeout(()=>{dragged=false;},0);
  }
  document.addEventListener('pointerup',finishGesture);document.addEventListener('pointercancel',finishGesture);
  function previewMarkup(index=0){
    index=Number.isInteger(index)&&index>=0?index:0;
    const width=paper.clientWidth,height=paper.clientHeight;if(!width||!height)return indexedPreview(cachedPreview,index);
    const container=document.createElement('div');container.setAttribute('xmlns','http://www.w3.org/1999/xhtml');container.style.cssText=`position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#fff;`;
    const keys=['position','left','top','width','height','min-width','min-height','display','padding','box-sizing','transform','transform-origin','font-family','font-size','font-weight','font-style','text-align','line-height','letter-spacing','white-space','overflow-wrap','word-break','text-decoration','color','background','border','border-radius','align-items','justify-content','flex','flex-direction','gap','object-fit','filter','overflow'];
    function copyStyles(source,target){
      const computed=getComputedStyle(source);if(source.namespaceURI!=='http://www.w3.org/2000/svg')target.removeAttribute('id');target.removeAttribute('class');target.removeAttribute('data-id');
      // SVG geometry such as pattern width/height must retain its own attributes.
      // Applying an HTML layout snapshot to defs silently makes patterns empty.
      if(source.namespaceURI!=='http://www.w3.org/2000/svg'||source.localName==='svg')target.style.cssText=keys.map(key=>`${key}:${computed.getPropertyValue(key)}`).join(';');
      [...source.children].forEach((child,i)=>{if(target.children[i])copyStyles(child,target.children[i]);});
    }
    paper.querySelectorAll('.editor-object:not(.editor-text-draft):not(.element-code-draft)').forEach(element=>{
      const clone=element.cloneNode(true);
      if(element.dataset.kind==='serial'){clone.dataset.outputSerial=element.dataset.id;clone.querySelector('.editor-text-ink')?.setAttribute('data-serial-ink','');}
      copyStyles(element,clone);clone.querySelectorAll('button,[data-editor-only]').forEach(button=>button.remove());
      // Keep references inside this output. A hidden editor can otherwise capture
      // a duplicate pattern/text-path ID and leave the printed art unfilled.
      const ids=new Map();clone.querySelectorAll('[id]').forEach((node,index)=>{const id=`esprint-output-${container.children.length}-${index}`;ids.set(node.id,id);node.id=id;});
      clone.querySelectorAll('*').forEach(node=>{for(const attribute of [...node.attributes]){
        let value=attribute.value;
        for(const [from,to] of ids){value=value.split(`url(#${from})`).join(`url(#${to})`);if((attribute.localName==='href')&&value==='#'+from)value='#'+to;}
        if(value!==attribute.value)node.setAttributeNS(attribute.namespaceURI,attribute.name,value);
      }});
      clone.style.visibility='visible';clone.style.outline='none';container.append(clone);
    });
    cachedPreview=`<svg class="editor-output-art" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="当前标签内容"><foreignObject width="${width}" height="${height}">${container.outerHTML}</foreignObject></svg>`;
    return indexedPreview(cachedPreview,index);
  }
  function indexedPreview(markup,index){
    if(!index||!markup)return markup;
    const doc=new DOMParser().parseFromString(markup,'image/svg+xml');
    doc.querySelectorAll('[data-output-serial]').forEach(element=>{
      const item=state.items.find(i=>i.id===element.getAttribute('data-output-serial'));
      const ink=element.querySelector('textPath')||element.querySelector('[data-serial-ink]');
      if(item&&ink)ink.textContent=window.esprintData.displayText(item,index);
    });
    return new XMLSerializer().serializeToString(doc.documentElement);
  }
  footer.querySelector('.primary').addEventListener('click',previewMarkup,{capture:true});
  new MutationObserver(()=>{
    if(!screen.classList.contains('active')){
      stopFontPress();if(inputSession)finishInput(true);
      if(!['preview','login','register','forgot'].includes(document.querySelector('.screen.active')?.id)&&!(document.querySelector('.screen.active')?.id==='new'&&window.esprintEditorChrome?.isSettings()))state.textDefaultFont='system';
    }else if(pendingFavorite){const id=pendingFavorite;pendingFavorite=null;if(authState.loggedIn)toggleFavorite(id);}
  }).observe(screen,{attributes:true,attributeFilter:['class']});
  window.esprintText={supports,defaults,styleFor,paint,properties,body,showTab,renderPanel,refresh,refreshTypography,openInput,previewMarkup,isEditing:()=>!!inputSession,consumeClick:()=>dragged};
  refresh();
})();
