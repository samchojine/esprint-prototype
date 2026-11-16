/* Local PDF management. PDF.js renders actual source pages; hardware is still mocked. */
const pdfState={files:[],loading:true,error:'',editing:false,selected:new Set(),query:'',menu:null,rename:null,importing:false,editor:null,editorPage:1,editorToken:0,excluded:new Set(),returnTo:'pdf-list',previewIndex:0,previewSource:false,previewSettings:{start:1,end:1,copies:1},direction:0};
const pdfJob={token:0,status:'idle',rows:[],images:[],completed:0,total:0,error:''};
let pdfDatabase=null,pdfEnginePromise=null;
const pdfDocuments=new Map();
const pdfThumbnails=new Map(),pdfThumbnailPending=new Set(),pdfThumbnailQueue=[];
let pdfThumbnailWorking=false;
const originalPrintNow=printNow;
iconPaths.pdfAdd='<path d="M12 5v14M5 12h14"/>';

phoneEl.insertAdjacentHTML('beforeend',`
 <section id="pdf-list" class="screen pdf-library-screen">
  <header class="topbar pdf-list-header"><button class="back" aria-label="返回首页" onclick="go('home')">${svg('back')}</button><button class="catalog-search-trigger" onclick="openPdfSearch()">${svg('search')}<span>搜索 PDF 文件</span></button><button class="top-action" id="pdf-edit" aria-label="管理 PDF 文件" aria-pressed="false" onclick="togglePdfEditing()">${svg('more')}</button></header>
  <div class="pdf-library-content"><div class="pdf-list-summary" id="pdf-list-summary" hidden><span id="pdf-list-selection" role="status"></span></div><div id="pdf-files"></div></div>
  <div class="pdf-list-footer" id="pdf-list-footer"><button class="primary pdf-import-button" id="pdf-import-button" aria-label="导入 PDF" title="导入 PDF" onclick="document.getElementById('pdf-file-input').click()">${svg('pdfAdd')}</button></div>
  <div class="pdf-bulk-actions" id="pdf-bulk-actions" hidden><button class="pdf-select-all" id="pdf-select-all" aria-pressed="false" onclick="selectAllPdfs()"><span class="pdf-select-circle">${svg('check')}</span><span>全选</span></button><button class="danger-solid" id="pdf-delete-selected" onclick="deleteSelectedPdfs()" disabled>删除</button><button class="primary" id="pdf-print-selected" onclick="startSelectedPdfBatch()" disabled>${svg('printer')}<span>批量打印</span></button></div>
 </section>
 <section id="pdf-search" class="screen pdf-library-screen"><header class="topbar catalog-search-top"><button class="back" aria-label="返回 PDF 文件" onclick="go('pdf-list')">${svg('back')}</button><form class="catalog-search-form" onsubmit="event.preventDefault();document.getElementById('pdf-query').blur()"><div class="catalog-search-input">${svg('search')}<input id="pdf-query" type="search" aria-label="搜索 PDF 文件" placeholder="搜索 PDF 文件名称" autocomplete="off" oninput="pdfState.query=this.value;renderPdfSearch()"><button class="catalog-search-clear" id="pdf-search-clear" type="button" aria-label="清空搜索" onclick="clearPdfSearch()" hidden>${svg('close')}</button></div><button class="catalog-search-submit" type="submit">搜索</button></form></header><div class="pdf-library-content" id="pdf-search-results"></div></section>
 <section id="pdf-batch" class="screen pdf-library-screen"><header class="topbar"><button class="back" aria-label="返回 PDF 文件" onclick="leavePdfBatch()">${svg('back')}</button><h1>批量打印</h1><span class="spacer"></span></header><div class="pdf-library-content"><div class="pdf-job-overview"><span class="pdf-job-orb" id="pdf-job-orb">${svg('file')}</span><h2 id="pdf-job-title">准备文件</h2><p id="pdf-job-description" role="status"></p><progress id="pdf-job-progress" value="0" max="1"></progress></div><div id="pdf-job-files"></div><p class="pdf-job-order" id="pdf-job-order"></p></div><div class="pdf-job-footer" id="pdf-job-footer"></div></section>
 <input type="file" id="pdf-file-input" accept="application/pdf,.pdf" multiple hidden onchange="importPdfFiles(this.files);this.value=''">
 <div class="pdf-menu-layer" id="pdf-menu-layer" hidden onclick="if(event.target===this)closePdfMenu()"><div class="personal-popover" id="pdf-file-menu" role="menu" aria-label="PDF 文件操作"></div></div>
 <div class="personal-dialog-layer" id="pdf-rename-layer" hidden onclick="if(event.target===this)closePdfRename()"><section class="personal-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-rename-title"><form onsubmit="renamePdfFile(event)"><h2 id="pdf-rename-title">重命名文件</h2><label class="personal-name-field"><span>文件名称</span><div class="pdf-name-input"><input id="pdf-rename-input" aria-label="文件名称" maxlength="80" autocomplete="off"><span>.pdf</span></div></label><p class="personal-dialog-error" id="pdf-rename-error" role="alert"></p><div class="personal-dialog-actions"><button type="button" class="secondary" onclick="closePdfRename()">取消</button><button type="submit" class="primary" id="pdf-rename-confirm">确定</button></div></form></section></div>
`);
pages.splice(pages.findIndex(([id])=>id==='pdf'),0,['pdf-list','PDF 文件'],['pdf-search','PDF 搜索'],['pdf-batch','PDF 批量打印']);

function loadPdfEngine(){
 if(!pdfEnginePromise)pdfEnginePromise=import('./vendor/pdfjs/pdf.min.mjs').then(engine=>{engine.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',location.href).href;return engine}).catch(error=>{pdfEnginePromise=null;throw error});
 return pdfEnginePromise;
}
function pdfMetadata(record){const {data,...metadata}=record;return metadata}
function openPdfDatabase(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('ESPrintPdfPrototype',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('files',{keyPath:'id'});request.result.createObjectStore('settings')};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
function pdfStoreRead(store,key){
 return new Promise((resolve,reject)=>{
  const request=pdfDatabase.transaction(store,'readonly').objectStore(store).get(key);
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
function pdfStoreWrite(records=[],deleted=[],initialized=false){
 return new Promise((resolve,reject)=>{
  const transaction=pdfDatabase.transaction(['files','settings'],'readwrite'),store=transaction.objectStore('files');
  records.forEach(record=>store.put(record));deleted.forEach(id=>store.delete(id));
  if(initialized)transaction.objectStore('settings').put(true,'initialized');
  transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('写入已中断'));
 });
}
function pdfAllRecords(){return new Promise((resolve,reject)=>{const request=pdfDatabase.transaction('files','readonly').objectStore('files').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}

// Original, valid PDF examples make the initial UI and conversion path inspectable.
function samplePdfBytes(pages,label){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const kids=[];
 for(let i=1;i<=pages;i++){
  const pageId=objects.length+1,contentId=pageId+1;kids.push(pageId+' 0 R');
  const bars=Array.from({length:45},(_,j)=>`${24+j*5} 212 ${j%3===0?3:1} 45 re f`).join('\n');
  const stream=`0.17 0.20 0.27 rg\nBT /F1 17 Tf 24 377 Td (ESPrint / ${label}) Tj 0 -28 Td /F1 10 Tf (Page ${i} of ${pages}) Tj 0 -35 Td (TO: ESPrint Studio) Tj 0 -17 Td (Document and package) Tj ET\n${bars}\nBT /F1 9 Tf 24 185 Td (ES 2026 11 ${String(i).padStart(4,'0')}) Tj 0 -45 Td (100 x 150 mm) Tj ET`;
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 283.465 425.197] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
 }
 objects[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>`;
 let text='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(text.length);text+=`${index+1} 0 obj\n${object}\nendobj\n`});
 const xref=text.length;text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new TextEncoder().encode(text).buffer;
}
async function initializePdfLibrary(){
 pdfState.loading=true;pdfState.error='';renderPdfLibrary();
 try{
  if(!pdfDatabase)pdfDatabase=await openPdfDatabase();
  if(!await pdfStoreRead('settings','initialized')){
   const records=[['pdf-demo-1','发货标签.pdf',6,'SHIPPING'],['pdf-demo-2','商品清单.pdf',4,'PRODUCTS'],['pdf-demo-3','资料索引.pdf',2,'ARCHIVE']].map(([id,name,pages,label],index)=>{
    const data=samplePdfBytes(pages,label);return {id,name,pages,data,size:data.byteLength,added:Date.now()-index*86400000,source:'sample'};
   });
   await pdfStoreWrite(records,[],true);
  }
  pdfState.files=(await pdfAllRecords()).map(pdfMetadata).sort((a,b)=>b.added-a.added);
 }catch(error){pdfState.error='无法读取本地文件库，请重试或检查浏览器存储权限。';console.error(error)}
 pdfState.loading=false;renderPdfLibrary();renderPdfSearch();
}
function formatPdfSize(bytes){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`}
function pdfDate(value){return new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(value)}
function pdfFileIcon(){return `<span class="pdf-file-icon">${svg('file')}<i>PDF</i></span>`}
function pdfThumbnailMarkup(file){
 const cached=pdfThumbnails.get(file.id);
 return `<span class="pdf-file-thumbnail" data-pdf-thumbnail="${file.id}">${cached?.url?`<img src="${cached.url}" alt="${templateText(file.name)}首页缩略图" onerror="this.parentElement.innerHTML=pdfFileIcon()">`:pdfFileIcon()}</span>`;
}
function schedulePdfThumbnails(files){
 for(const file of files){
  if(pdfThumbnails.has(file.id)||pdfThumbnailPending.has(file.id))continue;
  pdfThumbnailPending.add(file.id);pdfThumbnailQueue.push(file.id);
 }
 if(!pdfThumbnailWorking)void renderPdfThumbnails();
}
async function renderPdfThumbnails(){
 pdfThumbnailWorking=true;
 try{
  while(pdfThumbnailQueue.length){
   const id=pdfThumbnailQueue.shift();let canvas;
   try{
    if(!pdfState.files.some(file=>file.id===id))continue;
    const doc=await getPdfDocument(id),page=await doc.getPage(1),base=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(104/base.width,128/base.height)});
    canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#ffffff'}).promise;
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('无缩略图');
    if(!pdfState.files.some(file=>file.id===id))continue;
    const url=URL.createObjectURL(blob);pdfThumbnails.set(id,{url});
    document.querySelectorAll('[data-pdf-thumbnail]').forEach(slot=>{
     if(slot.dataset.pdfThumbnail!==id)return;
     const img=document.createElement('img');img.src=url;img.alt=(pdfState.files.find(file=>file.id===id)?.name||'PDF')+'首页缩略图';
     img.onerror=()=>{slot.innerHTML=pdfFileIcon()};slot.replaceChildren(img);
    });
   }catch{if(pdfState.files.some(file=>file.id===id))pdfThumbnails.set(id,{failed:true})}
   finally{if(canvas)canvas.width=canvas.height=0;pdfThumbnailPending.delete(id)}
  }
 }finally{pdfThumbnailWorking=false}
}
function releasePdfThumbnail(id){const thumbnail=pdfThumbnails.get(id);if(thumbnail?.url)URL.revokeObjectURL(thumbnail.url);pdfThumbnails.delete(id)}
function pdfFileRows(files,search=false){
 return files.map(file=>{
  const selected=pdfState.selected.has(file.id),editing=pdfState.editing&&!search;
  return `<article class="pdf-file-row"><button class="pdf-file-open" data-pdf-id="${file.id}" ${editing?`aria-pressed="${selected}"`:''} aria-label="${editing?'选择':'打开'}${templateText(file.name)}" onclick="openPdfFile('${file.id}','${search?'pdf-search':'pdf-list'}')">${editing?`<span class="pdf-select-circle">${svg('check')}</span>`:''}${pdfThumbnailMarkup(file)}<span class="pdf-file-info"><b>${templateText(file.name)}</b><small>${file.pages} 页<span>·</span>${formatPdfSize(file.size)}</small><time>${pdfDate(file.added)}</time></span></button>${editing?'':`<button class="pdf-file-more" data-pdf-more="${file.id}" aria-label="操作${templateText(file.name)}" aria-haspopup="menu" aria-expanded="false" onclick="openPdfMenu(event,'${file.id}')">${svg('more')}</button>`}</article>`;
 }).join('');
}
function pdfEmptyMarkup(search=false){return `<div class="pdf-library-empty">${svg(search?'search':'file')}<p>${search?'没有找到匹配的 PDF':'还没有 PDF 文件'}</p>${search?'<button class="secondary" onclick="clearPdfSearch()">重新搜索</button>':'<button class="primary" onclick="document.getElementById(\'pdf-file-input\').click()">导入 PDF</button>'}</div>`}
function renderPdfLibrary(){
 const files=pdfState.files;
 document.getElementById('pdf-files').innerHTML=pdfState.loading?'<div class="pdf-library-empty"><span class="small-spinner"></span></div>':pdfState.error?`<div class="pdf-library-empty">${svg('warning')}<p>${pdfState.error}</p><button class="secondary" onclick="initializePdfLibrary()">重试</button></div>`:files.length?pdfFileRows(files):pdfEmptyMarkup();
 const edit=document.getElementById('pdf-edit');edit.innerHTML=pdfState.editing?'完成':svg('more');edit.setAttribute('aria-pressed',String(pdfState.editing));edit.setAttribute('aria-label',pdfState.editing?'完成 PDF 多选':'管理 PDF 文件');
 edit.disabled=pdfState.loading||!!pdfState.error||pdfState.importing;
 document.getElementById('pdf-list-footer').hidden=pdfState.editing;
 document.getElementById('pdf-bulk-actions').hidden=!pdfState.editing;
 document.getElementById('pdf-list-summary').hidden=!pdfState.editing;
 document.getElementById('pdf-list-selection').textContent=pdfState.editing?`已选 ${pdfState.selected.size} 项`:'';
 const all=files.length>0&&files.every(file=>pdfState.selected.has(file.id));
 document.getElementById('pdf-select-all').setAttribute('aria-pressed',String(all));document.querySelector('#pdf-select-all > span:last-child').textContent=all?'取消全选':'全选';document.getElementById('pdf-select-all').disabled=files.length===0;
 ['pdf-delete-selected','pdf-print-selected'].forEach(id=>document.getElementById(id).disabled=!pdfState.selected.size);
 const importer=document.getElementById('pdf-import-button');importer.disabled=pdfState.loading||!!pdfState.error||pdfState.importing;importer.setAttribute('aria-label',pdfState.importing?'正在导入 PDF':'导入 PDF');importer.setAttribute('aria-busy',String(pdfState.importing));importer.innerHTML=pdfState.importing?'<span class="small-spinner"></span>':svg('pdfAdd');
 if(!pdfState.loading&&!pdfState.error)schedulePdfThumbnails(files);
 settleCatalogLayout('pdf-list');
}
function togglePdfEditing(){closePdfMenu(false);pdfState.editing=!pdfState.editing;pdfState.selected.clear();renderPdfLibrary()}
function selectAllPdfs(){
 const all=pdfState.files.every(file=>pdfState.selected.has(file.id));pdfState.files.forEach(file=>all?pdfState.selected.delete(file.id):pdfState.selected.add(file.id));renderPdfLibrary();
}
function openPdfSearch(){pdfState.editing=false;pdfState.selected.clear();go('pdf-search');document.getElementById('pdf-query').focus()}
function clearPdfSearch(){pdfState.query='';document.getElementById('pdf-query').value='';renderPdfSearch();document.getElementById('pdf-query').focus()}
function renderPdfSearch(){
 const query=pdfState.query.trim().toLowerCase(),files=pdfState.files.filter(file=>file.name.toLowerCase().includes(query));
 document.getElementById('pdf-search-clear').hidden=!pdfState.query;
 document.getElementById('pdf-search-results').innerHTML=`<div class="pdf-list-summary"><span role="status">${query?'找到':'全部'} ${files.length} 个文件</span></div>`+(files.length?pdfFileRows(files,true):pdfEmptyMarkup(!!query));
 if(!pdfState.loading&&!pdfState.error)schedulePdfThumbnails(files);
 settleCatalogLayout('pdf-search');
}
function pdfUniqueName(name,excludeId){
 const clean=name.replace(/\.pdf$/i,'').trim()||'未命名文件';let result=clean+'.pdf',index=2;
 while(pdfState.files.some(file=>file.id!==excludeId&&file.name===result))result=`${clean} (${index++}).pdf`;
 return result;
}
async function importPdfFiles(files){
 if(!files?.length||pdfState.importing||!pdfDatabase)return;
 const incoming=[...files];
 pdfState.importing=true;renderPdfLibrary();let imported=0;const failed=[];
 try{
  const engine=await loadPdfEngine();
  for(const file of incoming){
   let task;
   try{
    const data=await file.arrayBuffer(),signature=new TextDecoder().decode(data.slice(0,1024));
    if(!signature.includes('%PDF-'))throw new Error('不是有效的 PDF');
    task=engine.getDocument(pdfDocumentOptions(new Uint8Array(data.slice(0))));
    const doc=await task.promise;if(!doc.numPages)throw new Error('文件没有可用页面');
    const record={id:'pdf-'+crypto.randomUUID(),name:pdfUniqueName(file.name),size:data.byteLength,pages:doc.numPages,added:Date.now(),source:'local',data};
    await pdfStoreWrite([record]);pdfState.files.unshift(pdfMetadata(record));imported++;
   }catch(error){failed.push(`${file.name}：${error.name==='PasswordException'?'文件已加密，请先解锁':error.message==='不是有效的 PDF'?'不是有效的 PDF':'无法读取或保存文件'}`)}
   finally{if(task)await task.destroy().catch(()=>{})}
  }
 }catch{failed.push('PDF 组件加载失败，请重试')}
 pdfState.importing=false;renderPdfLibrary();renderPdfSearch();
 if(failed.length)showModal('fail',imported?`已导入 ${imported} 个，部分失败`:'未能导入文件',failed.slice(0,3).join('\n'));
 else if(imported)toast('success',`已导入 ${imported} 个 PDF`);
}
function pdfDocumentOptions(data){return {data,cMapUrl:new URL('./vendor/pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',location.href).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',location.href).href,isEvalSupported:false}}
async function getPdfDocument(id){
 if(window.esprintPhoto?.hasDocument(id))return esprintPhoto.getDocument(id);
 if(!pdfDocuments.has(id)){
  pdfDocuments.set(id,(async()=>{
   const record=await pdfStoreRead('files',id);if(!record?.data)throw new Error('文件不可用，请重新导入');
   const engine=await loadPdfEngine();return engine.getDocument(pdfDocumentOptions(new Uint8Array(record.data))).promise;
  })().catch(error=>{pdfDocuments.delete(id);throw error}));
 }
 return pdfDocuments.get(id);
}
function closePdfMenu(restoreFocus=true){
 const layer=document.getElementById('pdf-menu-layer');if(!layer||layer.hidden)return;
 const trigger=pdfState.menu?.trigger;layer.hidden=true;pdfState.menu=null;trigger?.setAttribute('aria-expanded','false');if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});
}
function openPdfMenu(event,id){
 event.stopPropagation();closePdfMenu(false);
 const trigger=event.currentTarget,layer=document.getElementById('pdf-menu-layer'),menu=document.getElementById('pdf-file-menu');
 pdfState.menu={id,trigger};menu.innerHTML=`<button class="personal-menu-item" role="menuitem" onclick="openPdfRename()">${svg('edit')}<span>重命名</span></button><button class="personal-menu-item personal-menu-danger" role="menuitem" onclick="deletePdfFromMenu()">${svg('trash')}<span>删除</span></button>`;
 layer.hidden=false;trigger.setAttribute('aria-expanded','true');
 const bounds=layer.getBoundingClientRect(),anchor=trigger.getBoundingClientRect();
 menu.style.left=Math.min(bounds.width-menu.offsetWidth-12,Math.max(12,anchor.right-bounds.left-menu.offsetWidth))+'px';
 let top=anchor.bottom-bounds.top+8;menu.dataset.arrow='top';
 if(top+menu.offsetHeight>bounds.height-18){top=anchor.top-bounds.top-menu.offsetHeight-8;menu.dataset.arrow='bottom'}
 menu.style.top=Math.max(70,top)+'px';menu.style.setProperty('--arrow-position',(menu.offsetWidth-17)+'px');menu.querySelector('button').focus({preventScroll:true});
}
function openPdfRename(){
 const target=pdfState.menu,file=pdfState.files.find(file=>file.id===target?.id);if(!file)return;
 closePdfMenu(false);pdfState.rename={id:file.id,trigger:target.trigger};
 document.getElementById('pdf-rename-input').value=file.name.replace(/\.pdf$/i,'');document.getElementById('pdf-rename-error').textContent='';document.getElementById('pdf-rename-layer').hidden=false;document.getElementById('pdf-rename-input').focus();document.getElementById('pdf-rename-input').select();
}
function closePdfRename(restoreFocus=true){
 const layer=document.getElementById('pdf-rename-layer');if(!layer||layer.hidden)return;
 const trigger=pdfState.rename?.trigger;layer.hidden=true;pdfState.rename=null;if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});
}
async function renamePdfFile(event){
 event.preventDefault();const id=pdfState.rename?.id,name=document.getElementById('pdf-rename-input').value.trim().replace(/\.pdf$/i,'');if(!id)return;
 if(!name){document.getElementById('pdf-rename-error').textContent='请输入文件名称';return}
 if(pdfState.files.some(file=>file.id!==id&&file.name===name+'.pdf')){document.getElementById('pdf-rename-error').textContent='已有同名文件，请换一个名称';return}
 const button=document.getElementById('pdf-rename-confirm');button.disabled=true;
 try{
  const record=await pdfStoreRead('files',id);if(!record)throw new Error('文件不可用');record.name=name+'.pdf';await pdfStoreWrite([record]);
  const file=pdfState.files.find(file=>file.id===id);if(file)file.name=record.name;
  closePdfRename(false);renderPdfLibrary();renderPdfSearch();toast('success','文件已重命名');
 }catch{document.getElementById('pdf-rename-error').textContent='重命名失败，请重试'}finally{button.disabled=false}
}
function deletePdfFromMenu(){const id=pdfState.menu?.id;closePdfMenu(false);if(id)confirmDeletePdfs([id])}
function deleteSelectedPdfs(){if(pdfState.selected.size)confirmDeletePdfs([...pdfState.selected])}
function confirmDeletePdfs(ids){
 confirm(`删除这 ${ids.length} 个 PDF？`,'将从文件列表移除，不会删除最初导入的原始文件。',async()=>{
  try{
   await pdfStoreWrite([],ids);pdfState.files=pdfState.files.filter(file=>!ids.includes(file.id));
   ids.forEach(id=>{pdfState.selected.delete(id);releasePdfThumbnail(id);releasePdfPrepared(id);pdfEditSessions.delete(id);const doc=pdfDocuments.get(id);pdfDocuments.delete(id);doc?.then(doc=>doc.destroy()).catch(()=>{})});
   renderPdfLibrary();renderPdfSearch();toast('success',`已删除 ${ids.length} 个文件`);
  }catch{showModal('fail','删除失败','本地文件库写入失败，请重试。')}
 });
}

function startSelectedPdfBatch(){openPdfFiles(pdfState.files.filter(file=>pdfState.selected.has(file.id)).map(file=>file.id),'pdf-list')}
function clearPdfImages(){pdfJob.images.forEach(image=>URL.revokeObjectURL(image.url));pdfJob.images=[]}
async function startPdfBatch(ids,fromEditor=false,retainedPages=null,retainedEdits=null,returnTo=null){
 if(!ids.length)return;
 const files=ids.map(id=>pdfState.files.find(file=>file.id===id)||window.esprintPhoto?.metadata(id)).filter(Boolean);if(!files.length)return;
 const editorConfig=fromEditor?pdfEditorJobConfig():null;
 if(fromEditor&&!editorConfig)return;
 if(pdfProcessing.task?.status==='running')return;
 if(pdfProcessing.task)cancelPdfProcessing(false);
 pdfJob.returnTo=returnTo||(fromEditor?'pdf':document.querySelector('.screen.active')?.id||'pdf-list');
 const excluded=fromEditor?new Set(pdfState.excluded):new Set();
 pdfJob.token++;clearPdfImages();pdfJob.completed=0;pdfJob.error='';pdfJob.status='running';
 pdfJob.rows=files.map(file=>{
  const mapped=editorConfig?pdfState.editorPages.map((source,index)=>({...source,index:index+1})).filter(source=>source.fileId===file.id&&source.index>=editorConfig.start&&source.index<=editorConfig.end&&!excluded.has(source.index)):null;
  const edits=retainedEdits?.[file.id]||(editorConfig?{size:{...editorConfig.size},crops:Object.fromEntries(mapped.filter(source=>editorConfig.crops[source.index]).map(source=>[source.page,structuredClone(editorConfig.crops[source.index])]))}:null);
  return {...file,pageNumbers:retainedPages?.[file.id]||(mapped?mapped.map(source=>source.page):Array.from({length:file.pages},(_,i)=>i+1)),edits,status:'waiting',done:0};
 }).filter(row=>row.pageNumbers.length);
 pdfJob.total=pdfJob.rows.reduce((sum,row)=>sum+row.pageNumbers.length,0);
 if(!pdfJob.total){toast('warn','至少选择一页用于打印');pdfJob.status='idle';return}
 const token=pdfJob.token,task=beginPdfProcessing({kind:'print',title:'正在处理图片',total:pdfJob.total,unit:files.every(file=>file.kind==='image')?'张':'页',onCancel:cancelPdfConversion,retry:retryPdfConversion});renderPdfJob();
 await pdfProcessingPaint();if(token!==pdfJob.token)return;
 try{
  for(const row of pdfJob.rows){
   if(token!==pdfJob.token)return;row.status='reading';renderPdfJob();
   const doc=await getPdfDocument(row.id);if(token!==pdfJob.token)return;row.status='converting';renderPdfJob();
   for(const pageNumber of row.pageNumbers){
    if(token!==pdfJob.token)return;
    const page=await doc.getPage(pageNumber);
    const canvas=await renderPdfEditedPage(page,row.edits?.crops?.[pageNumber],row.edits?.size);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;
    if(token!==pdfJob.token)return;if(!blob)throw new Error('页面转图失败');
    pdfJob.images.push({fileId:row.id,name:row.name,page:pageNumber,url:URL.createObjectURL(blob),blob});row.done++;pdfJob.completed++;renderPdfJob();await pdfProcessingPaint();
   }
   row.status='done';renderPdfJob();
  }
  if(token!==pdfJob.token)return;pdfJob.status='ready';renderPdfJob();
  if(!await finishPdfProcessing(task)||token!==pdfJob.token)return;openPdfBatchPreview();
 }catch(error){if(token!==pdfJob.token)return;pdfJob.status='failed';pdfJob.error=error.message||'转图失败';const row=pdfJob.rows.find(row=>['reading','converting'].includes(row.status));if(row)row.status='failed';renderPdfJob();failPdfProcessing(task,error)}
}
function cancelPdfConversion(){if(pdfProcessing.task?.kind==='print'){cancelPdfProcessing();return}pdfJob.token++;pdfJob.status='cancelled';clearPdfImages();renderPdfJob()}
function retryPdfConversion(){startPdfBatch(pdfJob.rows.map(row=>row.id),false,Object.fromEntries(pdfJob.rows.map(row=>[row.id,row.pageNumbers])),Object.fromEntries(pdfJob.rows.map(row=>[row.id,row.edits])),pdfJob.returnTo)}
function leavePdfBatch(){if(pdfJob.status==='running')cancelPdfConversion();go('pdf-list')}
function renderPdfJob(){
 if(pdfProcessing.task?.kind==='print'){const task=pdfProcessing.task;task.done=pdfJob.completed;task.total=pdfJob.total;renderPdfProcessing(task);}
 const status=pdfJob.status,ready=status==='ready',busy=status==='running';
 const titles={idle:'选择文件后开始',running:'正在转为图片',ready:'已准备好打印',failed:'文件处理未完成',cancelled:'已停止转换'};
 document.getElementById('pdf-job-title').textContent=titles[status];
 document.getElementById('pdf-job-description').textContent=pdfJob.error||`${pdfJob.rows.length} 个文件 · ${pdfJob.completed} / ${pdfJob.total} 页${ready?'已转为图片':''}`;
 document.getElementById('pdf-job-progress').max=Math.max(1,pdfJob.total);document.getElementById('pdf-job-progress').value=pdfJob.completed;
 document.getElementById('pdf-job-orb').innerHTML=svg(ready?'check':status==='failed'?'warning':'file');
 document.getElementById('pdf-job-files').innerHTML=pdfJob.rows.map((row,index)=>{
  const image=pdfJob.images.find(image=>image.fileId===row.id),labels={waiting:'等待处理',reading:'读取文件',converting:`生成图片 ${row.done} / ${row.pageNumbers.length}`,done:`${row.done} 张图片`,failed:'处理失败'};
  return `<div class="pdf-job-file"><span class="pdf-job-file-preview">${image?`<img src="${image.url}" alt="${templateText(row.name)}首页预览">`:pdfFileIcon()}</span><span class="pdf-job-file-copy"><b>${templateText(row.name)}</b><small>${labels[row.status]}${status==='cancelled'&&row.status!=='done'?' · 已停止':''}</small></span><span class="pdf-job-file-order">${row.status==='done'?svg('check'):String(index+1).padStart(2,'0')}</span></div>`;
 }).join('');
 document.getElementById('pdf-job-order').textContent=pdfJob.rows.length?'按文件列表顺序、原始页码依次打印':'';
 document.getElementById('pdf-job-footer').innerHTML=ready?'<button class="primary" onclick="openPdfBatchPreview()">打印预览</button>':busy?'<button class="secondary" onclick="cancelPdfConversion()">取消转换</button>':status==='failed'||status==='cancelled'?'<button class="secondary" onclick="go(\'pdf-list\')">返回列表</button><button class="primary" onclick="retryPdfConversion()">重新转换</button>':'<button class="secondary" onclick="go(\'pdf-list\')">选择 PDF</button>';
 settleCatalogLayout('pdf-batch');
}

function openPdfBatchPreview(){if(pdfJob.status!=='ready')return;pdfState.previewIndex=0;pdfState.previewSettings={copies:1};pdfState.direction=0;pdfState.previewSource=true;go('preview')}
function renderPdfBatchPreview(){renderPrintPreview('pdf')}
function updatePdfPreviewImage(){updatePrintPreviewPaper()}
function changePdfPreviewPage(delta){pdfState.previewIndex=Math.max(0,Math.min(pdfJob.images.length-1,pdfState.previewIndex+delta));updatePdfPreviewImage()}
printNow=function(){
 if(pdfState.previewSource&&document.querySelector('.screen.active')?.id==='preview'){
  const start=1,end=pdfJob.images.length,copies=Number(document.getElementById('pdf-output-copies').value);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>pdfJob.images.length){toast('warn',`请输入 1–${pdfJob.images.length} 内有效的起止页码`);return}
  if(!Number.isInteger(copies)||copies<1||copies>99){toast('warn','打印份数请输入 1–99 的整数');return}
  if(!isConnected){toast('warn','请先连接打印机');return}
  showModal('loading','正在发送打印数据…',`${end-start+1} 页 × ${copies} 份 · 原型打印演示`);
  const token=++actionToken;setTimeout(()=>{if(token===actionToken)showModal('success','批量打印流程演示完成',`${end-start+1} 页 × ${copies} 份。实际打印仍需接入设备协议。`)},1000);return;
 }
 if(document.querySelector('.screen.active')?.id==='preview'){
  const copies=Number(printPreviewSettings().copies);
  if(!Number.isInteger(copies)||copies<1||copies>99){toast('warn','打印份数请输入 1–99 的整数');return}
  if(!isConnected){toast('warn','请先连接打印机');return}
 }
 originalPrintNow();
};
function preparePdfNavigation(id){
 const current=document.querySelector('.screen.active')?.id;
 if(pdfProcessing.task&&id!==pdfProcessing.task.source)cancelPdfProcessing(false);
 if(id!=='pdf-list'&&pdfState.editing){pdfState.editing=false;pdfState.selected.clear();renderPdfLibrary();}
 if(current==='pdf-batch'&&id!=='pdf-batch'&&pdfJob.status==='running')cancelPdfConversion();
 if(id==='preview'){
  const fromPdf=current==='pdf-batch'||pdfState.previewSource;
  if(fromPdf&&pdfJob.status==='ready'){pdfState.previewSource=true;renderPdfBatchPreview()}
  else {pdfState.previewSource=false;if(current==='editor')printPreviewState.labelSettings.expanded=false;renderPrintPreview('label');}
 }
 if(['home','editor','pdf-list','pdf'].includes(id))pdfState.previewSource=false;
 if(id==='print-offset')renderPrintOffset();
 if(id==='pdf-list')renderPdfLibrary();
 if(id==='pdf-search')renderPdfSearch();
 if(id==='pdf-batch')renderPdfJob();
}
function syncPdfNavigation(id){
 if(id==='preview')fitPrintPreviewPaper();
 if(id==='print-offset')fitPrintOffsetPaper();
 if(id==='pdf'&&!pdfState.editor)renderPdfEditor();
 if(id==='pdf-crop'&&!pdfCropState){document.getElementById('pdf-crop-image').hidden=true;document.getElementById('pdf-crop-message').textContent='请先从 PDF 文件列表选择文件';syncPdfCropControls();}
 if(id!=='pdf')closePdfSize(false);
 if(id!=='pdf-crop'&&pdfCropState)closePdfCropState();
}
['pdf-list','pdf-search'].forEach(id=>document.getElementById(id).addEventListener('scroll',()=>closePdfMenu(false),{passive:true}));
window.addEventListener('resize',()=>closePdfMenu(false));
document.addEventListener('keydown',event=>{
 if(pdfState.rename){
  if(event.key==='Escape'){event.preventDefault();closePdfRename()}
  if(event.key==='Tab'){
   const controls=[...document.querySelectorAll('#pdf-rename-layer input,#pdf-rename-layer button:not(:disabled)')],first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }else if(pdfState.menu){
  if(event.key==='Escape'){event.preventDefault();closePdfMenu()}
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const buttons=[...document.querySelectorAll('#pdf-file-menu button')],index=buttons.indexOf(document.activeElement);buttons[(index+1)%buttons.length].focus()}
  if(event.key==='Tab')closePdfMenu();
 }
});
initializePdfLibrary();
