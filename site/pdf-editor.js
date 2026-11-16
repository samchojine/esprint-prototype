/* Non-destructive PDF edits. Crop coordinates refer to the rotated, mirrored page. */
iconPaths.pdfCrop='<path d="M6 3v13a2 2 0 0 0 2 2h13M3 6h13a2 2 0 0 1 2 2v13"/>';
iconPaths.pdfRotate='<path d="M4 8a8 8 0 1 1-1 7M4 3v5h5"/><path d="M9 10h7v7H9z"/>';
iconPaths.pdfMirror='<path d="M12 3v18M8 6 3 12l5 6V6ZM16 6l5 6-5 6V6Z"/>';
iconPaths.pdfRemove='<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 12h8"/>';
iconPaths.pdfApply='<rect x="7" y="7" width="14" height="14" rx="3"/><path d="M17 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2m4-4 2 2 4-4"/>';
const pdfEditSessions=new Map();
const pdfSizeHistoryKey='esprint.prototype.pdf-size-history.v31';
const pdfRecommendedSizes=[[110,210],[110,201],[110,152],[102,152],[101,151],[100,152],[100,150],[100,100],[76,127],[76,80],[76,76],[60,40],[50,50],[40,30]];
let pdfEdits=null,pdfCropState=null,pdfCropToken=0,pdfSizeReturnFocus=null;
let pdfSizeHistory=readPrototypeValue(pdfSizeHistoryKey,[]);
pdfSizeHistory=Array.isArray(pdfSizeHistory)?pdfSizeHistory.filter(s=>validPdfSize(s?.width,s?.height)).slice(0,10):[];

document.getElementById('pdf').innerHTML=`
 <header class="topbar"><button class="back" aria-label="返回 PDF 文件" onclick="go(pdfState.returnTo)">${svg('back')}</button><h1>编辑 PDF</h1><span class="spacer"></span></header>
 <div class="pdf-edit-content">
  <div class="pdf-editor-stage"><div class="pdf-page"><div class="pdf-editor-placeholder">请先从文件列表选择 PDF<button class="secondary" onclick="go('pdf-list')">选择文件</button></div></div><span id="pdf-excluded-badge" hidden>本页已剔除</span></div>
  <div class="pdf-page-controls"><button aria-label="上一页" id="pdf-previous-page" onclick="changePdfEditorPage(-1)">${svg('back')}</button><span id="pdf-page-position">— / —</span><button aria-label="下一页" id="pdf-next-page" onclick="changePdfEditorPage(1)">${svg('arrow')}</button></div>
  <div class="pdf-editor-tools"><button id="pdf-crop-open" onclick="openPdfCrop()">${svg('pdfCrop')}<span>裁剪</span></button><button id="pdf-exclude-page" onclick="togglePdfExcluded()">${svg('pdfRemove')}<span>剔除本页</span></button><button id="pdf-apply-all" onclick="applyPdfCropToAll()">${svg('pdfApply')}<span>应用全部</span></button></div>
  <div class="pdf-edit-settings"><button class="pdf-size-trigger" onclick="openPdfSize()"><span>输出尺寸</span><b id="pdf-editor-size">100 × 150 <small>mm</small></b>${svg('arrow')}</button><div class="pdf-edit-range"><span>输出范围</span><div><input id="pdf-range-start" type="number" min="1" step="1" inputmode="numeric" aria-label="起始页" placeholder="起始页" oninput="updatePdfRange()"><i>—</i><input id="pdf-range-end" type="number" min="1" step="1" inputmode="numeric" aria-label="结束页" placeholder="结束页" oninput="updatePdfRange()"></div></div></div>
  <p id="pdf-editor-error" role="alert" hidden></p>
  <button class="primary pdf-editor-print" onclick="printPdfEditor()">${svg('printer')}去打印</button>
 </div>`;
phoneEl.insertAdjacentHTML('beforeend',`
 <section id="pdf-crop" class="screen"><header class="topbar"><button class="back" aria-label="取消裁剪" onclick="cancelPdfCrop()">${svg('back')}</button><h1>裁剪</h1><span class="spacer"></span></header><div class="pdf-crop-content">
  <div id="pdf-crop-workspace"><div id="pdf-crop-image"><div id="pdf-crop-canvas"></div><div id="pdf-crop-frame" role="group" aria-label="裁剪选区，拖动边角调整范围"><div class="pdf-crop-grid"></div>${['nw','n','ne','e','se','s','sw','w'].map(handle=>`<span class="pdf-crop-handle ${handle}" data-handle="${handle}"></span>`).join('')}</div></div><p id="pdf-crop-message" role="status"></p></div>
  <div class="pdf-crop-transform"><button id="pdf-crop-rotate" onclick="rotatePdfCrop()">${svg('pdfRotate')}<span>旋转</span></button><button id="pdf-crop-mirror" aria-pressed="false" onclick="mirrorPdfCrop()">${svg('pdfMirror')}<span>镜像</span></button></div>
  <div class="pdf-crop-ratios" aria-label="裁剪比例">${[['free','自由'],['1:1','1:1'],['3:2','3:2'],['2:3','2:3'],['4:3','4:3'],['3:4','3:4']].map(([value,label])=>`<button data-ratio="${value}" aria-pressed="${value==='free'}" onclick="setPdfCropRatio('${value}')"><span class="pdf-ratio-icon" style="--ratio:${value==='free'?'1.3':value.replace(':','/')} "></span>${label}</button>`).join('')}</div>
  <div class="pdf-crop-actions"><button class="secondary" onclick="cancelPdfCrop()">取消</button><button class="pdf-crop-reset" onclick="resetPdfCrop()">${svg('refresh')}还原</button><button class="primary" id="pdf-crop-confirm" onclick="confirmPdfCrop()">${svg('check')}完成</button></div>
 </div></section>
 <div class="pdf-size-layer" id="pdf-size-layer" hidden onclick="if(event.target===this)closePdfSize()"><section class="pdf-size-sheet" role="dialog" aria-modal="true" aria-labelledby="pdf-size-title" tabindex="-1"><header><h2 id="pdf-size-title">选择尺寸</h2><button aria-label="关闭尺寸选择" onclick="closePdfSize()">${svg('close')}</button></header><div id="pdf-size-sections"></div></section></div>
 <div class="pdf-size-layer pdf-custom-layer" id="pdf-custom-layer" hidden onclick="if(event.target===this)closePdfCustomSize()"><section class="pdf-custom-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-custom-title"><form onsubmit="savePdfCustomSize(event)" novalidate><h2 id="pdf-custom-title">自定义尺寸</h2><div class="pdf-custom-fields"><label>宽度 <small>mm</small><input id="pdf-custom-width" type="number" min="1" max="500" step="0.1" inputmode="decimal" placeholder="输入宽度" autocomplete="off"></label><span>×</span><label>高度 <small>mm</small><input id="pdf-custom-height" type="number" min="1" max="500" step="0.1" inputmode="decimal" placeholder="输入高度" autocomplete="off"></label></div><p id="pdf-custom-error" role="alert"></p><div class="personal-dialog-actions"><button type="button" class="secondary" onclick="closePdfCustomSize()">取消</button><button class="primary" type="submit">确定</button></div></form></section></div>`);
pages.splice(pages.findIndex(([id])=>id==='pdf')+1,0,['pdf-crop','PDF 裁剪']);

function validPdfSize(width,height){return Number.isFinite(width)&&Number.isFinite(height)&&width>=1&&height>=1&&width<=500&&height<=500}
function newPdfCrop(){return {rotation:0,flip:false,ratio:'free',rect:{x:0,y:0,w:1,h:1}}}
async function openPdfFile(id,origin='pdf-list'){
 if(pdfState.editing&&origin==='pdf-list'){pdfState.selected.has(id)?pdfState.selected.delete(id):pdfState.selected.add(id);renderPdfLibrary();return}
 return openPdfFiles([id],origin);
}
async function openPdfFiles(ids,origin='pdf-list'){
 const files=[...new Set(ids)].map(id=>pdfState.files.find(file=>file.id===id)).filter(Boolean);if(!files.length)return;
 if(pdfProcessing.task?.status==='running')return;
 if(pdfProcessing.task)cancelPdfProcessing(false);
 const fileIds=files.map(file=>file.id),total=files.reduce((sum,file)=>sum+file.pages,0);
 const task=beginPdfProcessing({kind:'open',title:'正在转换 PDF',total,onCancel:()=>{fileIds.forEach(id=>{if(!pdfPreparedDocuments.get(id)?.complete)releasePdfPrepared(id)})},retry:()=>openPdfFiles(fileIds,origin)});
 await pdfProcessingPaint();if(pdfProcessing.task!==task)return;
 try{
  let offset=0;
  for(const file of files){
   const prepared=await preparePdfImages(file,task,{offset,total,retainIds:fileIds});if(!prepared||pdfProcessing.task!==task)return;
   offset+=file.pages;
  }
  if(!await finishPdfProcessing(task))return;
  const editor=files.length===1?files[0]:{id:'batch:'+JSON.stringify(fileIds),pages:total};
  if(!pdfEditSessions.has(editor.id))pdfEditSessions.set(editor.id,{start:1,end:total,size:{width:100,height:150},crops:{},excluded:new Set()});
  pdfEdits=pdfEditSessions.get(editor.id);pdfState.editor=editor;pdfState.editorFiles=files;
  pdfState.editorPages=files.flatMap(file=>Array.from({length:file.pages},(_,i)=>({fileId:file.id,page:i+1})));
  pdfState.editorPage=1;pdfState.excluded=pdfEdits.excluded;pdfState.returnTo=origin;
  go('pdf');await renderPdfEditor();
 }catch(error){failPdfProcessing(task,error)}
}
function pdfEditorSource(page=pdfState.editorPage){return pdfState.editorPages?.[page-1]||{fileId:pdfState.editor.id,page}}
function printPdfEditor(){if(!pdfState.editor){go('pdf-list');return}startPdfBatch((pdfState.editorFiles||[pdfState.editor]).map(file=>file.id),true)}

// Render fresh PDF pixels at the required output resolution, never a screenshot of the UI.
async function renderPdfSource(page,edit,scale){
 const viewport=page.getViewport({scale,rotation:(page.rotate+(edit?.rotation||0))%360});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#ffffff'}).promise;
 if(!edit?.flip)return canvas;
 const mirrored=document.createElement('canvas');mirrored.width=canvas.width;mirrored.height=canvas.height;
 const ctx=mirrored.getContext('2d');ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0);canvas.width=canvas.height=0;return mirrored;
}
async function renderPdfEditedPage(page,edit,size,preview=false,prepared=null){
 const crop=edit||newPdfCrop(),rect=crop.rect;
 const base=page.getViewport({scale:1,rotation:(page.rotate+crop.rotation)%360});
 size=size||{width:100,height:100*base.height/base.width};
 const density=preview?900/Math.max(size.width,size.height):203/25.4;
 const width=Math.max(1,Math.round(size.width*density)),height=Math.max(1,Math.round(size.height*density));
 const scale=Math.min(width/(base.width*rect.w),height/(base.height*rect.h),6000/Math.max(base.width,base.height));
 const source=preview&&prepared?await renderPdfPreparedSource(prepared,crop):await renderPdfSource(page,crop,scale),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 const sx=source.width*rect.x,sy=source.height*rect.y,sw=source.width*rect.w,sh=source.height*rect.h;
 const fit=Math.min(width/sw,height/sh),dw=sw*fit,dh=sh*fit;
 ctx.drawImage(source,sx,sy,sw,sh,(width-dw)/2,(height-dh)/2,dw,dh);source.width=source.height=0;return canvas;
}
async function renderPdfEditor(){
 const file=pdfState.editor;
 const photo=file?.kind==='image';
 document.querySelector('#pdf .topbar h1').textContent=photo?'图片编辑':'编辑 PDF';
 document.querySelector('#pdf .back').setAttribute('aria-label',photo?'返回图片选择':'返回 PDF 文件');
 const add=document.getElementById('photo-editor-add');if(add)add.hidden=!photo;
 document.querySelectorAll('#pdf-previous-page,#pdf-next-page,#pdf-crop-open,#pdf-exclude-page,#pdf-apply-all,#pdf .pdf-size-trigger,#pdf-range-start,#pdf-range-end').forEach(el=>el.disabled=!file);
 if(!file)return;
 const token=++pdfState.editorToken,pageNumber=pdfState.editorPage,container=document.querySelector('#pdf .pdf-page');
 document.getElementById('pdf-page-position').textContent=`${pageNumber} / ${file.pages}`;
 document.getElementById('pdf-previous-page').disabled=pageNumber===1;document.getElementById('pdf-next-page').disabled=pageNumber===file.pages;
 for(const [id,value] of [['pdf-range-start',pdfEdits.start],['pdf-range-end',pdfEdits.end]]){const input=document.getElementById(id);if(input!==document.activeElement)input.value=value;input.max=file.pages}
 document.getElementById('pdf-editor-size').innerHTML=`${pdfEdits.size.width} × ${pdfEdits.size.height} <small>mm</small>`;
 const excluded=pdfState.excluded.has(pageNumber);document.querySelector('#pdf-exclude-page span').textContent=excluded?'恢复本页':'剔除本页';document.getElementById('pdf-exclude-page').setAttribute('aria-pressed',excluded);
 container.classList.toggle('pdf-is-excluded',excluded);document.getElementById('pdf-excluded-badge').hidden=!excluded;
 container.innerHTML='<span class="small-spinner"></span>';
 try{
  const source=pdfEditorSource(pageNumber),doc=await getPdfDocument(source.fileId),page=await doc.getPage(source.page);
  if(token!==pdfState.editorToken)return;
  const canvas=await renderPdfEditedPage(page,pdfEdits.crops[pageNumber],pdfEdits.size,true,pdfPreparedDocuments.get(source.fileId)?.pages.get(source.page));
  if(token!==pdfState.editorToken){canvas.width=canvas.height=0;return}
  canvas.setAttribute('aria-label',`${photo?'图片':'PDF'} 第 ${pageNumber} ${photo?'张':'页'}预览`);container.replaceChildren(canvas);
 }catch(error){if(token===pdfState.editorToken)container.innerHTML=`<div class="pdf-editor-placeholder">${templateText(error.message)}<button class="secondary" onclick="renderPdfEditor()">重试</button></div>`}
}
function changePdfEditorPage(delta){if(!pdfState.editor)return;pdfState.editorPage=Math.max(1,Math.min(pdfState.editor.pages,pdfState.editorPage+delta));void renderPdfEditor()}
function updatePdfRange(){
 if(!pdfEdits)return;
 pdfEdits.start=document.getElementById('pdf-range-start').value;pdfEdits.end=document.getElementById('pdf-range-end').value;
 document.getElementById('pdf-editor-error').hidden=true;
 document.querySelectorAll('.pdf-edit-range input').forEach(el=>el.removeAttribute('aria-invalid'));
}
function pdfEditorJobConfig(){
 if(!pdfEdits||!pdfState.editor)return null;
 const start=Number(pdfEdits.start),end=Number(pdfEdits.end),max=pdfState.editor.pages;
 let error='';
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>max)error=`请输入 1–${max} 页内的有效起止页码`;
 else if(!Array.from({length:end-start+1},(_,i)=>start+i).some(page=>!pdfState.excluded.has(page)))error='所选范围内的页面已全部剔除，请恢复页面或调整范围';
 if(error){const el=document.getElementById('pdf-editor-error');el.textContent=error;el.hidden=false;document.querySelectorAll('.pdf-edit-range input').forEach(input=>input.setAttribute('aria-invalid','true'));document.getElementById('pdf-range-start').focus();return null}
 document.getElementById('pdf-editor-error').hidden=true;
 return {start,end,size:{...pdfEdits.size},crops:structuredClone(pdfEdits.crops)};
}
function togglePdfExcluded(){
 if(!pdfState.editor)return;const page=pdfState.editorPage;
 if(pdfState.excluded.has(page))pdfState.excluded.delete(page);
 else if(pdfState.excluded.size>=pdfState.editor.pages-1){toast('warn','至少保留一页用于打印');return}
 else pdfState.excluded.add(page);
 document.getElementById('pdf-editor-error').hidden=true;void renderPdfEditor();
}
function applyPdfCropToAll(){
 if(!pdfEdits)return;
 const crop=pdfEdits.crops[pdfState.editorPage];if(!crop){toast('warn','请先裁剪当前页');return}
 for(let i=1;i<=pdfState.editor.pages;i++)pdfEdits.crops[i]=structuredClone(crop);
 toast('success','已将当前裁剪应用到全部页面');
}

// Size sheet and nested custom size dialog.
function pdfSizeOption(size){const selected=pdfEdits.size.width===size.width&&pdfEdits.size.height===size.height;return `<button class="pdf-size-option" aria-checked="${selected}" role="radio" onclick="choosePdfSize(${size.width},${size.height})"><span>${size.width} × ${size.height}<small>mm</small></span>${selected?svg('check'):'<i></i>'}</button>`}
function renderPdfSizes(){
 document.getElementById('pdf-size-sections').innerHTML=`<section class="pdf-size-section"><h3>自定义尺寸</h3><button class="pdf-custom-add" onclick="openPdfCustomSize()">${svg('pdfAdd')}<span>自定义输入</span></button></section>${pdfSizeHistory.length?`<section class="pdf-size-section" id="pdf-size-history"><h3>历史尺寸 <small>最近 ${pdfSizeHistory.length} 条</small></h3><div class="pdf-size-grid" role="radiogroup" aria-label="历史尺寸">${pdfSizeHistory.map(pdfSizeOption).join('')}</div></section>`:''}<section class="pdf-size-section"><h3>推荐尺寸</h3><div class="pdf-size-grid" role="radiogroup" aria-label="推荐尺寸">${pdfRecommendedSizes.map(([width,height])=>pdfSizeOption({width,height})).join('')}</div></section>`;
}
function openPdfSize(){if(!pdfEdits)return;pdfSizeReturnFocus=document.activeElement;renderPdfSizes();document.getElementById('pdf-size-layer').hidden=false;document.querySelector('.pdf-size-sheet').focus()}
function closePdfSize(focus=true){
 const open=!document.getElementById('pdf-size-layer').hidden;document.getElementById('pdf-size-layer').hidden=true;document.getElementById('pdf-custom-layer').hidden=true;document.getElementById('pdf-size-layer').removeAttribute('inert');
 if(open&&focus)pdfSizeReturnFocus?.focus();
}
function openPdfCustomSize(){
 document.getElementById('pdf-custom-width').value=pdfEdits.size.width;document.getElementById('pdf-custom-height').value=pdfEdits.size.height;document.getElementById('pdf-custom-error').textContent='';
 document.getElementById('pdf-size-layer').setAttribute('inert','');document.getElementById('pdf-custom-layer').hidden=false;document.getElementById('pdf-custom-width').focus();document.getElementById('pdf-custom-width').select();
}
function closePdfCustomSize(){document.getElementById('pdf-custom-layer').hidden=true;document.getElementById('pdf-size-layer').removeAttribute('inert');document.querySelector('.pdf-custom-add').focus()}
function savePdfCustomSize(event){
 event.preventDefault();const width=Number(document.getElementById('pdf-custom-width').value),height=Number(document.getElementById('pdf-custom-height').value);
 if(!validPdfSize(width,height)){document.getElementById('pdf-custom-error').textContent='宽度和高度请输入 1–500 mm 的有效数值';return}
 const size={width:Math.round(width*10)/10,height:Math.round(height*10)/10};
 pdfSizeHistory=[size,...pdfSizeHistory.filter(s=>s.width!==size.width||s.height!==size.height)].slice(0,10);savePrototypeValue(pdfSizeHistoryKey,pdfSizeHistory);choosePdfSize(size.width,size.height);
}
function choosePdfSize(width,height){pdfEdits.size={width,height};closePdfSize();void renderPdfEditor()}

// Crop screen. The original PDF remains unchanged; each page keeps a normalized edit.
async function openPdfCrop(){
 if(!pdfState.editor)return;
 const source=pdfEditorSource();
 pdfCropState={fileId:source.fileId,page:source.page,editorPage:pdfState.editorPage,edit:structuredClone(pdfEdits.crops[pdfState.editorPage]||newPdfCrop()),source:null,drag:null};
 go('pdf-crop');await renderPdfCrop();
}
function closePdfCropState(){pdfCropToken++;if(pdfCropState?.source)pdfCropState.source.width=pdfCropState.source.height=0;pdfCropState=null}
function cancelPdfCrop(){closePdfCropState();go(pdfState.editor?'pdf':'pdf-list')}
async function renderPdfCrop(){
 if(!pdfCropState)return;
 const token=++pdfCropToken,state=pdfCropState;state.ready=false;
 document.getElementById('pdf-crop-image').hidden=true;document.getElementById('pdf-crop-message').textContent='正在载入页面…';syncPdfCropControls();
 try{
  const doc=await getPdfDocument(state.fileId),page=await doc.getPage(state.page),base=page.getViewport({scale:1,rotation:(page.rotate+state.edit.rotation)%360});
  const prepared=pdfPreparedDocuments.get(state.fileId)?.pages.get(state.page);
  const canvas=prepared?await renderPdfPreparedSource(prepared,state.edit):await renderPdfSource(page,state.edit,1200/Math.max(base.width,base.height));
  if(token!==pdfCropToken){canvas.width=canvas.height=0;return}
  if(state.source)state.source.width=state.source.height=0;state.source=canvas;state.ready=true;
  document.getElementById('pdf-crop-canvas').replaceChildren(canvas);document.getElementById('pdf-crop-image').hidden=false;document.getElementById('pdf-crop-message').textContent='';fitPdfCropImage();syncPdfCropControls();
 }catch(error){if(token!==pdfCropToken)return;document.getElementById('pdf-crop-message').textContent='页面载入失败，请返回后重试';syncPdfCropControls()}
}
function fitPdfCropImage(){
 const state=pdfCropState;if(!state?.source||!state.ready)return;
 const area=document.getElementById('pdf-crop-workspace'),image=document.getElementById('pdf-crop-image');
 const scale=Math.min((area.clientWidth-36)/state.source.width,(area.clientHeight-32)/state.source.height);
 image.style.width=Math.max(1,state.source.width*scale)+'px';image.style.height=Math.max(1,state.source.height*scale)+'px';updatePdfCropFrame();
}
function syncPdfCropControls(){
 const state=pdfCropState;document.querySelectorAll('#pdf-crop .pdf-crop-content button').forEach(el=>el.disabled=!state?.ready&&!(el.textContent.includes('取消')));
 document.querySelectorAll('[data-ratio]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.ratio===state?.edit.ratio));document.getElementById('pdf-crop-mirror').setAttribute('aria-pressed',!!state?.edit.flip);
}
function updatePdfCropFrame(){if(!pdfCropState)return;const {rect}=pdfCropState.edit,frame=document.getElementById('pdf-crop-frame');frame.style.left=rect.x*100+'%';frame.style.top=rect.y*100+'%';frame.style.width=rect.w*100+'%';frame.style.height=rect.h*100+'%'}
function pdfCropNormalizedRatio(){const {edit,source}=pdfCropState;if(edit.ratio==='free')return null;const [w,h]=edit.ratio.split(':').map(Number);return w/h*source.height/source.width}
function setPdfCropRatio(ratio){
 if(!pdfCropState?.ready)return;pdfCropState.edit.ratio=ratio;
 const r=pdfCropNormalizedRatio(),rect=pdfCropState.edit.rect;
 if(r){const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2;let w=rect.w,h=w/r;if(h>rect.h){h=rect.h;w=h*r}Object.assign(rect,{x:cx-w/2,y:cy-h/2,w,h})}
 updatePdfCropFrame();syncPdfCropControls();
}
function rotatePdfCrop(){if(!pdfCropState?.ready)return;pdfCropState.edit.rotation=(pdfCropState.edit.rotation+90)%360;pdfCropState.edit.rect={x:0,y:0,w:1,h:1};pdfCropState.edit.ratio='free';void renderPdfCrop()}
function mirrorPdfCrop(){if(!pdfCropState?.ready)return;pdfCropState.edit.flip=!pdfCropState.edit.flip;const rect=pdfCropState.edit.rect;rect.x=1-rect.x-rect.w;void renderPdfCrop()}
function resetPdfCrop(){if(!pdfCropState?.ready)return;pdfCropState.edit=newPdfCrop();void renderPdfCrop()}
function confirmPdfCrop(){if(!pdfCropState?.ready)return;pdfEdits.crops[pdfCropState.editorPage]=structuredClone(pdfCropState.edit);closePdfCropState();go('pdf');void renderPdfEditor()}
const pdfCropFrame=document.getElementById('pdf-crop-frame');
pdfCropFrame.addEventListener('pointerdown',event=>{
 if(!pdfCropState?.ready||event.button!==0)return;
 event.preventDefault();pdfCropState.drag={id:event.pointerId,handle:event.target.dataset.handle||'move',x:event.clientX,y:event.clientY,rect:{...pdfCropState.edit.rect},bounds:document.getElementById('pdf-crop-image').getBoundingClientRect()};pdfCropFrame.setPointerCapture(event.pointerId);
});
pdfCropFrame.addEventListener('pointermove',event=>{
 const state=pdfCropState,drag=state?.drag;if(!drag||drag.id!==event.pointerId)return;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value)),dx=(event.clientX-drag.x)/drag.bounds.width,dy=(event.clientY-drag.y)/drag.bounds.height,r=drag.rect,handle=drag.handle,min=.06;
 let rect;
 if(handle==='move')rect={...r,x:clamp(r.x+dx,0,1-r.w),y:clamp(r.y+dy,0,1-r.h)};
 else {
  let left=r.x,right=r.x+r.w,top=r.y,bottom=r.y+r.h;
  if(handle.includes('w'))left=clamp(left+dx,0,right-min);if(handle.includes('e'))right=clamp(right+dx,left+min,1);
  if(handle.includes('n'))top=clamp(top+dy,0,bottom-min);if(handle.includes('s'))bottom=clamp(bottom+dy,top+min,1);
  const ratio=pdfCropNormalizedRatio();
  if(ratio){
   const horizontal=handle.includes('w')||handle.includes('e'),vertical=handle.includes('n')||handle.includes('s');
   const ax=handle.includes('w')?r.x+r.w:handle.includes('e')?r.x:r.x+r.w/2,ay=handle.includes('n')?r.y+r.h:handle.includes('s')?r.y:r.y+r.h/2;
   let w=horizontal?right-left:(bottom-top)*ratio;
   if(horizontal&&vertical&&Math.abs(dy)>Math.abs(dx)/ratio)w=(bottom-top)*ratio;
   const maxW=horizontal?(handle.includes('w')?ax:1-ax):2*Math.min(ax,1-ax),maxH=vertical?(handle.includes('n')?ay:1-ay):2*Math.min(ay,1-ay);
   w=Math.min(Math.max(min, min*ratio,w),maxW,maxH*ratio);const h=w/ratio;
   left=handle.includes('w')?ax-w:handle.includes('e')?ax:ax-w/2;top=handle.includes('n')?ay-h:handle.includes('s')?ay:ay-h/2;right=left+w;bottom=top+h;
  }
  rect={x:left,y:top,w:right-left,h:bottom-top};
 }
 state.edit.rect=rect;updatePdfCropFrame();
});
for(const eventName of ['pointerup','pointercancel','lostpointercapture'])pdfCropFrame.addEventListener(eventName,()=>{if(pdfCropState)pdfCropState.drag=null});
new ResizeObserver(()=>fitPdfCropImage()).observe(document.getElementById('pdf-crop-workspace'));
document.addEventListener('keydown',event=>{
 const custom=!document.getElementById('pdf-custom-layer').hidden,size=!document.getElementById('pdf-size-layer').hidden;
 if(event.key==='Escape'){if(custom){event.preventDefault();closePdfCustomSize()}else if(size){event.preventDefault();closePdfSize()}else if(document.querySelector('.screen.active')?.id==='pdf-crop'){event.preventDefault();cancelPdfCrop()}}
 if(event.key==='Tab'&&(custom||size)){
  const root=document.getElementById(custom?'pdf-custom-layer':'pdf-size-layer'),controls=[...root.querySelectorAll('button:not(:disabled),input')],first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.querySelector('section'))){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 }
});
document.querySelectorAll('.pdf-custom-fields input').forEach(input=>input.addEventListener('input',()=>{document.getElementById('pdf-custom-error').textContent=''}));
