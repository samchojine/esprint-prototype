/* Camera and album recognition. No simulated camera or sample scan results. */
(() => {
 iconPaths.flash='<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>';
 phoneEl.insertAdjacentHTML('beforeend',`<section id="scan-print" class="screen"><header class="topbar"><button class="back" aria-label="关闭扫一扫">${svg('close')}</button><h1>扫一扫</h1><span class="spacer"></span></header><div class="scan-camera-stage"><video autoplay muted playsinline aria-label="扫描取景画面"></video><div class="scan-camera-scrim"></div><div class="scan-target"><i></i><i></i><i></i><i></i><div class="scan-light"></div></div><div class="scan-camera-message" role="status"><span>${svg('scan')}</span><p>正在打开相机…</p><button class="secondary scan-retry" hidden>重新打开相机</button></div><p class="scan-camera-hint">将二维码/条形码放入框内，即可自动扫描</p></div><footer class="scan-camera-footer"><button class="scan-torch" aria-label="打开手电筒" aria-pressed="false" disabled>${svg('flash')}<span>手电筒</span></button><button class="scan-album" aria-label="从相册识别">${svg('image')}<span>相册</span></button></footer></section><input type="file" id="scan-file-input" accept="image/*" hidden>`);
 const screen=document.getElementById('scan-print'),video=screen.querySelector('video'),message=screen.querySelector('.scan-camera-message'),torchButton=screen.querySelector('.scan-torch'),album=document.getElementById('scan-file-input');
 let origin='home',stream=null,token=0,timer=null,torch=false,accepted=false,decoding=false,detector=null,nativeReady=null;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const active=()=>screen.classList.contains('active');
 function setMessage(text,retry=false){message.hidden=!text;message.querySelector('p').textContent=text;screen.querySelector('.scan-retry').hidden=!retry}
 function releaseStream(){clearTimeout(timer);timer=null;stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;torch=false;torchButton.disabled=true;torchButton.setAttribute('aria-pressed','false');torchButton.setAttribute('aria-label','打开手电筒');screen.classList.remove('has-camera')}
 function stop(){token++;releaseStream();decoding=false}
 async function start(){
  stop();const run=token;accepted=false;setMessage('正在打开相机…');
  if(document.hidden||!active())return;
  if(!navigator.mediaDevices?.getUserMedia){setMessage('当前浏览器无法使用相机，请从相册识别',false);return}
  try{
   const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(run!==token||!active()||document.hidden){acquired.getTracks().forEach(track=>track.stop());return}
   stream=acquired;video.srcObject=stream;await video.play();
   if(run!==token||!active())return;
   screen.classList.add('has-camera');setMessage('');
   torchButton.disabled=!stream.getVideoTracks()[0]?.getCapabilities?.().torch;
   await initializeNative();if(run===token)schedule(run);
  }catch(error){if(run!==token)return;releaseStream();const denied=['NotAllowedError','SecurityError'].includes(error.name);setMessage(denied?'相机权限未开启，可允许访问或从相册识别':'未能打开相机，请检查设备或从相册识别',true)}
 }
 async function initializeNative(){
  if(!nativeReady)nativeReady=(async()=>{try{if('BarcodeDetector'in window){const supported=await BarcodeDetector.getSupportedFormats();if(supported.length)detector=new BarcodeDetector({formats:supported})}}catch{detector=null}})();return nativeReady;
 }
 const barcodeTypes={CODE_128:'Code128',CODE_39:'Code39',CODE_93:'Code93',CODABAR:'CodeBar',EAN_13:'EAN-13',UPC_A:'UPC-A',UPC_E:'UPC-E',ITF:'ITF'};
 const nativeFormats={qr_code:'QR_CODE',data_matrix:'DATA_MATRIX',aztec:'AZTEC',pdf417:'PDF_417',code_128:'CODE_128',code_39:'CODE_39',code_93:'CODE_93',codabar:'CODABAR',ean_13:'EAN_13',upc_a:'UPC_A',upc_e:'UPC_E',itf:'ITF',ean_8:'EAN_8'};
 function drawSource(source){
  const width=source.videoWidth||source.naturalWidth||source.width,height=source.videoHeight||source.naturalHeight||source.height;if(!width||!height)return false;
  const scale=Math.min(1,1200/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);return true;
 }
 async function decode(source,tryHarder=false){
  if(!drawSource(source))return null;
  await initializeNative();
  if(detector){try{const results=await detector.detect(canvas);const found=results.find(r=>r.rawValue);if(found)return {content:found.rawValue,format:nativeFormats[found.format]||'CODE_128'}}catch{/* Fall back to the local decoder. */}}
  if(!window.ZXing)throw new Error('识别组件加载失败，请刷新重试');
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,gray=new Uint8ClampedArray(canvas.width*canvas.height);
  for(let i=0,j=0;i<pixels.length;i+=4,j++)gray[j]=(pixels[i]+2*pixels[i+1]+pixels[i+2])>>2;
  const reader=new ZXing.MultiFormatReader(),hints=new Map();
  if(tryHarder)hints.set(ZXing.DecodeHintType.TRY_HARDER,true);
  try{const result=reader.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.RGBLuminanceSource(gray,canvas.width,canvas.height))),hints);return {content:result.getText(),format:ZXing.BarcodeFormat[result.getBarcodeFormat()]}}catch(error){if(['NotFoundException','ChecksumException','FormatException'].some(name=>error instanceof ZXing[name]))return null;throw error}finally{reader.reset()}
 }
 function schedule(run){if(run!==token||!active()||accepted||!stream)return;timer=setTimeout(()=>void tick(run),360)}
 async function tick(run){
  if(run!==token||!active()||accepted)return;
  if(decoding||video.readyState<2){schedule(run);return}
  decoding=true;
  try{const result=await decode(video);if(run===token&&result)accept(result,run)}catch(error){if(run===token){setMessage(error.message,true);releaseStream()}}finally{if(run===token){decoding=false;schedule(run)}}
 }
 function accept(result,run){
  if(run!==token||accepted||!active()||!result.content)return;
  const qr=['QR_CODE','DATA_MATRIX','AZTEC','PDF_417'].includes(result.format),encoding=qr?(result.format==='PDF_417'?'PDF417':result.format):(barcodeTypes[result.format]||'Code128');
  // Validate before changing either the route or the user's current label.
  const probe={kind:qr?'qr':'barcode',content:result.content,encoding,codeStyle:'below',codeFont:4};
  try{esprintElementRenderer.code(probe)}catch{releaseStream();setMessage('当前编码暂不支持打印，请重新扫描',true);toast('warn','已识别，但当前编码暂不支持打印');return}
  accepted=true;stop();go('editor');
  const editor=esprintEditor;
  if(origin!=='editor'){
   editor.clearSelection();document.querySelector('#editor .editor-label-name').textContent='未命名标签';editor.state.items=[];editor.state.undo=[];editor.state.redo=[];editor.state.selected=null;labelShape='rectangle';newPhysicalSize.splice(0,2,30,50);syncNewLabel();editor.applyDimensions(30,50);editor.render();
  }
  esprintElements.addScannedCode(probe.kind,result.content,encoding);toast('success','识别成功');
 }
 function open(from='home'){origin=from;go('scan-print')}
 async function scanFile(file){
  if(!file||!active())return;stop();const run=token;accepted=false;setMessage('正在识别图片…');
  const url=URL.createObjectURL(file);
  try{
   const image=new Image();image.src=url;await image.decode();if(run!==token||!active())return;
   const result=await decode(image,true);if(run!==token||!active())return;
   if(result){accept(result,run);if(active())setMessage('当前编码暂不支持打印，请重新扫描',true)}
   else{setMessage('未发现二维码或条形码，请换一张清晰图片',true);toast('warn','未识别到二维码或条形码')}
  }catch{if(run===token)setMessage('图片无法识别，请重新选择',true)}finally{URL.revokeObjectURL(url)}
 }
 screen.querySelector('.back').onclick=()=>go(origin);screen.querySelector('.scan-retry').onclick=()=>void start();
 screen.querySelector('.scan-album').onclick=()=>{album.value='';album.click()};album.onchange=()=>void scanFile(album.files[0]);
 torchButton.onclick=async()=>{
  const run=token,track=stream?.getVideoTracks()[0];if(!track||torchButton.disabled)return;
  const next=!torch;try{await track.applyConstraints({advanced:[{torch:next}]});if(run!==token)return;torch=next;torchButton.setAttribute('aria-pressed',torch);torchButton.setAttribute('aria-label',torch?'关闭手电筒':'打开手电筒')}catch{if(run===token)toast('warn','当前设备无法控制手电筒')}
 };
 const previousGo=go;go=function(id,options={}){const wasActive=active();if(wasActive&&id!=='scan-print')stop();previousGo(id,options);if(id==='scan-print'&&!wasActive)void start()};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(active())void start()});window.addEventListener('pagehide',stop);
 window.esprintScan={open};
 const homeScan=document.querySelector('#home [data-home-action="scan"]');if(homeScan)homeScan.onclick=()=>open();
 if(['photo-picker','photo-preview','scan-print'].includes(location.hash.slice(1)))go(location.hash.slice(1));
 pages.push(['scan-print','扫一扫']);links.insertAdjacentHTML('beforeend',`<button data-page="scan-print" onclick="esprintScan.open()">扫一扫</button>`);
})();
