/* Device discovery and connection stay above the page that opened them.
   Bluetooth, hardware status and self-test remain prototype demonstrations. */
const devicePanelRoutes=new Set(['device','device-detail','device-timeout','device-failed']);
const deviceUi={open:false,panel:'device',origin:'home',originUrl:'',focus:null,connectionTimer:null,successTimer:null,connectionPhase:'idle',connecting:false,printerStatus:'正常',inertNodes:[],closeTimer:null};
const discoveredPrinters=[{name:'ESPrint P40',mac:'b4:c7:b9:e7:40:01'},{name:'ESPrint Mini',mac:'b4:c7:b9:e7:40:02'}];
iconPaths.deviceP40='<path d="M7 8V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V8M5 8h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2M7 19H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M7 15h10v6H7zm2 3h6m2-7h1"/>';
iconPaths.deviceMini='<rect x="5" y="3" width="14" height="18" rx="5"/><path d="M8 7h8m-9 7h10M8 14v5h8v-5m-6 3h4M15 10h1"/>';
function printerModelIcon(name){return svg(name==='ESPrint P40'?'deviceP40':name==='ESPrint Mini'?'deviceMini':'printer')}
document.querySelector('.device-pill .device-dot').outerHTML='<span class="home-device-icon" aria-hidden="true" hidden></span>';
const deviceBaseGo=go;
const initialDeviceRoute=location.hash.slice(1);
const deviceInitiallyActive=devicePanelRoutes.has(document.querySelector('.screen.active')?.id)||['device-connecting','device-connect'].includes(document.querySelector('.screen.active')?.id);
const deviceHeader=title=>`<header class="topbar device-sheet-header"><button class="back device-close" aria-label="关闭设备面板" onclick="closeDeviceSheet()">${svg('close')}</button><h1>${title}</h1><span class="spacer"></span></header>`;
for(const id of [...devicePanelRoutes,'device-connecting','device-connect'])document.getElementById(id)?.remove();
phoneEl.insertAdjacentHTML('beforeend',`<div class="device-layer" id="device-layer" hidden><section class="device-sheet" role="dialog" aria-modal="true" aria-labelledby="device-panel-title" tabindex="-1">
 <section class="device-panel" id="device" hidden>${deviceHeader('扫描设备')}<div class="device-sheet-content device-scan-content">
  <div class="scan-visual" aria-hidden="true"><div class="device-radar"><i class="radar-wave"></i><i class="radar-wave"></i><i class="radar-wave"></i><span class="radar-core">${svg('printer')}</span></div></div>
  <div class="scan-status" role="status">正在搜索</div>
  <div class="section-head"><h2>附近设备</h2><button class="link device-refresh" aria-label="重新扫描" onclick="scanAgain()">${svg('refresh')}</button></div>
  ${discoveredPrinters.map(({name,mac})=>`<div class="list-card device-option"><span class="device-thumbnail">${printerModelIcon(name)}</span><span class="device-option-copy"><b class="printer-name">${name}</b><small>mac: ${mac}</small></span><button class="device-connect-button" aria-label="连接 ${name}" onclick="connectPrinter('${name}')">连接</button></div>`).join('')}
 </div></section>
 <section class="device-panel" id="device-detail" hidden>${deviceHeader('设备')}<div class="device-sheet-content"><div class="printer-illustration detail-visual">${svg('printer')}</div><h2 class="device-connection-heading" id="device-connection-heading">未连接</h2><div class="detail-card card">
  <div class="detail-row"><span>设备型号</span><b id="device-model">ESPrint P40</b></div>
  <div class="detail-row"><span>蓝牙名称</span><b id="device-bluetooth-name">ESPrint P40</b></div>
  <div class="detail-row"><span>打印机状态</span><b id="printer-device-status" role="status" data-status="正常">正常</b></div>
  <div class="detail-row"><span>SN</span><b>EP40-2026-0318</b></div>
  <div class="detail-row"><span>MAC 地址</span><b id="device-mac-address">暂不可获取</b></div>
 </div><button class="secondary full" onclick="sendDeviceSelfTest()">打印自检页</button><button class="danger-button full" onclick="disconnectDevice()">断开连接</button></div></section>
 <section class="device-panel" id="device-timeout" hidden>${deviceHeader('扫描设备')}<div class="device-sheet-content device-message-content"><div class="device-message-icon">${svg('scan')}</div><h2 class="center-title">还没有找到设备</h2><p class="center-copy">确认打印机已开机，并允许使用蓝牙。</p><button class="primary full" onclick="scanAgain()">重新扫描</button></div></section>
 <section class="device-panel" id="device-failed" hidden>${deviceHeader('连接打印机')}<div class="device-sheet-content device-message-content"><div class="device-message-icon">${svg('warning')}</div><h2 class="center-title">暂时无法连接</h2><p class="center-copy">检查打印机是否被占用后再试。</p><button class="primary full" onclick="connectPrinter(deviceName)">重新连接</button><button class="secondary full" onclick="scanAgain()">选择其他设备</button></div></section>
 <div id="device-connecting" class="device-link-layer" hidden><section class="device-connecting-dialog" data-phase="idle" role="dialog" aria-modal="true" aria-labelledby="device-link-title" aria-describedby="connecting-name" tabindex="-1"><div class="device-link-orb" aria-hidden="true"><span class="device-link-bluetooth">${svg('bluetooth')}</span><i></i><span class="device-link-check">${svg('check')}</span></div><h2 id="device-link-title" role="status" aria-live="polite">正在连接</h2><p id="connecting-name"></p><button class="secondary full" onclick="cancelConnect()">取消连接</button></section></div>
</section></div>`);
const deviceLayer=document.getElementById('device-layer');
const deviceSheet=deviceLayer.querySelector('.device-sheet');
pages.splice(0,pages.length,...pages.filter(([id])=>!['device-connecting','device-connect'].includes(id)).map(([id,name])=>[id,id==='device-detail'?'设备':name]));
links.innerHTML=pages.map(([id,name])=>`<button data-page="${id}" onclick="go('${id}')">${name}</button>`).join('');

function setDevicePanel(id){
 cancelDeviceConnection(false);deviceUi.panel=id;
 for(const panel of deviceLayer.querySelectorAll('.device-panel')){
  const current=panel.id===id;panel.hidden=!current;panel.classList.toggle('is-current',current);panel.inert=!current;
  panel.querySelector('h1').removeAttribute('id');
 }
 const panel=document.getElementById(id);panel.querySelector('h1').id='device-panel-title';panel.scrollTop=0;
 updateDevice();deviceSheet.dataset.panel=id;
 history.replaceState({page:deviceUi.origin,devicePanel:id},'',location.pathname+location.search+'#'+id);
 requestAnimationFrame(()=>panel.querySelector('.device-close')?.focus());
}
function openDevicePanel(id='device'){
 if(!devicePanelRoutes.has(id))id='device';
 if(!deviceUi.open){
  clearTimeout(deviceUi.closeTimer);deviceUi.open=true;deviceLayer.inert=false;
  deviceUi.origin=document.querySelector('.screen.active')?.id||'home';returnPage=deviceUi.origin;
  deviceUi.originUrl=location.pathname+location.search+'#'+deviceUi.origin;deviceUi.focus=document.activeElement;
  closeModal();closePersonalPopover(false);closePersonalDialog(false);closePdfMenu(false);closePdfRename(false);closeCatalogSize();
  deviceUi.inertNodes=[...phoneEl.children].filter(el=>el!==deviceLayer&&!el.contains(modal)&&!el.classList.contains('toast')).map(el=>({el,inert:el.inert}));
  deviceUi.inertNodes.forEach(({el})=>el.inert=true);
  deviceLayer.hidden=false;deviceLayer.classList.remove('is-open');void deviceLayer.offsetHeight;deviceLayer.classList.add('is-open');
  history.pushState({page:deviceUi.origin,devicePanel:id},'',location.pathname+location.search+'#'+id);
 }
 setDevicePanel(id);
}
function cancelDeviceConnection(restoreFocus=true,keepVisual=false){
 clearTimeout(deviceUi.connectionTimer);clearTimeout(deviceUi.successTimer);deviceUi.connectionTimer=null;deviceUi.successTimer=null;deviceUi.connecting=false;deviceUi.connectionPhase='idle';deviceSheet.removeAttribute('data-busy');
 if(!keepVisual)document.getElementById('device-connecting').hidden=true;
 const panel=document.getElementById(deviceUi.panel);if(panel)panel.inert=false;
 if(restoreFocus&&deviceUi.open)requestAnimationFrame(()=>panel?.querySelector('.device-connect-button,.device-close')?.focus());
}
function closeDeviceSheet(restoreFocus=true,restoreUrl=true){
 if(!deviceUi.open)return;
 cancelDeviceConnection(false,true);closeModal();deviceUi.open=false;deviceLayer.classList.remove('is-open');
 deviceUi.inertNodes.forEach(({el,inert})=>el.inert=inert);deviceUi.inertNodes=[];
 deviceLayer.inert=true;
 if(restoreUrl)history.replaceState({page:deviceUi.origin},'',deviceUi.originUrl);
 document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===deviceUi.origin));
 if(restoreFocus&&deviceUi.focus?.isConnected&&!deviceUi.focus.closest('[hidden]'))deviceUi.focus.focus();
 deviceUi.closeTimer=setTimeout(()=>{if(!deviceUi.open){deviceLayer.hidden=true;deviceLayer.inert=false;document.getElementById('device-connecting').hidden=true}},300);
}
go=function(id,options={}){
 if(id==='device-connecting'){openDevicePanel('device');connectPrinter(deviceName);return}
 if(id==='device-connect'){openDevicePanel(isConnected?'device-detail':'device');return}
 if(devicePanelRoutes.has(id)){openDevicePanel(id);return}
 if(deviceUi.open)closeDeviceSheet(false,false);
 deviceBaseGo(id,options);
};
openDevice=function(from){returnPage=from;openDevicePanel(isConnected?'device-detail':'device')};
connectPrinter=function(name='ESPrint P40'){
 if(!deviceUi.open)openDevicePanel('device');
 cancelDeviceConnection(false);deviceUi.connecting=true;deviceUi.connectionPhase='connecting';deviceSheet.dataset.busy='true';
 document.getElementById(deviceUi.panel).inert=true;
 document.getElementById('connecting-name').textContent=name;
 const dialog=document.querySelector('.device-connecting-dialog');dialog.dataset.phase='connecting';
 document.getElementById('device-link-title').textContent='正在连接';dialog.querySelector('button').textContent='取消连接';
 document.getElementById('device-connecting').hidden=false;
 document.querySelector('.device-connecting-dialog').focus();
 deviceUi.connectionTimer=setTimeout(()=>{
  if(!deviceUi.open||!deviceUi.connecting)return;
  deviceName=name;isConnected=true;deviceUi.printerStatus='正常';updateDevice();
  deviceUi.connectionPhase='success';dialog.dataset.phase='success';document.getElementById('device-link-title').textContent='连接成功';dialog.querySelector('button').textContent='完成';
  deviceUi.successTimer=setTimeout(()=>{if(deviceUi.open&&deviceUi.connectionPhase==='success')closeDeviceSheet()},1300);
 },1400);
};
cancelConnect=function(){deviceUi.connectionPhase==='success'?closeDeviceSheet():cancelDeviceConnection()};
scanAgain=function(){
 if(!deviceUi.open)openDevicePanel('device');else setDevicePanel('device');
 const radar=document.querySelector('.device-radar');radar.classList.remove('radar-restart');void radar.offsetHeight;radar.classList.add('radar-restart');
};
updateDevice=function(){
 const status=document.getElementById('deviceStatus');if(status)status.textContent=isConnected?deviceName:'未连接';
 const deviceIcon=document.querySelector('.home-device-icon');deviceIcon.hidden=!isConnected;
 deviceIcon.innerHTML=isConnected?printerModelIcon(deviceName):'';
 if(isConnected)deviceIcon.dataset.model=deviceName;else delete deviceIcon.dataset.model;
 document.querySelector('.device-pill').setAttribute('aria-label',isConnected?deviceName+'，查看设备详情':'未连接，扫描打印机');
 const preview=document.getElementById('previewPrinter');if(preview)preview.textContent=isConnected?deviceName+' · 已连接 ›':'未连接 ›';
 const print=document.getElementById('printBtn');if(print){print.disabled=!isConnected;print.textContent=isConnected?'立即打印':'连接打印机后打印'}
 document.getElementById('device-model').textContent=deviceName;document.getElementById('device-bluetooth-name').textContent=deviceName;
 document.getElementById('device-mac-address').textContent=discoveredPrinters.find(printer=>printer.name===deviceName)?.mac||'暂不可获取';
 document.getElementById('device-connection-heading').textContent=isConnected?'已连接':'未连接';
 document.querySelector('#device-detail .detail-visual').innerHTML=printerModelIcon(deviceName);
 const state=document.getElementById('printer-device-status');state.textContent=deviceUi.printerStatus;state.dataset.status=deviceUi.printerStatus;
};
function setPrinterStatus(status){if(['正常','缺纸','开盖','过热','低电量'].includes(status)){deviceUi.printerStatus=status;updateDevice()}}
function disconnectDevice(){
 confirm('断开打印机连接？','断开后需要重新连接才能继续打印。',()=>{isConnected=false;updateDevice();setDevicePanel('device')});
}
function sendDeviceSelfTest(){
 if(!isConnected){toast('warn','请先连接打印机');return}
 showModal('loading','正在发送自检指令…','设备操作为原型演示');const token=++actionToken;
 setTimeout(()=>{if(token===actionToken&&deviceUi.open)showModal('success','自检指令已发送','演示结果，请在实际设备上确认输出。')},800);
}
deviceLayer.addEventListener('click',event=>{if(event.target===deviceLayer)closeDeviceSheet()});
document.addEventListener('keydown',event=>{
 if(!deviceUi.open||modal.classList.contains('show'))return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();deviceUi.connecting?cancelConnect():closeDeviceSheet();return}
 if(event.key==='Tab'){
  const container=deviceUi.connecting?document.querySelector('.device-connecting-dialog'):document.getElementById(deviceUi.panel);
  const buttons=[...container.querySelectorAll('button:not(:disabled),[tabindex="0"]')],first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!container.contains(document.activeElement)||document.activeElement===container)){event.preventDefault();last?.focus()}
  else if(!event.shiftKey&&(document.activeElement===last||!container.contains(document.activeElement)||document.activeElement===container)){event.preventDefault();first?.focus()}
 }
},true);
if(deviceInitiallyActive){deviceBaseGo('home');openDevicePanel(devicePanelRoutes.has(initialDeviceRoute)?initialDeviceRoute:'device');if(initialDeviceRoute==='device-connecting')connectPrinter(deviceName)}
updateDevice();
