/* A shared preview: animated paper above an inline, collapsible glass settings sheet. */
iconPaths.printDirection='<path d="M12 18.5v-13m-4.5 4.5L12 5.5l4.5 4.5"/><path d="M8.5 21h7" opacity=".4"/>';
iconPaths.previewMinus='<path d="M5 12h14"/>';
const printPreviewState={source:'label',labelSettings:{copies:1,expanded:false,algorithm:'抖动',sharpness:50},labelDirection:0,labelIndex:0,observer:null};
const printPreviewLabelMarkup=document.querySelector('#preview .preview-paper').innerHTML;
function printPreviewSettings(){return printPreviewState.source==='pdf'?pdfState.previewSettings:printPreviewState.labelSettings}
function printPreviewDirection(){return printPreviewState.source==='pdf'?pdfState.direction:printPreviewState.labelDirection}
function renderPrintPreview(source){
 printPreviewState.observer?.disconnect();printPreviewState.source=source;printPreviewState.labelIndex=0;
 const pdf=source==='pdf',settings=printPreviewSettings();
 settings.algorithm??='抖动';settings.sharpness=Number.isFinite(Number(settings.sharpness))?Math.max(0,Math.min(100,Number(settings.sharpness))):50;settings.expanded??=false;
 const screen=document.getElementById('preview');screen.classList.add('print-preview-screen');
 screen.innerHTML=`<header class="topbar"><button class="back" aria-label="返回编辑" onclick="go(printPreviewState.source==='pdf'?(pdfJob.returnTo||'pdf-list'):'editor')">${svg('back')}</button><h1>打印预览</h1><button class="top-action preview-direction-toggle" aria-label="切换出纸方向" onclick="togglePrintPreviewDirection()">${svg('printDirection')}</button></header>
 <div class="print-preview-body${settings.expanded?' sheet-open':''}${pdf?' pdf-preview-body':''}">
  <div class="print-preview-stage"><div class="print-preview-direction">出纸方向 <span class="preview-feed-indicator" id="direction" role="img" aria-label="向上出纸">${svg('printDirection')}</span></div><div class="print-preview-workspace" aria-label="打印画布" onclick="togglePrintPreviewSheet()"><div class="print-preview-page-stack"><div class="print-preview-paper-hit" role="button" tabindex="0" aria-controls="print-preview-sheet" aria-expanded="${!!settings.expanded}" aria-label="${settings.expanded?'收起':'展开'}打印配置" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePrintPreviewSheet()}"><div class="print-preview-paper"><div class="print-preview-ink">${pdf?'<img id="pdf-output-image" alt="打印图片预览" onload="fitPrintPreviewPaper();updatePrintPreviewSize()">':`<div class="print-preview-label${typeof labelShape!=='undefined'&&labelShape==='ellipse'?' is-ellipse':''}">${window.esprintEditor?.previewMarkup()||printPreviewLabelMarkup}</div>`}</div></div></div>${pdf?`<div class="pdf-output-navigation" onclick="event.stopPropagation()"><button aria-label="预览上一页" onclick="changePdfPreviewPage(-1)">${svg('back')}</button><span id="pdf-output-position"></span><button aria-label="预览下一页" onclick="changePdfPreviewPage(1)">${svg('arrow')}</button></div>`:window.esprintData?.hasSerial()?`<div class="pdf-output-navigation label-output-navigation" hidden onclick="event.stopPropagation()"><button aria-label="预览上一份" onclick="changeLabelPreviewPage(-1)">${svg('back')}</button><span id="label-output-position"></span><button aria-label="预览下一份" onclick="changeLabelPreviewPage(1)">${svg('arrow')}</button></div>`:''}</div></div></div>
  <div class="print-preview-dock" tabindex="0" aria-label="打印配置，点击展开或收起" aria-expanded="${!!settings.expanded}" aria-controls="print-preview-sheet-extra" onclick="handlePrintPreviewDockClick(event)" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();togglePrintPreviewSheet()}">
  <section class="print-preview-sheet" id="print-preview-sheet" aria-label="打印配置"><div class="print-preview-quantity"><span>数量</span><div class="preview-copy-stepper"><button aria-label="减少打印数量" onclick="changePrintPreviewCopies(-1)">${svg('previewMinus')}</button><input type="number" id="${pdf?'pdf-output-copies':'label-output-copies'}" aria-label="打印数量" min="1" max="99" inputmode="numeric" value="${escapePrintPreviewValue(settings.copies)}" oninput="updatePrintPreviewSetting('copies',this.value)"><button aria-label="增加打印数量" onclick="changePrintPreviewCopies(1)">${svg('pdfAdd')}</button></div></div>
   <div class="print-preview-sheet-extra" id="print-preview-sheet-extra" ${settings.expanded?'':'inert'} aria-hidden="${!settings.expanded}">
    <div class="preview-option-row"><span>图像算法</span><div class="preview-algorithm-options" role="radiogroup" aria-label="图像算法">${['抖动','阈值'].map(value=>`<button role="radio" aria-checked="${settings.algorithm===value}" onclick="setPrintPreviewAlgorithm('${value}')">${value}</button>`).join('')}</div></div>
    <div class="preview-option-row"><span>文本清晰度</span><div class="preview-clarity-control" data-preview-control><input id="preview-clarity" type="range" min="0" max="100" step="1" aria-label="文本清晰度" value="${settings.sharpness}" style="--clarity-progress:${settings.sharpness}%" oninput="setPrintPreviewClarity(this.value)"><output id="preview-clarity-value" for="preview-clarity">${settings.sharpness}%</output></div></div>
    <div class="preview-option-row"><span>偏移值</span><div class="preview-offset-summary"><b id="preview-offset-value">${formatPrintOffset(lastPrintOffset)}</b><button class="preview-offset-edit" aria-label="修改偏移值" onclick="go('print-offset')">修改</button></div></div>
   </div></section>
  <footer class="print-preview-fixed"><div class="print-preview-device-info"><button class="print-preview-device" onclick="openDevice('preview')">${svg('bluetooth')}<b id="previewPrinter"></b></button><div class="print-preview-size"><span>尺寸</span><b id="print-preview-size"></b></div></div><button class="print-btn primary" id="printBtn" onclick="printNow()" disabled>连接打印机后打印</button></footer>
  </div>
 </div>`;
 updatePrintPreviewPaper();updateDevice();
 printPreviewState.observer=new ResizeObserver(()=>fitPrintPreviewPaper());printPreviewState.observer.observe(screen.querySelector('.print-preview-workspace'));
}
function escapePrintPreviewValue(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function updatePrintPreviewSetting(key,value){printPreviewSettings()[key]=value;if(key==='copies')syncPrintPreviewCopies()}
function syncPrintPreviewCopies(){
 const value=Number(printPreviewSettings().copies),buttons=document.querySelectorAll('.preview-copy-stepper button');if(!buttons.length)return;
 buttons[0].disabled=value<=1;buttons[1].disabled=value>=99;
 syncLabelPreview();
}
function changePrintPreviewCopies(delta){
 const current=Number(printPreviewSettings().copies),next=Math.max(1,Math.min(99,(Number.isInteger(current)?current:1)+delta));
 printPreviewSettings().copies=next;document.querySelector('.preview-copy-stepper input').value=next;syncPrintPreviewCopies();
}
function togglePrintPreviewSheet(force){
 const settings=printPreviewSettings(),expanded=typeof force==='boolean'?force:!settings.expanded;settings.expanded=expanded;
 const body=document.querySelector('.print-preview-body');if(!body)return;body.classList.toggle('sheet-open',expanded);
 const extra=document.getElementById('print-preview-sheet-extra');
 if(!expanded&&extra.contains(document.activeElement))document.querySelector('.print-preview-dock').focus();
 extra.inert=!expanded;extra.setAttribute('aria-hidden',!expanded);
 for(const selector of ['.print-preview-dock','.print-preview-paper-hit']){const control=document.querySelector(selector);control.setAttribute('aria-expanded',expanded);control.setAttribute('aria-label',(expanded?'收起':'展开')+'打印配置')}
}
function togglePrintPreviewDirection(){
 if(printPreviewState.source==='pdf')pdfState.direction=pdfState.direction?0:90;else printPreviewState.labelDirection=printPreviewState.labelDirection?0:90;
 syncPrintPreviewDirection();
}
function syncPrintPreviewDirection(){
 const direction=printPreviewDirection(),indicator=document.getElementById('direction');indicator.setAttribute('aria-label',direction?'向右出纸':'向上出纸');
 for(const element of [indicator,document.querySelector('.preview-direction-toggle')])element.style.setProperty('--feed-direction',direction+'deg');
 document.querySelector('.preview-direction-toggle').setAttribute('aria-pressed',!!direction);
}
toggleDirection=togglePrintPreviewDirection;
function updatePrintPreviewPaper(){
 if(!document.querySelector('.print-preview-body'))return;
 if(printPreviewState.source==='pdf'){
  const image=pdfJob.images[pdfState.previewIndex];if(!image)return;
  document.getElementById('pdf-output-image').src=image.url;document.getElementById('pdf-output-position').textContent=`${pdfState.previewIndex+1} / ${pdfJob.images.length}`;
  document.querySelector('.pdf-output-navigation button:first-child').disabled=pdfState.previewIndex===0;
  document.querySelector('.pdf-output-navigation button:last-child').disabled=pdfState.previewIndex===pdfJob.images.length-1;
 }
 syncPrintPreviewDirection();syncPrintPreviewCopies();updatePrintPreviewSize();fitPrintPreviewPaper();
}
function printPreviewPhysicalSize(){
 if(printPreviewState.source!=='pdf'&&window.esprintEditor)return [esprintEditor.state.width,esprintEditor.state.height];
 if(printPreviewState.source!=='pdf')return typeof newPhysicalSize!=='undefined'?[...newPhysicalSize]:[30,15];
 const image=pdfJob.images[pdfState.previewIndex],row=pdfJob.rows.find(row=>row.id===image?.fileId),size=row?.edits?.size;
 if(size)return [size.width,size.height];
 const element=document.getElementById('pdf-output-image');return [100,element?.naturalWidth?100*element.naturalHeight/element.naturalWidth:150];
}
function updatePrintPreviewSize(){
 const value=document.getElementById('print-preview-size');if(!value)return;
 const unit=typeof preferences!=='undefined'?preferences.unit:'mm',size=printPreviewPhysicalSize().map(n=>Number((unit==='inch'?n/25.4:n).toFixed(unit==='inch'?3:1)));
 value.textContent=size.join(' × ')+' '+unit;
}
function fitPrintPreviewPaper(){
 const workspace=document.querySelector('.print-preview-workspace');if(!workspace?.clientHeight||!workspace.clientWidth)return;
 const pdf=printPreviewState.source==='pdf',image=document.getElementById('pdf-output-image');
 const source=pdf&&image?.naturalWidth?[image.naturalWidth,image.naturalHeight]:printPreviewPhysicalSize();
 const [width,height]=source;
 const body=document.querySelector('.print-preview-body'),style=getComputedStyle(body),peek=parseFloat(style.getPropertyValue('--preview-peek-height')),expanded=parseFloat(style.getPropertyValue('--preview-expanded-height'));
 const opening=Math.max(0,Math.min(1,(document.getElementById('print-preview-sheet').getBoundingClientRect().height-peek)/(expanded-peek)));
 const availableWidth=Math.max(1,(workspace.clientWidth-16)*(1-.12*opening)),availableHeight=Math.max(1,workspace.clientHeight-(pdf||document.querySelector('.label-output-navigation:not([hidden])')?50:16));
 const scale=Math.min(availableWidth/width,availableHeight/height),paper=document.querySelector('.print-preview-paper'),ink=document.querySelector('.print-preview-ink');
 paper.style.width=width*scale+'px';paper.style.height=height*scale+'px';ink.style.width=source[0]*scale+'px';ink.style.height=source[1]*scale+'px';
}

function handlePrintPreviewDockClick(event){if(event.target.closest('button,input,select,a,[data-preview-control]'))return;togglePrintPreviewSheet()}
function setPrintPreviewAlgorithm(value){
 if(!['抖动','阈值'].includes(value))return;printPreviewSettings().algorithm=value;
 document.querySelectorAll('.preview-algorithm-options button').forEach(button=>button.setAttribute('aria-checked',button.textContent===value));
}
function setPrintPreviewClarity(value){
 const next=Math.max(0,Math.min(100,Math.round(Number(value)||0)));printPreviewSettings().sharpness=next;
 const input=document.getElementById('preview-clarity');input.value=next;input.style.setProperty('--clarity-progress',next+'%');document.getElementById('preview-clarity-value').textContent=next+'%';
}

function syncLabelPreview(){
 if(printPreviewState.source!=='label')return;
 const nav=document.querySelector('.label-output-navigation');if(!nav)return;
 const raw=Number(printPreviewSettings().copies),count=Number.isInteger(raw)?Math.max(1,Math.min(99,raw)):1;
 printPreviewState.labelIndex=Math.max(0,Math.min(count-1,printPreviewState.labelIndex));nav.hidden=count<=1;
 document.getElementById('label-output-position').textContent=`${printPreviewState.labelIndex+1} / ${count}`;
 nav.querySelector('button:first-child').disabled=printPreviewState.labelIndex===0;
 nav.querySelector('button:last-child').disabled=printPreviewState.labelIndex===count-1;
 const label=document.querySelector('.print-preview-label');if(label)label.innerHTML=window.esprintEditor.previewMarkup(printPreviewState.labelIndex);
 fitPrintPreviewPaper();
}
function changeLabelPreviewPage(delta){printPreviewState.labelIndex+=delta;syncLabelPreview();}
