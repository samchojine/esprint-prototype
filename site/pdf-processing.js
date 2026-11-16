/* Real page conversion progress shared by PDF opening and print preparation. */
const pdfPreparedDocuments=new Map();
const pdfProcessing={task:null,serial:0};
phoneEl.insertAdjacentHTML('beforeend',`<div id="pdf-processing-layer" class="pdf-processing-layer" hidden><section class="pdf-processing-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-processing-title" aria-describedby="pdf-processing-detail" tabindex="-1"><h2 id="pdf-processing-title">正在转换 PDF</h2><div class="pdf-processing-ring" id="pdf-processing-progress" role="progressbar" aria-label="图片处理进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><svg class="pdf-progress-svg" viewBox="0 0 144 144" aria-hidden="true"><defs><linearGradient id="pdf-progress-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#91b2e2"/><stop offset=".5" stop-color="#a1afde"/><stop offset="1" stop-color="#c3b1df"/></linearGradient></defs><circle class="pdf-progress-track" cx="72" cy="72" r="56"/><circle class="pdf-progress-value" cx="72" cy="72" r="56" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/><circle class="pdf-progress-halo" cx="72" cy="72" r="65" pathLength="100" stroke-dasharray="5 95"/></svg><div class="pdf-processing-number"><b id="pdf-processing-percent">0</b><span>%</span></div></div><p id="pdf-processing-detail" role="status">正在读取文件…</p><div class="pdf-processing-actions"><button class="secondary" id="pdf-processing-cancel" onclick="cancelPdfProcessing()">取消</button><button class="primary" id="pdf-processing-retry" onclick="retryPdfProcessing()" hidden>重试</button></div></section></div>`);

function pdfProcessingPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))}
function beginPdfProcessing({kind,title,total,onCancel,retry,unit='页'}){
 if(pdfProcessing.task)cancelPdfProcessing(false);
 const task={token:++pdfProcessing.serial,kind,title,total,unit,done:0,status:'running',source:document.querySelector('.screen.active')?.id,onCancel,retry,focus:document.activeElement,error:''};
 pdfProcessing.task=task;document.getElementById('pdf-processing-layer').hidden=false;
 const arc=document.querySelector('.pdf-progress-value');arc.style.transition='none';arc.setAttribute('stroke-dashoffset','100');arc.getBoundingClientRect();arc.style.transition='';
 document.querySelectorAll('.screen,.bottom-nav,.side').forEach(el=>el.inert=true);
 renderPdfProcessing(task);document.querySelector('.pdf-processing-dialog').focus();return task;
}
function renderPdfProcessing(task){
 if(pdfProcessing.task!==task)return;
 const failed=task.status==='failed',percent=task.total?Math.min(100,Math.floor(task.done/task.total*100)):0;
 document.getElementById('pdf-processing-title').textContent=failed?'图片处理失败':task.title;
 document.getElementById('pdf-processing-percent').textContent=percent;
 const bar=document.getElementById('pdf-processing-progress');bar.setAttribute('aria-valuenow',percent);bar.setAttribute('aria-valuetext',`${percent}%，${task.done} / ${task.total} ${task.unit}`);bar.dataset.state=failed?'failed':task.done===task.total?'complete':'running';
 document.querySelector('.pdf-progress-value').setAttribute('stroke-dashoffset',100-(task.total?Math.min(100,task.done/task.total*100):0));
 document.getElementById('pdf-processing-detail').textContent=failed?task.error:task.done===task.total?'处理完成':task.done?`已处理 ${task.done} / ${task.total} ${task.unit}`:`正在处理 0 / ${task.total} ${task.unit}`;
 document.getElementById('pdf-processing-retry').hidden=!failed;
 document.getElementById('pdf-processing-cancel').textContent=failed?'返回':'取消';
}
async function finishPdfProcessing(task){
 await pdfProcessingPaint();if(pdfProcessing.task!==task)return false;
 await Promise.allSettled(document.querySelector('.pdf-progress-value').getAnimations().map(animation=>animation.finished));
 return hidePdfProcessing(task);
}
function hidePdfProcessing(task,focus=false){
 if(pdfProcessing.task!==task)return false;
 pdfProcessing.task=null;document.getElementById('pdf-processing-layer').hidden=true;
 document.querySelectorAll('.screen,.bottom-nav,.side').forEach(el=>el.inert=false);
 if(focus&&task.focus?.isConnected)task.focus.focus();return true;
}
function cancelPdfProcessing(focus=true){const task=pdfProcessing.task;if(!task)return;hidePdfProcessing(task,focus);task.onCancel?.()}
function retryPdfProcessing(){const task=pdfProcessing.task;if(task?.status==='failed')task.retry?.()}
function failPdfProcessing(task,error){if(pdfProcessing.task!==task)return;task.status='failed';task.error=error?.message||'图片处理未完成，请重试';renderPdfProcessing(task)}
function releasePdfPrepared(id){const cached=pdfPreparedDocuments.get(id);if(!cached)return;cached.pages.forEach(page=>URL.revokeObjectURL(page.url));pdfPreparedDocuments.delete(id)}
function trimPdfPrepared(retainIds){
 const retained=new Set(retainIds);
 [...pdfPreparedDocuments.entries()].filter(([id])=>!retained.has(id)).sort((a,b)=>a[1].used-b[1].used).slice(0,Math.max(0,pdfPreparedDocuments.size-Math.max(3,retained.size))).forEach(([id])=>releasePdfPrepared(id));
}
async function preparePdfImages(file,task,{offset=0,total=file.pages,retainIds=[file.id]}={}){
 let cached=pdfPreparedDocuments.get(file.id);
 if(cached?.complete){cached.used=Date.now();task.done=offset+cached.pages.size;task.total=total;renderPdfProcessing(task);trimPdfPrepared(retainIds);return cached}
 if(cached)releasePdfPrepared(file.id);
 cached={pages:new Map(),complete:false,used:Date.now()};pdfPreparedDocuments.set(file.id,cached);
 try{
  const doc=await getPdfDocument(file.id);
  if(pdfProcessing.task!==task)return null;
  task.total=total;task.done=offset;renderPdfProcessing(task);
  for(let number=1;number<=doc.numPages;number++){
   if(pdfProcessing.task!==task)return null;
   const page=await doc.getPage(number),base=page.getViewport({scale:1});
   const canvas=await renderPdfSource(page,null,1600/Math.max(base.width,base.height));
   const width=canvas.width,height=canvas.height,blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;
   if(pdfProcessing.task!==task)return null;
   if(!blob)throw new Error('页面转图失败，请重试');
   cached.pages.set(number,{url:URL.createObjectURL(blob),blob,width,height});task.done=offset+number;renderPdfProcessing(task);
   await pdfProcessingPaint();
  }
  cached.complete=true;
  // Keep the active batch plus a small cache; never evict its earlier pages mid-open.
  trimPdfPrepared(retainIds);
  return cached;
 }finally{if(!cached.complete&&pdfPreparedDocuments.get(file.id)===cached)releasePdfPrepared(file.id)}
}
async function renderPdfPreparedSource(prepared,edit={rotation:0,flip:false}){
 const image=new Image();image.src=prepared.url;await image.decode();
 const quarterTurn=(edit.rotation||0)%180!==0,canvas=document.createElement('canvas');canvas.width=quarterTurn?prepared.height:prepared.width;canvas.height=quarterTurn?prepared.width:prepared.height;
 const ctx=canvas.getContext('2d');ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(edit.flip?-1:1,1);ctx.rotate((edit.rotation||0)*Math.PI/180);ctx.drawImage(image,-prepared.width/2,-prepared.height/2);return canvas;
}
document.addEventListener('keydown',event=>{
 if(!pdfProcessing.task)return;
 if(event.key==='Escape'){event.preventDefault();cancelPdfProcessing()}
 if(event.key==='Tab'){
  const controls=[...document.querySelectorAll('.pdf-processing-actions button:not([hidden])')],first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===document.querySelector('.pdf-processing-dialog'))){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 }
});
