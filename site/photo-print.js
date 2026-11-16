/* Local photos adapt to the existing non-destructive PDF/image editing pipeline. */
(() => {
 const assets=[],documents=new Map();let selected=[],origin='home',serial=0,importToken=0,previewId=null,busy=false;
 const esc=templateText;
 phoneEl.insertAdjacentHTML('beforeend',`
 <section id="photo-picker" class="screen"><header class="topbar"><button class="back" aria-label="取消图片选择">${svg('back')}</button><h1>最近图片</h1><button class="top-action photo-add" aria-label="添加图片">${svg('plus')}</button></header>
 <div class="photo-picker-body"><div class="photo-selection-caption"><span>选择图片</span><span id="photo-selection-count">0 / 30</span></div><div class="photo-grid" id="photo-grid"></div><p class="photo-import-status" role="status"></p></div>
 <footer class="photo-selection-footer"><button class="secondary photo-preview-button">预览</button><button class="primary photo-confirm">确认 <span>(0/30)</span></button></footer></section>
 <section id="photo-preview" class="screen"><header class="topbar"><button class="back" aria-label="返回图片选择">${svg('back')}</button><h1>图片预览</h1><button class="top-action photo-preview-select" aria-label="选择当前图片" aria-pressed="true"></button></header><div class="photo-preview-stage"><img alt="当前图片预览"><button class="photo-preview-prev" aria-label="上一张图片">${svg('back')}</button><button class="photo-preview-next" aria-label="下一张图片">${svg('arrow')}</button></div><div class="photo-preview-strip"></div><footer class="photo-selection-footer"><span class="photo-preview-position"></span><button class="primary photo-confirm">确认 <span>(0/30)</span></button></footer></section>
 <input type="file" id="photo-file-input" accept="image/*" multiple hidden>`);
 const picker=document.getElementById('photo-picker'),preview=document.getElementById('photo-preview'),input=document.getElementById('photo-file-input');
 const add=document.createElement('button');add.id='photo-editor-add';add.className='top-action photo-add';add.hidden=true;add.setAttribute('aria-label','添加图片');add.innerHTML=svg('plus');add.onclick=()=>open('pdf',false);
 document.querySelector('#pdf .topbar .spacer').replaceWith(add);
 const selectedAssets=()=>selected.map(id=>assets.find(a=>a.id===id)).filter(Boolean);
 function render(){
  const count=selected.length;
  document.getElementById('photo-selection-count').textContent=`${count} / 30`;
  document.querySelectorAll('.photo-confirm').forEach(button=>{button.disabled=!count||busy;button.lastElementChild.textContent=`(${count}/30)`});
  picker.querySelector('.photo-preview-button').disabled=!count||busy;picker.querySelector('.photo-add').disabled=busy;
  document.getElementById('photo-grid').innerHTML=assets.length?assets.map(a=>{
   const order=selected.indexOf(a.id);
   return `<button class="photo-tile" data-photo="${a.id}" aria-pressed="${order>=0}" aria-label="${order>=0?'取消选择':'选择'}${esc(a.name)}"><img src="${a.thumb}" alt="${esc(a.name)}"><span class="photo-order">${order>=0?order+1:''}</span></button>`;
  }).join(''):`<div class="photo-empty"><span>${svg('image')}</span><p>选择要打印的图片</p><button class="secondary photo-open-library">打开相册</button></div>`;
  if(preview.classList.contains('active'))renderPreview();
 }
 function toggle(id){
  if(busy)return;
  const index=selected.indexOf(id);
  if(index>=0)selected.splice(index,1);else if(selected.length>=30){toast('warn','一次最多选择 30 张图片');return}else selected.push(id);
  render();
 }
 function open(from='home',choose=true){origin=from;go('photo-picker');render();if(choose)chooseFiles()}
 function chooseFiles(){if(busy)return;input.value='';input.click()}
 function back(){importToken++;busy=false;render();go(origin);if(origin==='pdf')void renderPdfEditor()}
 async function loadImage(url){const image=new Image();image.src=url;try{await image.decode();return image}catch{throw new Error('无法读取这张图片，请使用 JPG、PNG 或 WebP 格式')}}
 async function importFiles(files){
  if(busy||!files.length)return;const token=++importToken;busy=true;render();
  let failed=0,added=0;const status=picker.querySelector('.photo-import-status');
  for(const file of files){
   if(token!==importToken)break;
   if(selected.length>=30){toast('warn','一次最多选择 30 张图片');break}
   const duplicate=assets.find(a=>a.name===file.name&&a.bytes===file.size&&a.modified===file.lastModified);
   if(duplicate){if(!selected.includes(duplicate.id))selected.push(duplicate.id);continue}
   let url=null,thumb=null;
   try{
    if(!file.type.startsWith('image/')||file.size>50*1024*1024)throw new Error('图片格式或大小不支持');
    url=URL.createObjectURL(file);const image=await loadImage(url);
    if(token!==importToken){URL.revokeObjectURL(url);break}
    const width=image.naturalWidth,height=image.naturalHeight;if(!width||!height)throw new Error('图片为空');
    const canvas=document.createElement('canvas'),scale=Math.min(1,320/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));canvas.width=canvas.height=0;if(!blob)throw new Error('图片读取失败');
    thumb=URL.createObjectURL(blob);
    if(token!==importToken){URL.revokeObjectURL(url);URL.revokeObjectURL(thumb);break}
    const asset={id:`photo-asset-${++serial}`,name:file.name,bytes:file.size,modified:file.lastModified,url,thumb,width,height};assets.push(asset);selected.push(asset.id);added++;render();status.textContent=`正在读取 ${added} / ${files.length} 张`;
   }catch{if(url)URL.revokeObjectURL(url);if(thumb)URL.revokeObjectURL(thumb);failed++}
  }
  if(token!==importToken)return;busy=false;status.textContent=failed?`${failed} 张图片无法读取，请选择有效图片（单张不超过 50 MB）`:'';render();
 }
 function showPreview(){if(!selected.length)return;previewId=selected[0];go('photo-preview');renderPreview()}
 function renderPreview(){
  const a=assets.find(a=>a.id===previewId);if(!a){go('photo-picker');return}
  const list=selectedAssets();if(!list.some(a=>a.id===previewId))list.push(a);
  const index=list.findIndex(a=>a.id===previewId),order=selected.indexOf(a.id),button=preview.querySelector('.photo-preview-select');
  preview.querySelector('.photo-preview-stage img').src=a.url;preview.querySelector('.photo-preview-stage img').alt=a.name;
  button.setAttribute('aria-pressed',order>=0);button.setAttribute('aria-label',order>=0?'取消选择当前图片':'选择当前图片');button.textContent=order>=0?order+1:'';
  preview.querySelector('.photo-preview-position').textContent=`${index+1} / ${list.length}`;
  preview.querySelector('.photo-preview-prev').disabled=index===0;preview.querySelector('.photo-preview-next').disabled=index===list.length-1;
  preview.querySelector('.photo-preview-strip').innerHTML=list.map(a=>`<button data-preview-photo="${a.id}" aria-label="预览${esc(a.name)}" aria-pressed="${a.id===previewId}"><img src="${a.thumb}" alt=""></button>`).join('');
  preview.querySelector('[aria-pressed="true"][data-preview-photo]')?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 function changePreview(delta){const list=selectedAssets();if(!list.some(a=>a.id===previewId))list.push(assets.find(a=>a.id===previewId));const index=list.findIndex(a=>a.id===previewId);previewId=list[Math.max(0,Math.min(list.length-1,index+delta))]?.id;renderPreview()}
 function imagePage(asset){return {
  rotate:0,
  getViewport({scale=1,rotation=0}={}){const quarter=rotation%180!==0;return {width:(quarter?asset.height:asset.width)*scale,height:(quarter?asset.width:asset.height)*scale,scale,rotation}},
  render({canvasContext:ctx,viewport,background='#fff'}){return {promise:(async()=>{
   const image=await loadImage(asset.url);ctx.save();try{ctx.fillStyle=background;ctx.fillRect(0,0,viewport.width,viewport.height);ctx.translate(viewport.width/2,viewport.height/2);ctx.rotate(viewport.rotation*Math.PI/180);ctx.drawImage(image,-asset.width*viewport.scale/2,-asset.height*viewport.scale/2,asset.width*viewport.scale,asset.height*viewport.scale)}finally{ctx.restore()}
  })()}}
 }}
 async function confirm(){
  if(busy||pdfProcessing.task?.status==='running'||!selected.length)return;
  const photos=selectedAssets(),id='photo:'+photos.map(a=>a.id).join(','),metadata={id,name:'图片',kind:'image',pages:photos.length};
  if(!documents.has(id))documents.set(id,{metadata,numPages:photos.length,async getPage(n){if(!photos[n-1])throw new Error('图片不存在');return imagePage(photos[n-1])}});
  const task=beginPdfProcessing({kind:'photo-open',title:'正在处理图片',total:photos.length,unit:'张',onCancel:()=>{if(!pdfPreparedDocuments.get(id)?.complete)releasePdfPrepared(id)},retry:confirm});
  await pdfProcessingPaint();if(pdfProcessing.task!==task)return;
  try{
   if(!await preparePdfImages(metadata,task)||pdfProcessing.task!==task)return;
   if(!await finishPdfProcessing(task))return;
   if(!pdfEditSessions.has(id))pdfEditSessions.set(id,{start:1,end:photos.length,size:{width:100,height:150},crops:{},excluded:new Set()});
   pdfEdits=pdfEditSessions.get(id);pdfState.editor=metadata;pdfState.editorFiles=[metadata];pdfState.editorPages=photos.map((_,i)=>({fileId:id,page:i+1}));pdfState.editorPage=1;pdfState.excluded=pdfEdits.excluded;pdfState.returnTo='photo-picker';
   clearPdfImages();pdfJob.status='idle';
   for(const old of documents.keys())if(old!==id){releasePdfPrepared(old);pdfEditSessions.delete(old);documents.delete(old)}
   origin='home';go('pdf');await renderPdfEditor();
  }catch(error){failPdfProcessing(task,error)}
 }
 picker.querySelector('.back').onclick=back;picker.querySelector('.photo-add').onclick=chooseFiles;picker.querySelector('.photo-preview-button').onclick=showPreview;
 picker.addEventListener('click',e=>{const tile=e.target.closest('[data-photo]');if(tile)toggle(tile.dataset.photo);if(e.target.closest('.photo-open-library'))chooseFiles()});
 preview.querySelector('.back').onclick=()=>{go('photo-picker');render()};preview.querySelector('.photo-preview-select').onclick=()=>toggle(previewId);
 preview.querySelector('.photo-preview-prev').onclick=()=>changePreview(-1);preview.querySelector('.photo-preview-next').onclick=()=>changePreview(1);
 preview.querySelector('.photo-preview-strip').onclick=e=>{const button=e.target.closest('[data-preview-photo]');if(button){previewId=button.dataset.previewPhoto;renderPreview()}};
 document.querySelectorAll('.photo-confirm').forEach(b=>b.onclick=confirm);input.onchange=()=>void importFiles([...input.files]);
 let touchX=null;preview.querySelector('.photo-preview-stage').addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true});preview.querySelector('.photo-preview-stage').addEventListener('touchend',e=>{if(touchX!==null&&Math.abs(e.changedTouches[0].clientX-touchX)>45)changePreview(e.changedTouches[0].clientX<touchX?1:-1);touchX=null},{passive:true});
 const previousGo=go;go=function(id,options={}){
  const current=document.querySelector('.screen.active')?.id;
  if(current==='photo-picker'&&id!=='photo-picker'&&busy){importToken++;busy=false}
  previousGo(id,options);if(id==='photo-picker')render();if(id==='photo-preview')renderPreview();
 };
 window.esprintPhoto={open,hasDocument:id=>documents.has(id),getDocument:id=>documents.get(id),metadata:id=>documents.get(id)?.metadata};
 document.querySelector('#home [data-home-action="photo"]').onclick=()=>open();
 for(const [id,title]of [['photo-picker','图片选择'],['photo-preview','图片预览']]){pages.push([id,title]);links.insertAdjacentHTML('beforeend',`<button data-page="${id}" onclick="go('${id}')">${title}</button>`)}
 render();
})();
