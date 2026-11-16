/* UI prototype. Accounts and printer sessions are in-memory demonstrations. */
const iconPaths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 plus:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
 user:'<circle cx="12" cy="8" r="3.3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
 printer:'<rect x="3" y="8" width="18" height="11" rx="3"/><path d="M7 8V3h10v5M7 16h10v6H7zM17 12h1"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 5"/>',
 scan:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M1 12h22M8 8v8m4-8v8m4-8v8"/>',
 file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8m-8 4h5"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 9h18"/>',
 heart:'<path d="M20.4 5.6a5.5 5.5 0 0 0-7.8 0L12 6.2l-.6-.6a5.5 5.5 0 0 0-7.8 7.8L12 22l8.4-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 arrow:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m15 5-7 7 7 7"/>',
 arrowup:'<path d="M12 21V3m-6 6 6-6 6 6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
 lock:'<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
 key:'<circle cx="7" cy="9" r="4"/><path d="m10 12 9 9m-3-6 3-3m-6 0 3-3"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 bluetooth:'<path d="M12 2v20l7-5-14-10m0 10L19 7l-7-5"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M20 12a8 8 0 0 0-14-5m-2 5a8 8 0 0 0 14 5"/>',
 warning:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
 settings:'<path d="m12 3 3 2 3 .3 1 3 2 3-2 3-1 3-3 .7-3 2-3-2-3-.7-1-3-2-3 2-3 1-3L9 5z"/><circle cx="12" cy="11.5" r="3.2"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
 logout:'<path d="M9 4H4v16h5m6-12 4 4-4 4m-7-4h11"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'
};
iconPaths.search='<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>';
iconPaths.more='<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>';
function svg(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.info}</svg>`}
function icons(){document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon)});document.querySelectorAll('.back').forEach(el=>{el.innerHTML=svg('back');el.setAttribute('aria-label','返回')})}
const phoneEl=document.getElementById('phone');
const authState={loggedIn:false};
let deviceName='ESPrint P40',isConnected=false,actionToken=0,returnPage='home',authReturn='mine';
let confirmAction=null;
const templates=[
 ['快递标签','100 × 150 mm','parcel'],['商品价格','40 × 20 mm','price'],['仓储货架','60 × 40 mm','archive'],['文件归档','30 × 60 mm','archive'],
 ['手作标记','40 × 30 mm','price'],['商品条码','50 × 30 mm','parcel'],['厨房收纳','40 × 20 mm','archive'],['包裹信息','100 × 150 mm','parcel'],
 ['日期标签','30 × 15 mm','archive'],['服饰吊牌','40 × 60 mm','price'],['资产编号','50 × 30 mm','parcel'],['咖啡豆','50 × 70 mm','price'],
 ['置物分类','60 × 30 mm','archive'],['收件信息','100 × 150 mm','parcel'],['花束标签','30 × 40 mm','price'],['货品批次','50 × 30 mm','parcel'],
 ['资料盒','40 × 80 mm','archive'],['礼物心意','40 × 30 mm','price'],['物料编码','60 × 40 mm','parcel'],['备忘标签','40 × 20 mm','archive']
];
function readPrototypeValue(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function savePrototypeValue(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
const storedTemplateFavorites=readPrototypeValue('esprint.prototype.favorites.v20',[]);
const templateFavorites=new Set(Array.isArray(storedTemplateFavorites)?storedTemplateFavorites.filter(key=>typeof key==='string'):[]);
function templateText(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function favoriteButton(key,name){
 const selected=templateFavorites.has(key);
 return `<button class="template-favorite" data-favorite-key="${templateText(key)}" data-favorite-name="${templateText(name)}" aria-pressed="${selected}" aria-label="${selected?'取消收藏':'收藏'}${templateText(name)}" onclick="toggleTemplateFavorite(event,this.dataset.favoriteKey)">${svg('heart')}</button>`;
}
function labelMarkup(type){return `<div class="sample-label ${type}"><b>${type==='price'?'EVERYDAY GOODS':type==='archive'?'STUDIO / 01':'EXPRESS LABEL'}</b><span class="tiny-address">${type==='archive'?'MATERIALS & IDEAS<br>收纳生活的小细节':type==='price'?'精选好物 · 让日常多一点心意':'TO: ESPrint Studio<br>Document & Package'}</span>${type==='price'?'<strong>¥ 29.00</strong>':''}<div class="sample-barcode"></div><small>ES 2026 1101 0806</small></div>`}
function templateMarkup(t,i){return `<div class="template-shell"><button class="template card" data-catalog-id="${i}" onclick="openCatalogTemplate(${i},'home')" aria-label="打开${t[0]}"><div class="thumb">${labelMarkup(t[2])}</div><b>${t[0]}</b><small>${t[1]}</small></button>${favoriteButton('catalog:'+i,t[0])}</div>`}
document.querySelector('#home .content').innerHTML=`
 <header class="home-top"><button class="device-pill" type="button" onclick="openDevice('home')"><span class="device-dot"></span><span id="deviceStatus">未连接</span>${svg('arrow')}</button></header>
 <div class="home-opening">
  <div class="home-ambient" aria-hidden="true"><svg viewBox="0 0 240 120" preserveAspectRatio="none" fill="none"><defs>
   <linearGradient id="home-aurora-color" x1="56" y1="128" x2="171" y2="-12" gradientUnits="userSpaceOnUse"><stop class="home-aurora-color-1" stop-color="#b6cfe9" stop-opacity=".1"/><stop class="home-aurora-color-2" offset=".48" stop-color="#b6dcd4" stop-opacity=".85"/><stop class="home-aurora-color-3" offset="1" stop-color="#d2c4e9" stop-opacity=".15"/></linearGradient>
   <filter id="home-aurora-glow" x="-70%" y="-30%" width="240%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="7"/></filter>
   <filter id="home-aurora-haze" x="-70%" y="-30%" width="240%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <g class="home-aurora-flow" stroke="url(#home-aurora-color)" stroke-linecap="round"><path d="M73 147C113 110 53 88 91 53S100 7 115-28" stroke-width="22" opacity=".38" filter="url(#home-aurora-glow)"/><path d="M136 149C100 109 163 86 137 50S149 9 166-28" stroke-width="30" opacity=".28" filter="url(#home-aurora-haze)"/></g>
  <g class="home-aurora-flow home-aurora-flow-back" stroke="url(#home-aurora-color)" stroke-linecap="round"><path d="M180 148C151 105 206 77 179 43S198-3 189-30" stroke-width="25" opacity=".32" filter="url(#home-aurora-glow)"/><path d="M111 146C147 107 101 77 126 43S124 2 143-29" stroke-width="38" opacity=".2" filter="url(#home-aurora-haze)"/></g>
  </svg></div>
 <section class="home-banner" aria-label="首页推荐"></section>
 <section class="home-workbench" aria-label="快捷打印">
  <div class="section-head"><h2>快捷打印</h2></div>
  <div class="quick-grid">
   <button class="quick home-print-card home-photo-card" type="button" data-home-action="photo" onclick="esprintPhoto.open()"><span class="ico" aria-hidden="true"><img src="assets/home/print-photo.svg" alt="" width="56" height="45"></span><span class="home-print-copy"><b>图片打印</b></span></button>
   <button class="quick home-print-card home-pdf-card" type="button" data-home-action="pdf" onclick="go('pdf-list')"><span class="ico" aria-hidden="true"><img src="assets/home/print-pdf.svg" alt="" width="40" height="45"></span><span class="home-print-copy"><b>PDF 打印</b></span></button>
  </div>
  <nav class="home-library-shortcuts" aria-label="我的模板与收藏"><button class="home-library-link" type="button" data-home-action="templates" onclick="go('templates')"><img class="home-library-art" src="assets/home/my-templates.svg" alt="" aria-hidden="true" width="40" height="40" draggable="false"><span>我的模板</span></button><button class="home-library-link" type="button" data-home-action="favorites" onclick="go('favorites')"><img class="home-library-art" src="assets/home/my-favorites.svg" alt="" aria-hidden="true" width="40" height="40" draggable="false"><span>我的收藏</span></button></nav>
 </section>
 </div>
 <div class="section-head"><h2>推荐模板</h2><button class="link home-more" onclick="go('all-templates')">更多模板 ${svg('arrow')}</button></div>
 <div class="template-row">${templates.map(templateMarkup).join('')}</div>`;

function topbar(title,back='home'){return `<div class="topbar"><button class="back" onclick="go('${back}')">${svg('back')}</button><h1>${title}</h1><span class="spacer"></span></div>`}
function field(id,placeholder,type='text',icon='mail',autocomplete='off'){return `<label class="auth-field">${svg(icon)}<input id="${id}" name="${id}" type="${type}" placeholder="${placeholder}" aria-label="${placeholder}" autocomplete="${autocomplete}">${type==='password'?`<button class="eye" type="button" onclick="togglePassword('${id}')" aria-label="显示或隐藏密码">${svg('eye')}</button>`:''}</label>`}
function authPage(kind){
 const login=kind==='login',register=kind==='register';
 return `<div id="${kind}" class="screen">${topbar(login?'邮箱登录':register?'邮箱注册':'忘记密码',login?'mine':'login')}<div class="auth-content"><form onsubmit="submitAuth(event,'${kind}')" novalidate>${field(kind+'-email','邮箱地址','email','mail','email')}${!login?`<div class="code-row">${field(kind+'-code','验证码','text','key','one-time-code')}<button class="code-send" type="button" onclick="sendCode('${kind}',this)">发送验证码</button></div>`:''}${field(kind+'-password',login?'密码':register?'设置密码':'新密码','password','lock',login?'current-password':'new-password')}${login?'<div class="auth-password-tools"><button type="button" onclick="go(\'forgot\')">忘记密码？</button></div>':''}${login||register?`<label class="auth-agreement"><input id="${kind}-agree" type="checkbox"><span>我已阅读并同意 <a href="#" onclick="event.preventDefault();viewLegal('用户协议')">《用户协议》</a>和<a href="#" onclick="event.preventDefault();viewLegal('隐私政策')">《隐私政策》</a></span></label>`:''}<p class="auth-message" id="${kind}-error" role="alert"></p><button class="primary full auth-submit" type="submit">${login?'登录':register?'注册':'确认重设'}</button></form><div class="auth-bottom">${login?'还没有账号？ <button onclick="go(\'register\')">立即注册</button>':'已有账号？ <button onclick="go(\'login\')">返回登录</button>'}</div></div></div>`;
}
phoneEl.insertAdjacentHTML('beforeend',authPage('login')+authPage('register')+authPage('forgot')+`
 <div id="device-connecting" class="screen">${topbar('连接打印机','device')}<div class="content connection-page"><div class="connection-orb"><div class="scanning-spinner"></div></div><h2 class="center-title">正在连接</h2><p class="center-copy" id="connecting-name">正在与 ESPrint P40 建立连接<br>请保持打印机开启，并靠近手机。</p><button class="secondary full" onclick="cancelConnect()">取消连接</button><div class="footer-demo">原型将演示连接过程与结果</div></div></div>
 <div id="device-timeout" class="screen timeout-state">${topbar('扫描设备','device')}<div class="content connection-page"><div class="connection-orb"><div class="connection-check">${svg('scan')}</div></div><h2 class="center-title">还没有找到设备</h2><p class="center-copy">请确认打印机已经开机、蓝牙权限已开启，<br>并将手机靠近打印机后再试。</p><button class="primary full" onclick="scanAgain()">重新扫描</button><button class="secondary full" style="margin-top:10px" onclick="go('device')">返回设备列表</button></div></div>
 <div id="device-failed" class="screen error-state">${topbar('连接打印机','device')}<div class="content connection-page"><div class="connection-orb"><div class="connection-check">${svg('close')}</div></div><h2 class="center-title">暂时无法连接</h2><p class="center-copy">请检查打印机是否被其他设备占用，<br>或将打印机关机重启后再次尝试。</p><button class="primary full" onclick="connectPrinter(deviceName)">重新连接</button><button class="secondary full" style="margin-top:10px" onclick="go('device')">选择其他设备</button></div></div>
 <div id="favorites" class="screen">${topbar('我的收藏')}<div class="content"><div class="template-row">${templates.slice(0,4).map(templateMarkup).join('')}</div></div></div>
`);
// Device views use the same line icons as the rest of the interface.
document.querySelector('.scan-visual').innerHTML=`<div class="scan-rings"><i class="scan-pulse-ring"></i><i></i><i>${svg('printer')}</i></div>`;
document.querySelector('.detail-visual').innerHTML=svg('printer');
document.querySelector('.connection-check').innerHTML=svg('check');
document.querySelectorAll('.device-summary-icon').forEach(el=>el.innerHTML=svg('printer'));
document.querySelectorAll('#device .list-card').forEach((el,i)=>{const name=i?'ESPrint Mini':'ESPrint P40';el.setAttribute('onclick',`connectPrinter('${name}')`);el.setAttribute('role','button');el.setAttribute('tabindex','0');el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();connectPrinter(name)}};el.firstElementChild.className='device-thumbnail';el.firstElementChild.innerHTML=svg('printer')});
document.querySelectorAll('#device .top-action,#device .section-head .link').forEach(el=>{el.setAttribute('onclick','scanAgain()');el.innerHTML=svg('refresh');el.setAttribute('aria-label','重新扫描')});
document.querySelector('#device .card b').className='device-help';document.querySelector('#device .card p').className='device-help-text';
document.querySelector('#device .content').insertAdjacentHTML('beforeend',`<div class="scan-options"><button onclick="go('device-timeout')">${svg('scan')}查看未找到设备</button><button onclick="go('device-failed')">${svg('info')}查看连接失败</button></div>`);
document.querySelectorAll('.connected-badge').forEach(el=>el.textContent='已连接');
document.querySelectorAll('#device-detail .detail-row')[4].lastElementChild.textContent='暂不可获取';
document.querySelectorAll('#device-detail .detail-row')[5].remove();
document.querySelector('#device-detail .danger-button').onclick=()=>confirm('断开打印机连接？','断开后需要重新连接才能继续打印。',()=>{isConnected=false;updateDevice();go('device');toast('warn','打印机已断开')});
document.querySelector('#device-detail .secondary').onclick=()=>{if(!isConnected){toast('warn','请先连接打印机');return}showModal('loading','正在发送自检指令…','设备操作为原型演示');const token=++actionToken;setTimeout(()=>{if(token!==actionToken)return;showModal('success','自检指令已发送','演示结果，请在实际设备上确认输出。')},800)};

// Replace the account placeholder with direct routes to the account pages.
document.querySelector('#mine .mine-header').innerHTML=`<div class="avatar">${svg('user')}</div><div><b id="accountName">登录 ESPrint</b><div class="muted" id="accountHint">保存你的模板与灵感</div></div><button class="link" onclick="startLogin('mine')">登录 ${svg('arrow')}</button>`;
document.querySelector('#mine .topbar .top-action:last-child').innerHTML=svg('settings');
document.querySelector('#mine .topbar .top-action:last-child').onclick=()=>startLogin('mine');
document.querySelector('#mine .mine-header').onclick=()=>{if(!authState.loggedIn)startLogin('mine')};
const mineButtons=document.querySelectorAll('#mine .mine-list button');
['clock','globe','grid','info','mail','download','printer'].forEach((name,i)=>{const span=mineButtons[i].firstElementChild;span.innerHTML=svg(name)+'　'+span.textContent.trim().slice(1).trim()});
mineButtons[3].onclick=()=>showModal('success','连接与打印帮助','开启打印机并靠近手机，在首页点击设备入口重新扫描。');
mineButtons[4].onclick=()=>showModal('success','联系我们','ESPrint 官方客服邮箱及联系方式待提供。');
mineButtons[5].onclick=()=>showModal('success','当前为原型预览','正式版本与更新地址将在发布前配置。');
mineButtons[6].onclick=()=>showModal('success','ESPrint','标签创作与热敏打印\nLiquid Glass · V1.0.0');
mineButtons[1].onclick=()=>showModal('success','切换语言','中文、英语、西班牙语、葡萄牙语、日语、法语、德语。');
mineButtons[2].onclick=()=>confirm('切换为 inch？','1 inch = 25.4 mm，实际纸张尺寸不会改变。',()=>{mineButtons[2].lastElementChild.textContent='inch　›';toast('success','单位已切换为 inch')});

// Put the paper preview after the form, and keep the label physically 2:1.
const newContent=document.querySelector('#new .content'),newPreview=document.querySelector('#new .new-preview');
newPreview.innerHTML='<div class="new-label"></div>';
const createButton=newContent.querySelector(':scope > .primary');createButton.textContent='创建';newContent.insertBefore(newPreview,createButton);
document.querySelector('#new .form-card:nth-of-type(2) .section-head').innerHTML='<h2>标签设置</h2>';
document.querySelector('#new .new-preview').setAttribute('aria-label','标签纸张预览，不显示标尺');
document.querySelector('#preview .print-setting .row:first-child').onclick=()=>openDevice('preview');
document.querySelector('#preview .print-setting .row:first-child').style.cursor='pointer';
document.querySelector('#editor .bottom-actions .secondary').onclick=()=>authState.loggedIn?saveDemo():startLogin('editor');

pages.splice(0,pages.length,...[
 ['home','首页'],['mine','我的'],['new','新建标签'],['editor','标签编辑器'],['pdf','PDF 编辑'],['preview','打印预览'],['templates','我的模板'],['favorites','我的收藏'],
 ['login','邮箱登录'],['register','邮箱注册'],['forgot','忘记密码'],['device','设备扫描'],['device-connecting','正在连接'],['device-connect','连接成功'],['device-detail','设备详情'],['device-timeout','扫描无结果'],['device-failed','连接失败'],['feedback','统一反馈组件']
]);
links.innerHTML=pages.map(([id,name])=>`<button data-page="${id}" onclick="go('${id}')">${name}</button>`).join('');
document.querySelector('.side h2').textContent='ESPrint · V1.0.0';
document.querySelector('.side>p').textContent='普通三项底栏、错落的快捷入口与两列瀑布流。点击下方页面名，或直接操作手机内的入口体验完整路径。';
links.insertAdjacentHTML('afterend','<p>交互原型：邮箱、验证码、设备与打印均为演示数据，不连接真实账号或硬件。</p>');

go=function(id,options={}){
 const target=document.getElementById(id);if(!target||!target.classList.contains('screen'))return;
 const current=document.querySelector('.screen.active');
 if(current&&current.id==='device-connecting'&&id!=='device-connect')actionToken++;
 closeModal();document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active','with-tabs','no-tabs'));
 target.classList.add('active',['home','mine'].includes(id)?'with-tabs':'no-tabs');target.scrollTop=0;
 document.querySelector('.bottom-nav').classList.toggle('is-hidden',!['home','mine'].includes(id));
 document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.go===id));
 document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
 if(location.hash!=='#'+id)history.pushState({page:id},'',location.pathname+'#'+id);
 document.getElementById('urlText').textContent=location.origin+location.pathname;
};
window.addEventListener('popstate',()=>go(location.hash.slice(1)||'home'));
showModal=function(kind,t,body){
 confirmAction=null;modal.classList.add('show');title.textContent=t;textEl.textContent=body;icon.className='modal-icon '+kind;
 icon.innerHTML=kind==='loading'?'<div class="spinner"></div>':svg(kind==='success'?'check':kind==='fail'?'close':'warning');
 actions.innerHTML=kind==='loading'?'<button class="secondary" onclick="closeModal()">取消</button>':kind==='confirm'?'<button class="secondary" onclick="closeModal()">取消</button><button class="primary" id="modalConfirm" onclick="runConfirm()">确定</button>':'<button class="primary full" onclick="closeModal()">完成</button>';
};
closeModal=function(){modal.classList.remove('show');actionToken++;confirmAction=null};
function confirm(t,body,fn){showModal('confirm',t,body);confirmAction=fn}
function runConfirm(){const fn=confirmAction;closeModal();if(fn)fn()}
toast=function(kind,msg){
 phoneEl.querySelectorAll('.toast').forEach(el=>el.remove());
 const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=(kind==='success'?'✓　':kind==='fail'?'×　':'!　')+msg;
 el.style.cssText=`position:absolute;left:50%;bottom:102px;transform:translateX(-50%);background:linear-gradient(135deg,#fffffff0,#f1f4fce3);color:${kind==='success'?'#68927e':kind==='fail'?'#ba7585':'#aa9064'};border:1px solid white;padding:11px 17px;border-radius:18px;box-shadow:0 7px 22px #68749d26;z-index:46;width:max-content`;
 phoneEl.appendChild(el);setTimeout(()=>el.remove(),2600);
};
connectPrinter=function(name='ESPrint P40'){
 deviceName=name;go('device-connecting');document.getElementById('connecting-name').textContent=`正在与 ${name} 建立连接\n请保持打印机开启，并靠近手机。`;
 const token=++actionToken;setTimeout(()=>{if(token!==actionToken)return;isConnected=true;updateDevice();go('device-connect')},1400);
};
function cancelConnect(){actionToken++;go('device')}
function openDevice(from){returnPage=from;go(isConnected?'device-detail':'device')}
function updateDevice(){
 document.getElementById('deviceStatus').textContent=isConnected?deviceName:'未连接';document.querySelector('.device-dot').classList.toggle('online',isConnected);
 document.getElementById('previewPrinter').textContent=isConnected?deviceName+' · 已连接 ›':'未连接 ›';
 document.getElementById('printBtn').disabled=!isConnected;document.getElementById('printBtn').textContent=isConnected?'立即打印':'连接打印机后打印';
 document.querySelector('#device-connect .center-copy').textContent=`${deviceName} 已准备好，可以开始打印。`;
 document.querySelector('#device-connect .device-summary b').textContent=deviceName;
 document.querySelector('#device-detail .detail-name h2').textContent=deviceName;
 document.querySelectorAll('#device-detail .detail-row')[0].lastElementChild.textContent=deviceName;
 document.querySelectorAll('#device-detail .detail-row')[1].lastElementChild.textContent=deviceName;
 document.querySelectorAll('#device-detail .detail-row')[2].lastElementChild.textContent=isConnected?'已连接':'未连接';
 document.querySelector('#device-detail .connected-badge').textContent=isConnected?'已连接':'演示设备';
}
document.querySelector('#device-connect .secondary').onclick=()=>go(returnPage);
document.querySelector('#device-connect .secondary').textContent='完成并返回';
function scanAgain(){go('device');document.querySelector('.scan-status').innerHTML='<span class="scan-dot"></span>正在搜索附近的蓝牙打印机';toast('success','已重新开始扫描')}
function togglePassword(id){const input=document.getElementById(id);input.type=input.type==='password'?'text':'password'}
function startLogin(from){authReturn=from;go('login')}
function viewLegal(name){showModal('success',name,'正式协议内容将在发布前提供。此处仅演示协议查看入口。')}
function sendCode(kind,button){
 const email=document.getElementById(kind+'-email').value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){document.getElementById(kind+'-error').textContent='请先输入有效的邮箱地址';return}
 document.getElementById(kind+'-error').textContent='';button.disabled=true;let left=30;button.textContent=left+'s 后重发';
 toast('success','演示验证码：123456（未发送邮件）');
 const timer=setInterval(()=>{left--;button.textContent=left+'s 后重发';if(left<=0){clearInterval(timer);button.disabled=false;button.textContent='发送验证码'}},1000);
}
function submitAuth(event,kind){
 event.preventDefault();const email=document.getElementById(kind+'-email').value.trim(),password=document.getElementById(kind+'-password').value,error=document.getElementById(kind+'-error');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){error.textContent='请输入有效的邮箱地址';return}
 if(!password){error.textContent='请输入密码';return}
 if(kind!=='login'&&document.getElementById(kind+'-code').value.trim()!=='123456'){error.textContent='请输入演示验证码 123456';return}
 if(kind!=='forgot'&&!document.getElementById(kind+'-agree').checked){error.textContent='请阅读并同意用户协议与隐私政策';return}
 error.textContent='';showModal('loading',kind==='forgot'?'正在重设密码…':kind==='register'?'正在创建账号…':'正在登录…','原型演示，不会提交账号或密码');
 const token=++actionToken;setTimeout(()=>{if(token!==actionToken)return;closeModal();
  if(kind==='forgot'){go('login');toast('success','密码重设演示完成，请重新登录');return}
  if(kind==='register'){go('login');toast('success','注册演示完成，请登录');return}
  authState.loggedIn=true;syncAccountViews();go(authReturn);toast('success','登录演示成功');
 },900);
}
function saveDemo(){showModal('loading','正在保存模板…','当前为原型演示');const token=++actionToken;setTimeout(()=>{if(token===actionToken)showModal('success','模板保存成功','演示结果，未上传至服务器。')},800)}
printNow=function(){if(!isConnected){toast('warn','请先连接打印机');return}showModal('loading','正在发送打印数据…','原型演示，不会发送到真实打印机');const token=++actionToken;setTimeout(()=>{if(token===actionToken)showModal('success','发送流程演示完成','实际设备仍需返回真实打印状态。')},1100)};
document.querySelectorAll('#templates .template-large').forEach((el,i)=>{el.querySelector('.thumb').innerHTML=labelMarkup(templates[i][2])});
document.querySelectorAll('.template-row').forEach(container=>{
 const items=[...container.children];const columns=[document.createElement('div'),document.createElement('div')];
 columns.forEach(column=>column.className='masonry-column');
 items.forEach((item,index)=>{item.style.setProperty('--preview-height',[163,118,139,184,124,151][index%6]+'px');columns[index%2].appendChild(item)});
 container.replaceChildren(...columns);
});
document.querySelectorAll('.primary,.secondary').forEach(el=>{if(el.textContent==='保存')el.innerHTML=svg('folder')+'　保存'});
icons();updateDevice();go(location.hash.slice(1)||'home');
