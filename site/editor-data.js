/* Time, serial numbers and editable tables. All values are local prototype data. */
(() => {
  const editor=window.esprintEditor,text=window.esprintText;
  if(!editor||!text)return;
  const {state,screen,paper,dock,menu}=editor,properties=text.properties,body=text.body,footer=editor.actions;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=(n,length=2)=>String(n).padStart(length,'0');
  const dateFormats=['yyyy-MM-dd','yyyy-MM','MM-dd','yyyy/MM/dd','yyyy/MM','MM/dd','MM-dd-yyyy','dd-MM-yyyy','dd/MM/yyyy','MMM d,yyyy','MMMM d,yyyy','d MMM yyyy','d MMMMM yyyy','无'];
  const timeFormats=['HH:mm','HH:mm:ss','mm:ss','无'];
  const supported=new Set(['time','serial','table']),cells=new Map();
  let sequence=1,session=null,lastSelected=null,lastCellTap=null,wheelTimers=[];
  const glyph=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const icons={check:glyph('<path d="m5 12 4 4L19 6"/>'),close:glyph('<path d="m6 6 12 12M6 18 18 6"/>'),chevron:glyph('<path d="m9 5 7 7-7 7"/>'),rowAdd:glyph('<rect x="3" y="3" width="18" height="12" rx="2"/><path d="M3 9h18M12 18v5m-3-2.5h6"/>'),colAdd:glyph('<rect x="3" y="3" width="12" height="18" rx="2"/><path d="M9 3v18m9-9h5m-2.5-3v6"/>'),rowRemove:glyph('<rect x="3" y="3" width="18" height="12" rx="2"/><path d="M3 9h18M9 20h6"/>'),colRemove:glyph('<rect x="3" y="3" width="12" height="18" rx="2"/><path d="M9 3v18m9-9h5"/>')};
  function selected(){const item=editor.selected();return supported.has(item?.kind)&&!item.locked?item:null;}
  function cellSelection(item){const s=cells.get(item.id);return s&&item.table?.cells[s.row]?.[s.col]?s:null;}
  function styleTarget(item){if(item.kind!=='table')return null;const pos=cellSelection(item);return pos?item.table.cells[pos.row][pos.col].textStyle:item.table.cells[0][0].textStyle;}
  function applyStyle(item,patch){
    const pos=cellSelection(item),targets=pos?[item.table.cells[pos.row][pos.col]]:item.table.cells.flat();
    targets.forEach(cell=>cell.textStyle={...text.defaults(),...cell.textStyle,...patch,curved:false});
  }
  function dateText(timestamp,format){
    if(format==='无')return '';
    const d=new Date(timestamp),language=typeof preferences!=='undefined'?(preferences.language||'zh'):'zh-CN';
    const values={yyyy:d.getFullYear(),MM:pad(d.getMonth()+1),dd:pad(d.getDate()),d:d.getDate(),HH:pad(d.getHours()),mm:pad(d.getMinutes()),ss:pad(d.getSeconds()),MMM:new Intl.DateTimeFormat(language,{month:'short'}).format(d),MMMM:new Intl.DateTimeFormat(language,{month:'long'}).format(d),MMMMM:new Intl.DateTimeFormat(language,{month:'narrow'}).format(d)};
    return format.replace(/yyyy|MMMMM|MMMM|MMM|MM|dd|HH|mm|ss|d/g,token=>values[token]);
  }
  function displayText(item,index=0){
    if(item.kind==='time')return [dateText(item.time.timestamp,item.time.dateFormat),dateText(item.time.timestamp,item.time.timeFormat)].filter(Boolean).join(item.time.separator??'\n');
    if(item.kind==='serial'){
      const s=item.serial,value=BigInt(s.start)+BigInt(s.step)*BigInt(index),digits=value<0n?(-value).toString():value.toString(),length=Math.max(2,s.start.replace(/^[+-]/,'').length);
      return s.prefix+(value<0n?'-':'')+digits.padStart(length,'0')+s.suffix;
    }
    return item.text||'';
  }
  function addFromMenu(kind){
    if(!supported.has(kind))return false;
    editor.commit(()=>{
      const item={id:`data-${sequence++}`,kind,x:15,y:22,w:70,h:35,rotation:0,textStyle:text.defaults()};
      if(kind==='time')item.time={timestamp:new Date().toISOString(),dateFormat:'yyyy-MM-dd',timeFormat:'HH:mm',separator:'\n'};
      if(kind==='serial')item.serial={prefix:'',suffix:'',start:'01',step:'1'};
      if(kind==='table'){
        const width=Math.min(52,state.width*.7),height=Math.min(30,state.height*.5),style={...text.defaults(),size:state.width>=60?14:5};
        item.table={rowHeights:Array(3).fill(height/3),colWidths:Array(2).fill(width/2),lineWidth:.5,cells:Array.from({length:3},()=>Array.from({length:2},()=>({text:'',textStyle:{...style}})))};
        syncTableSize(item);
      }
      state.items.push(item);state.selected=item.id;
    });return true;
  }
  function tabsFor(item){
    if(!supported.has(item?.kind))return null;
    return [...(item.kind==='table'?[['table','表格'],['size','尺寸']]:[[item.kind==='time'?'time':'content',item.kind==='time'?'时间':'内容']]),['font','字体'],['style','样式'],['alignment','对齐']];
  }
  function defaultTab(item){return item?.kind==='table'?'table':item?.kind==='time'?'time':item?.kind==='serial'?'content':null;}
  function field(key,title,value,placeholder){return `<button type="button" class="data-field" data-data-field="${key}"><span>${title}</span><b class="${value?'':'is-empty'}">${esc(value||placeholder)}</b>${icons.chevron}</button>`;}
  function range(key,title,value,min,max,step='.1'){return `<div class="data-slider"><label for="data-${key}">${title}</label><input type="range" class="text-range" id="data-${key}" data-data-range="${key}" aria-label="${title}" min="${min}" max="${max}" step="${step}" value="${value}" style="--range-progress:${(value-min)/(max-min)*100}%"><output>${Number(value).toFixed(1)}</output><span>${key==='lineWidth'?'pt':'mm'}</span></div>`;}
  function scopeMarkup(item){const pos=cellSelection(item);return `<div class="data-table-scope" data-editor-only><span>${pos?`第 ${pos.row+1} 行 · 第 ${pos.col+1} 列`:`${item.table.cells.length} 行 × ${item.table.colWidths.length} 列`}</span><button type="button" data-whole-table aria-pressed="${!pos}">整表${!pos?'已选中':''}</button></div>`;}
  function panelMarkup(item,tab){
    if(item.kind==='time'&&tab==='time')return `<div class="data-fields">${field('date','日期',dateText(item.time.timestamp,item.time.dateFormat),'不显示')}${field('time','时间',dateText(item.time.timestamp,item.time.timeFormat),'不显示')}</div>`;
    if(item.kind==='serial'&&tab==='content')return `<div class="data-serial-fields">${[['prefix','前缀','未设置'],['suffix','后缀','未设置'],['start','起始值','01'],['step','递增值','1']].map(([key,label,placeholder])=>field(key,label,item.serial[key],placeholder)).join('')}</div>`;
    if(item.kind==='table'&&tab==='table'){
      const t=item.table;return scopeMarkup(item)+`<div class="data-table-actions">${[['rowAdd','增加行'],['colAdd','增加列'],['rowRemove','减少行'],['colRemove','减少列']].map(([key,label])=>`<button type="button" data-table-action="${key}" aria-label="${label}" ${(key==='rowRemove'&&t.cells.length===1||key==='colRemove'&&t.colWidths.length===1||key==='rowAdd'&&t.cells.length>=Math.min(40,Math.floor(state.height))||key==='colAdd'&&t.colWidths.length>=Math.min(20,Math.floor(state.width)))?'disabled':''}>${icons[key]}<span>${label}</span></button>`).join('')}</div>`+range('lineWidth','线宽',t.lineWidth,.2,3);
    }
    if(item.kind==='table'&&tab==='size'){
      const pos=cellSelection(item),t=item.table;
      return scopeMarkup(item)+range('rowHeight','行高',t.rowHeights[pos?.row||0],1,rowMaximum(item,pos))+range('colWidth','列宽',t.colWidths[pos?.col||0],1,colMaximum(item,pos));
    }
    return null;
  }
  function sum(values){return values.reduce((a,b)=>a+b,0);}
  function syncTableSize(item,clamp=true){item.w=sum(item.table.colWidths)/state.width*100;item.h=sum(item.table.rowHeights)/state.height*100;if(clamp){item.x=Math.max(0,Math.min(100-item.w,item.x));item.y=Math.max(0,Math.min(100-item.h,item.y));}}
  function fitDimensions(values,maximum){if(sum(values)<=maximum)return values;const spare=sum(values.map(n=>n-1)),factor=(maximum-values.length)/Math.max(.0001,spare);return values.map(n=>1+(n-1)*Math.max(0,factor));}
  function rowMaximum(item,pos){return Math.max(1,pos?state.height-sum(item.table.rowHeights)+item.table.rowHeights[pos.row]:state.height/item.table.rowHeights.length);}
  function colMaximum(item,pos){return Math.max(1,pos?state.width-sum(item.table.colWidths)+item.table.colWidths[pos.col]:state.width/item.table.colWidths.length);}
  function paintTable(item,element,handles=true){
    syncTableSize(item,false);element.style.width=item.w+'%';
    const t=item.table,width=sum(t.colWidths),height=sum(t.rowHeights),unit=(paper.clientWidth||324)/state.width,pos=cellSelection(item);
    element.replaceChildren();element.classList.add('editor-table');element.style.height=item.h+'%';element.style.padding='0';
    const content=document.createElement('div');content.className='data-table-content';content.style.cssText='position:absolute;inset:0;overflow:hidden';
    let y=0;
    t.cells.forEach((row,r)=>{let x=0;row.forEach((cell,c)=>{
      const wrap=document.createElement('div');wrap.className='data-table-cell';wrap.dataset.cellRow=r;wrap.dataset.cellCol=c;wrap.setAttribute('aria-label',`第${r+1}行第${c+1}列${cell.text?' '+cell.text:''}`);
      wrap.style.cssText=`position:absolute;left:${x/width*100}%;top:${y/height*100}%;width:${t.colWidths[c]/width*100}%;height:${t.rowHeights[r]/height*100}%;display:flex;align-items:center;overflow:hidden;padding:${Math.max(1,t.lineWidth*unit/2)}px;box-sizing:border-box;`;
      const ink=document.createElement('div');ink.style.cssText='width:100%;pointer-events:none';
      text.paint({id:`${item.id}-cell-${r}-${c}`,kind:'text',text:cell.text,textStyle:{...cell.textStyle,curved:false}},ink,false);wrap.append(ink);content.append(wrap);
      if(handles&&item.id===state.selected&&pos?.row===r&&pos.col===c){const highlight=document.createElement('span');highlight.dataset.editorOnly='true';highlight.className='data-cell-highlight';highlight.style.cssText=`position:absolute;inset:0;background:#FFEDE775;box-shadow:inset 0 0 0 1px #a2b5d8;pointer-events:none;`;wrap.prepend(highlight);}
      x+=t.colWidths[c];
    });y+=t.rowHeights[r];});
    element.append(content);
    let grid=`M0 0H${width}V${height}H0Z`,edge=0;
    t.colWidths.slice(0,-1).forEach(value=>{edge+=value;grid+=`M${edge} 0V${height}`;});edge=0;
    t.rowHeights.slice(0,-1).forEach(value=>{edge+=value;grid+=`M0 ${edge}H${width}`;});
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';svg.innerHTML=`<path d="${grid}" fill="none" stroke="#17202c" stroke-width="${t.lineWidth*25.4/72}"/>`;element.append(svg);
    if(handles&&item.id===state.selected){[['delete',icons.close,'删除表格'],['resize',editor.glyph('reset'),'等比缩放表格']].forEach(([key,icon,label])=>{const button=document.createElement('button');button.type='button';button.className='text-object-handle';button.dataset.textHandle=key;button.setAttribute('aria-label',label);button.innerHTML=icon;button.disabled=item.locked&&key!=='delete';element.append(button);});}
  }
  function resizeTable(original,dx,dy){
    const geometry=window.esprintGeometry.resizeFromCorner(original,dx/state.zoom,dy/state.zoom,true),item=structuredClone(original),t=item.table;
    const factor=Math.max(26/Math.max(1,paper.clientWidth*state.zoom*original.w/100),26/Math.max(1,paper.clientHeight*state.zoom*original.h/100),geometry.w/original.w,1/Math.min(...t.rowHeights,...t.colWidths));
    const maxFactor=Math.min(state.width/sum(t.colWidths),state.height/sum(t.rowHeights)),scale=Math.min(maxFactor,factor);
    t.rowHeights=t.rowHeights.map(n=>n*scale);t.colWidths=t.colWidths.map(n=>n*scale);t.cells.flat().forEach(cell=>cell.textStyle={...cell.textStyle,size:Math.max(1,Math.min(120,cell.textStyle.size*scale))});syncTableSize(item);return item;
  }
  function tableAction(action){
    const item=selected();if(item?.kind!=='table')return;
    editor.commit(()=>{
      const t=item.table,style={...t.cells[0][0].textStyle};
      if(action==='rowAdd'&&t.rowHeights.length<Math.min(40,Math.floor(state.height))){
        const height=t.rowHeights.at(-1);t.rowHeights.push(height);t.rowHeights=fitDimensions(t.rowHeights,state.height);t.cells.push(t.colWidths.map(()=>({text:'',textStyle:{...style}})));
      }
      if(action==='colAdd'&&t.colWidths.length<Math.min(20,Math.floor(state.width))){const width=t.colWidths.at(-1);t.colWidths.push(width);t.colWidths=fitDimensions(t.colWidths,state.width);t.cells.forEach(row=>row.push({text:'',textStyle:{...style}}));}
      if(action==='rowRemove'&&t.rowHeights.length>1){t.rowHeights.pop();t.cells.pop();}
      if(action==='colRemove'&&t.colWidths.length>1){t.colWidths.pop();t.cells.forEach(row=>row.pop());}
      cells.delete(item.id);syncTableSize(item);
    });
  }
  body.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    const item=selected();if(!item)return;
    if(button.dataset.dataField){const field=button.dataset.dataField;if(item.kind==='time')openPicker(item,field);else openComposer(item,field);}
    if(button.dataset.tableAction)tableAction(button.dataset.tableAction);
    if(button.hasAttribute('data-whole-table')){cells.delete(item.id);editor.render();}
  });
  let rangeSession=null;
  function setDimension(item,key,value){const t=item.table,pos=cellSelection(item);if(key==='lineWidth')t.lineWidth=value;else if(key==='rowHeight')t.rowHeights=t.rowHeights.map((n,i)=>!pos||i===pos.row?value:n);else t.colWidths=t.colWidths.map((n,i)=>!pos||i===pos.col?value:n);syncTableSize(item);}
  body.addEventListener('input',event=>{
    const key=event.target.dataset.dataRange,item=selected();if(!key||item?.kind!=='table')return;
    rangeSession||={id:item.id,key,original:structuredClone(item)};
    const value=Number(event.target.value),preview=structuredClone(rangeSession.original);setDimension(preview,key,value);rangeSession.value=value;
    const element=paper.querySelector(`[data-id="${item.id}"]`);element.style.width=preview.w+'%';paintTable(preview,element);
    event.target.style.setProperty('--range-progress',`${(value-Number(event.target.min))/(event.target.max-event.target.min)*100}%`);event.target.nextElementSibling.textContent=value.toFixed(1);
  });
  body.addEventListener('change',()=>{if(!rangeSession)return;const s=rangeSession;rangeSession=null;const item=selected();if(item?.id===s.id)editor.commit(()=>setDimension(item,s.key,s.value));});
  const composer=document.createElement('section');composer.className='editor-text-composer data-composer';composer.hidden=true;composer.setAttribute('aria-label','编辑元素内容');
  composer.innerHTML=`<div class="text-composer-top"><span></span><button type="button" class="text-input-cancel" aria-label="取消输入">${icons.close}</button></div><div class="text-composer-row"><div class="text-composer-field"><textarea rows="1" aria-label="元素内容" enterkeyhint="done"></textarea><button type="button" class="text-input-clear" aria-label="清空输入">${icons.close}</button></div><button type="button" class="text-input-done primary">完成</button></div><div class="data-input-error" aria-live="polite"></div>`;dock.append(composer);
  const input=composer.querySelector('textarea');
  function openComposer(item,field,pos){
    if(session||item.locked)return;
    session={type:'input',id:item.id,field,pos};
    const labels={prefix:'前缀',suffix:'后缀',start:'起始值',step:'递增值',cell:'单元格'};
    composer.querySelector('.text-composer-top span').textContent=labels[field];
    input.value=field==='cell'?item.table.cells[pos.row][pos.col].text:item.serial[field];input.inputMode=['start','step'].includes(field)?'decimal':'text';input.placeholder=['start','step'].includes(field)?'请输入整数':'请输入'+labels[field];
    composer.querySelector('.data-input-error').textContent='';properties.hidden=true;menu.hidden=true;composer.hidden=false;screen.classList.add('is-text-input');updateInput();editor.renderToolbar();input.focus({preventScroll:true});updateKeyboard();
  }
  function validInput(){return !['start','step'].includes(session?.field)||/^[+-]?\d{1,30}$/.test(input.value);}
  function updateInput(){
    input.style.height='0';input.style.height=Math.min(66,Math.max(22,input.scrollHeight))+'px';composer.querySelector('.text-input-clear').disabled=!input.value;
    composer.querySelector('.text-input-done').disabled=false;
    const item=state.items.find(i=>i.id===session?.id);if(!item||!validInput())return;
    const draft=structuredClone(item);if(session.field==='cell')draft.table.cells[session.pos.row][session.pos.col].text=input.value;else draft.serial[session.field]=input.value;
    const element=paper.querySelector(`[data-id="${item.id}"]`);if(element)text.paint(draft,element);
  }
  function finishComposer(cancel=false){
    if(session?.type!=='input')return;
    if(!cancel&&!validInput()){composer.querySelector('.data-input-error').textContent='请输入不超过 30 位的整数';input.focus();return;}
    const s=session,value=input.value;session=null;composer.hidden=true;input.blur();screen.classList.remove('is-text-input');screen.style.removeProperty('--editor-keyboard-inset');
    const item=state.items.find(i=>i.id===s.id);
    if(!cancel&&item){const old=s.field==='cell'?item.table.cells[s.pos.row][s.pos.col].text:item.serial[s.field];if(old!==value){editor.commit(()=>{if(s.field==='cell')item.table.cells[s.pos.row][s.pos.col].text=value;else item.serial[s.field]=value;});return;}}
    editor.render();
  }
  composer.querySelector('.text-input-done').onclick=()=>finishComposer();composer.querySelector('.text-input-cancel').onclick=()=>finishComposer(true);composer.querySelector('.text-input-clear').onclick=()=>{input.value='';updateInput();input.focus();};input.oninput=()=>{composer.querySelector('.data-input-error').textContent='';updateInput();};input.onkeydown=event=>{if(event.isComposing)return;if(event.key==='Escape'){event.preventDefault();finishComposer(true);}if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();finishComposer();}};
  function updateKeyboard(){if(session?.type!=='input')return;const v=window.visualViewport;screen.style.setProperty('--editor-keyboard-inset',(v&&matchMedia('(max-width:760px)').matches?Math.max(0,innerHeight-v.height-v.offsetTop):0)+'px');}
  window.visualViewport?.addEventListener('resize',updateKeyboard);window.visualViewport?.addEventListener('scroll',updateKeyboard);
  paper.addEventListener('click',event=>{
    const el=event.target.closest('[data-cell-row]'),element=event.target.closest('.editor-object[data-kind="table"]');if(!el||!element||session||text.consumeClick())return;
    const item=state.items.find(i=>i.id===element.dataset.id);if(!item||item.locked)return;
    event.stopImmediatePropagation();const pos={row:Number(el.dataset.cellRow),col:Number(el.dataset.cellCol)},now=performance.now();
    const double=lastCellTap?.id===item.id&&lastCellTap.row===pos.row&&lastCellTap.col===pos.col&&now-lastCellTap.time<420;
    state.selected=item.id;cells.set(item.id,pos);editor.render();lastCellTap={id:item.id,...pos,time:now};if(double){lastCellTap=null;openComposer(item,'cell',pos);}
  },true);
  paper.addEventListener('dblclick',event=>{
    const el=event.target.closest('[data-cell-row]'),element=event.target.closest('.editor-object[data-kind="table"]');if(!el||!element||session)return;const item=state.items.find(i=>i.id===element.dataset.id);if(item&&!item.locked)openComposer(item,'cell',{row:Number(el.dataset.cellRow),col:Number(el.dataset.cellCol)});
  },true);
  const picker=document.createElement('section');picker.className='data-time-picker text-properties';picker.hidden=true;picker.setAttribute('aria-label','选择日期与格式');dock.append(picker);
  function openPicker(item,field){
    if(session)return;session={type:'picker',id:item.id,field,tab:'value',draft:structuredClone(item.time)};properties.hidden=true;menu.hidden=true;picker.hidden=false;renderPicker();editor.renderToolbar();
  }
  function pickerDate(){return new Date(session.draft.timestamp);}
  function wheel(key,label,values,current,format=n=>pad(n)){
    return `<div class="data-wheel" role="listbox" tabindex="0" data-wheel="${key}" aria-label="${label}">${values.map(n=>`<button type="button" role="option" data-wheel-value="${n}" aria-selected="${n===current}">${format(n)}</button>`).join('')}</div>`;
  }
  const numbers=(start,end)=>Array.from({length:end-start+1},(_,i)=>i+start);
  function renderPicker(){
    wheelTimers.forEach(clearTimeout);wheelTimers=[];
    if(session?.type!=='picker')return;
    const s=session,d=pickerDate(),isDate=s.field==='date',formatKey=isDate?'dateFormat':'timeFormat',formats=isDate?dateFormats:timeFormats,valid=!(s.draft.dateFormat==='无'&&s.draft.timeFormat==='无');
    picker.innerHTML=`<div class="data-picker-header"><button type="button" data-picker-cancel aria-label="取消日期设置">${icons.close}</button><div role="tablist" aria-label="${isDate?'日期':'时间'}设置"><button type="button" role="tab" data-picker-tab="value" aria-selected="${s.tab==='value'}">${isDate?'日期':'时间'}</button><button type="button" role="tab" data-picker-tab="format" aria-selected="${s.tab==='format'}">格式</button></div><button type="button" data-picker-done aria-label="确认日期设置" ${valid?'':'disabled'}>${icons.check}</button></div><div class="data-picker-caption">${valid?esc([dateText(s.draft.timestamp,s.draft.dateFormat),dateText(s.draft.timestamp,s.draft.timeFormat)].filter(Boolean).join(' ')):'日期和时间至少保留一项'}</div>${s.tab==='format'?`<div class="data-format-list" role="listbox" aria-label="${isDate?'日期':'时间'}格式">${formats.map(format=>`<button type="button" role="option" data-date-format="${format}" aria-selected="${s.draft[formatKey]===format}"><span>${format==='无'?'无':esc(dateText(s.draft.timestamp,format))}</span><small>${format==='无'?'不显示':format}</small>${s.draft[formatKey]===format?icons.check:''}</button>`).join('')}</div>`:`<div class="data-wheel-wrap"><div class="data-wheel-band"></div>${isDate?wheel('year','年',numbers(1900,2100),d.getFullYear(),n=>n+'年')+wheel('month','月',numbers(1,12),d.getMonth()+1,n=>n+'月')+wheel('day','日',numbers(1,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()),d.getDate(),n=>n+'日'):wheel('hour','时',numbers(0,23),d.getHours())+wheel('minute','分',numbers(0,59),d.getMinutes())+wheel('second','秒',numbers(0,59),d.getSeconds())}</div>`}`;
    window.esprintEditorChrome?.syncSelectors(picker);
    picker.querySelectorAll('.data-wheel').forEach(column=>{
      const selected=column.querySelector('[aria-selected="true"]');column.scrollTop=selected.offsetTop-(column.clientHeight-36)/2;
      let timer;column.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>{const index=Math.max(0,Math.min(column.children.length-1,Math.round(column.scrollTop/36))),value=Number(column.children[index].dataset.wheelValue);changeWheel(column.dataset.wheel,value,false);column.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(Number(b.dataset.wheelValue)===value)));},100);wheelTimers.push(timer);},{passive:true});
      column.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();column.scrollBy({top:event.key==='ArrowDown'?36:-36,behavior:'smooth'});});
    });
    if(s.tab==='format'){const list=picker.querySelector('.data-format-list'),option=list.querySelector('[aria-selected="true"]');list.scrollTop=Math.max(0,option.offsetTop-list.offsetTop-44);}
  }
  function changeWheel(key,value,render=true){
    if(session?.type!=='picker')return;const d=pickerDate(),day=d.getDate();
    if(key==='year'||key==='month'){d.setDate(1);if(key==='year')d.setFullYear(value);else d.setMonth(value-1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
    if(key==='day')d.setDate(value);if(key==='hour')d.setHours(value);if(key==='minute')d.setMinutes(value);if(key==='second')d.setSeconds(value);
    session.draft.timestamp=d.toISOString();if(render||key==='year'||key==='month')renderPicker();else picker.querySelector('.data-picker-caption').textContent=[dateText(session.draft.timestamp,session.draft.dateFormat),dateText(session.draft.timestamp,session.draft.timeFormat)].filter(Boolean).join(' ');
  }
  function finishPicker(cancel=false){
    if(session?.type!=='picker')return;const s=session;if(!cancel&&s.draft.dateFormat==='无'&&s.draft.timeFormat==='无')return;
    session=null;wheelTimers.forEach(clearTimeout);wheelTimers=[];picker.hidden=true;const item=state.items.find(i=>i.id===s.id);
    if(!cancel&&item&&JSON.stringify(item.time)!==JSON.stringify(s.draft))editor.commit(()=>{item.time=s.draft;item.time.separator=' ';});else editor.render();
  }
  picker.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||b.disabled||session?.type!=='picker')return;
    if(b.hasAttribute('data-picker-cancel'))finishPicker(true);
    else if(b.hasAttribute('data-picker-done'))finishPicker();
    else if(b.dataset.pickerTab){session.tab=b.dataset.pickerTab;renderPicker();}
    else if(b.dataset.dateFormat){session.draft[session.field==='date'?'dateFormat':'timeFormat']=b.dataset.dateFormat;renderPicker();}
    else if(b.dataset.wheelValue)changeWheel(b.closest('[data-wheel]').dataset.wheel,Number(b.dataset.wheelValue));
  });
  function decoratePanel(item,tab){
    if(item.kind==='table'&&['font','style','alignment'].includes(tab))body.insertAdjacentHTML('afterbegin',scopeMarkup(item));
  }
  function scopeKey(item){const pos=item?.kind==='table'?cellSelection(item):null;return item?.id+':'+(pos?pos.row+','+pos.col:'all');}
  function dismiss(){if(session?.type==='picker')finishPicker(true);if(session?.type==='input')finishComposer(true);cells.clear();lastCellTap=null;}
  function refresh(){
    if(lastSelected!==state.selected){if(lastSelected)cells.delete(lastSelected);lastSelected=state.selected;}
    if(session){properties.hidden=true;menu.hidden=true;composer.hidden=session.type!=='input';picker.hidden=session.type!=='picker';}
    else{composer.hidden=true;picker.hidden=true;}
    if(session?.type==='input')updateInput();
  }
  new MutationObserver(()=>{if(!screen.classList.contains('active')&&session)dismiss();}).observe(screen,{attributes:true,attributeFilter:['class']});
  window.esprintData={addFromMenu,defaultTab,tabsFor,panelMarkup,decoratePanel,scopeKey,styleTarget,applyStyle,displayText,paintTable,resizeTable,refresh,dismiss,isEditing:()=>!!session,hasSerial:()=>state.items.some(i=>i.kind==='serial')};
  editor.render();
})();
