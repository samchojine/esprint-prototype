/* V1.0.0: progressive navigation, iPhone 16 Pro layout, complete My pages.
   All account, device, history and version data remain prototype demonstrations. */
const preferences = { language: 'zh', unit: 'mm', displayName: 'ESPrint 用户' };
// Set the project's official contact details here; empty values still open the app.
const supportContacts = { email: '', whatsapp: '' };
// The personal page starts with the account, without a duplicate page title.
document.querySelector('#mine .topbar').replaceChildren();
document.querySelector('#mine .mine-header').outerHTML=`<button class="mine-header" aria-label="请登录，打开登录页面"><span class="avatar">${svg('user')}</span><span class="account-copy"><b id="accountName">请登录</b><span class="muted" id="accountHint">ID: --</span></span><span class="profile-light" aria-hidden="true"></span></button>`;
const personalGroups = [[0], [1, 2], [3, 4, 5, 6]];
const personalLabels = ['本地打印记录', '切换语言', '切换单位', '帮助中心', '联系我们', '版本更新', '关于 ESPrint'];
const personalIcons = ['clock', 'globe', 'grid', 'info', 'mail', 'download', 'printer'];
const originalMineList=document.querySelector('#mine .mine-list');
personalGroups.forEach((indices,index)=>{
  const group=document.createElement('div');group.className='mine-list mine-group-'+index;
  indices.forEach(i=>{
    const button=mineButtons[i];
    button.firstElementChild.innerHTML=`<span class="mine-row-icon icon-${i}">${svg(personalIcons[i])}</span><span>${personalLabels[i]}</span>`;
    group.appendChild(button);
  });
  originalMineList.before(group);
});
originalMineList.remove();
const labelPresets=[[30,15],[40,20],[60,40],[102,152],[50,50],[75,25],[60,60],[100,100]];
newContent.innerHTML=`
  <div class="form-card label-dimensions">
    <div class="row shape-row"><span>标签形状</span><div class="chips shape-options" role="group" aria-label="标签形状"><button class="chip active" data-shape="rectangle" aria-pressed="true" onclick="chooseShape('rectangle')"><i class="shape-glyph rectangle"></i>矩形</button><button class="chip" data-shape="ellipse" aria-pressed="false" onclick="chooseShape('ellipse')"><i class="shape-glyph ellipse"></i>弧形</button></div></div>
    <label class="row dimension-row" for="label-width"><span>宽度</span><span class="dimension-entry"><input id="label-width" aria-label="宽度" inputmode="decimal" autocomplete="off" value="30"><span class="unit-suffix">mm</span></span></label>
    <label class="row dimension-row" for="label-height"><span>高度</span><span class="dimension-entry"><input id="label-height" aria-label="高度" inputmode="decimal" autocomplete="off" value="15"><span class="unit-suffix">mm</span></span></label>
  </div>
  <div class="preset-heading"><span>常用尺寸</span></div>
  <div class="chips size-options" role="group" aria-label="常用尺寸">${labelPresets.map(([width,height],index)=>`<button class="chip${index===0?' active':''}" data-size="${width},${height}" aria-pressed="${index===0}" onclick="chooseSize(${width},${height})">${width} × ${height}</button>`).join('')}</div>
  <div class="new-preview" role="img" aria-label="标签纸张预览"><div class="light-rail" aria-hidden="true"></div><div class="new-label"><span class="paper-watermark">ESPrint</span></div></div>
  <button class="primary create-label" onclick="createLabel()">创建</button>
`;
const languages = [
  ['zh','简体中文','Chinese'],['en','English','英语'],['es','Español','西班牙语'],
  ['pt','Português','葡萄牙语'],['ja','日本語','日语'],['fr','Français','法语'],['de','Deutsch','德语']
];
let legalReturn = 'about';
let historyTab = 'template', historyEditing = false, historyListAnimation=null;
let pendingLanguage=preferences.language;
const historySelection = new Set();
let demoRecords = [
  ['r1','template','快递标签','今天 10:28','100 × 150 mm','parcel'],
  ['r2','template','商品价格标签','今天 09:46','40 × 20 mm','price'],
  ['r3','template','仓储位置标签','昨天 16:32','60 × 40 mm','archive'],
  ['r4','template','文件归档','昨天 14:09','30 × 60 mm','archive'],
  ['r5','template','手作标记','11 月 09 日 11:24','40 × 30 mm','price'],
  ['r6','template','货品批次','11 月 08 日 15:42','50 × 30 mm','parcel'],
  ['r7','template','厨房收纳','11 月 07 日 09:15','40 × 20 mm','archive'],
  ['r8','pdf','发货标签.pdf','今天 10:06','6 页','file'],
  ['r9','pdf','资料索引.pdf','昨天 17:22','4 页','file'],
  ['r10','pdf','商品清单.pdf','昨天 13:08','8 页','file'],
  ['r11','pdf','包裹标签.pdf','11 月 09 日 10:36','12 页','file']
].map(([id,type,name,time,detail,preview])=>({id,type,name,time,detail,preview}));

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function subpage(id,title,body,back='mine') {
  return `<section id="${id}" class="screen new-subpage">${topbar(title,back)}<div class="sub-content">${body}</div></section>`;
}
function subrow(name,label,value,action) {
  return `<button class="sub-row" onclick="${action}">${svg(name)}<span class="row-copy">${label}</span>${value?`<span class="value">${value}</span>`:''}<span class="chevron">${svg('arrow')}</span></button>`;
}
phoneEl.insertAdjacentHTML('beforeend',
  subpage('history','本地打印记录',`
    <div class="history-tabs" data-active="template" role="tablist" aria-label="记录类型"><span class="history-segment-thumb" aria-hidden="true"></span><button id="history-template-tab" role="tab" aria-controls="history-records" class="active" onclick="switchHistory('template')">模板</button><button id="history-pdf-tab" role="tab" aria-controls="history-records" onclick="switchHistory('pdf')">PDF</button></div>
    <div id="history-records" role="tabpanel" aria-labelledby="history-template-tab"></div>
    <div class="history-actions" id="history-actions"><button class="secondary" onclick="selectAllHistory()">全选</button><button class="danger-solid" id="history-delete" onclick="deleteHistory()">删除记录</button></div>
    <p class="page-bottom-note">仅保留最近 100 条本地打印记录<br>本页为演示记录，不读取真实打印数据</p>
  `)+
  subpage('language','切换语言',`
    <div class="sub-card" role="radiogroup" aria-label="语言">${languages.map(([id,native,desc])=>`<button class="sub-row choice-row" role="radio" aria-checked="${id==='zh'}" data-language="${id}" onclick="chooseLanguage('${id}')"><span class="row-copy"><span class="choice-native">${native}</span><span class="choice-description">${desc}</span></span><span class="choice-check">${svg('check')}</span></button>`).join('')}</div>
    <div class="language-footer"><button class="primary full" onclick="confirmLanguage()">确定</button></div>
  `)+
  subpage('help','帮助中心',`
    <div class="help-categories" aria-label="问题分类"><button class="active" data-help-filter="all" onclick="filterHelp('all')">全部</button><button data-help-filter="device" onclick="filterHelp('device')">设备连接</button><button data-help-filter="print" onclick="filterHelp('print')">打印与内容</button></div>
    <div class="sub-card" id="faq-list"></div>
  `)+
  subpage('contact','联系我们',`
    <a class="sub-card support-channel" role="button" href="mailto:${encodeURIComponent(supportContacts.email)}" onkeydown="if(event.key===' '){event.preventDefault();this.click()}"><span>${escapeText(supportContacts.email||'通过邮箱联系我们')}</span></a>
    <a class="sub-card support-channel" role="button" href="whatsapp://send${supportContacts.whatsapp?'?phone='+encodeURIComponent(supportContacts.whatsapp.replace(/[^0-9]/g,'')):''}" onkeydown="if(event.key===' '){event.preventDefault();this.click()}"><span>${escapeText(supportContacts.whatsapp||'通过 WhatsApp 联系我们')}</span></a>
  `)+
  subpage('updates','版本更新',`
    <div class="version-hero"><div class="version-logo">${svg('printer')}</div><h2>ESPrint</h2><p>Version 1.0.0 · 设计预览版</p></div>
    <div class="version-status" id="update-status">${svg('info')}当前为交互原型</div>
    <div class="sub-card release-notes"><h3>更新内容</h3><p>· 标签创作、PDF 编辑与统一打印预览</p><p>· 模板、收藏与本地打印记录</p><p>· 更轻盈的液态玻璃界面</p></div>
    <p class="subnote">正式应用将查询发布服务，显示真实更新版本与说明。本原型不下载或安装任何软件。</p>
    <button class="primary full" id="check-update" onclick="checkVersion()">更新</button>
    <button class="feedback-help-link" onclick="showUpdateExample()">查看发现新版本时的弹框</button>
  `)+
  subpage('about','关于 ESPrint',`
    <div class="version-hero"><div class="version-logo">${svg('printer')}</div><h2>ESPrint</h2><p>Version 1.0.0 · 设计预览版</p></div>
    <div class="sub-card">
      ${subrow('file','用户协议','','viewLegal(\'用户协议\')')}
      ${subrow('lock','隐私政策','','viewLegal(\'隐私政策\')')}
    </div>
    <p class="page-bottom-note">正式版权主体待提供</p>
  `)+
  subpage('settings','账号设置',`
    <div class="account-profile"><div class="avatar">${svg('user')}</div><h2 id="settings-name">未登录</h2><p id="settings-description">登录后管理个人信息</p></div>
    <div class="sub-card">
      ${subrow('user','个人资料','','openProfile()')}
      ${subrow('key','重设密码','','go(\'forgot\')')}
      ${subrow('file','用户协议','','viewLegal(\'用户协议\')')}
      ${subrow('lock','隐私政策','','viewLegal(\'隐私政策\')')}
    </div>
    <p class="subnote">账号页面为设计建议，资料修改与退出仅在当前原型会话中演示，不会改动真实账号。</p>
    <button class="secondary full" id="settings-session" onclick="accountSessionAction()">登录 ESPrint</button>
  `)+
  subpage('profile','个人资料',`
    <div class="account-profile"><div class="avatar">${svg('user')}</div></div>
    <div class="sub-card"><label class="sub-row"><span class="row-copy">昵称</span><input class="profile-input" id="profile-name" aria-label="昵称" value="ESPrint 用户" maxlength="24"></label><div class="sub-row"><span class="row-copy">用户 ID</span><span class="value">演示账号</span></div><div class="sub-row"><span class="row-copy">邮箱</span><span class="value" id="profile-email">—</span></div></div>
    <p class="profile-edit-hint">昵称修改仅保留在本次原型会话，不上传至服务端。</p>
    <button class="primary full profile-footer" onclick="saveProfile()">保存资料</button>
  `,'settings')+
  subpage('terms','用户协议',`<div class="legal-copy"><div class="legal-notice">当前为协议页面的布局预览。以下为需提供的内容结构提示，不构成正式协议或用户承诺。</div><h3>服务与使用范围</h3><p>正式文本应说明 ESPrint 的服务主体、适用对象、标签编辑、线上模板和设备打印的服务范围。</p><h3>账号与内容</h3><p>正式文本应说明账号使用、模板及素材权利、用户内容责任，以及不可接受的使用方式。</p><h3>设备与打印</h3><p>正式文本应说明支持的设备、打印服务边界及服务中断后的处理方式。</p><h3>变更与联系</h3><p>正式文本应载明生效时间、版本、变更通知方式与联系渠道。</p><p>正式协议需由 ESPrint 运营主体审核提供，发布时使用相应语言的正式版本。</p></div>`,'about')+
  subpage('privacy','隐私政策',`<div class="legal-copy"><div class="legal-notice">当前仅展示隐私政策的阅读页面。以下为内容结构提示，未声明实际采集的数据或处理规则。</div><h3>信息与使用目的</h3><p>正式政策应按真实实现说明账号信息、设备信息、线上模板及必要日志的处理目的。</p><h3>系统权限</h3><p>相册、相机、蓝牙权限应在需要时说明用途。正式政策应与各平台实际权限和使用范围一致。</p><h3>本地和线上数据</h3><p>正式政策应分别说明本地记录、缓存、线上模板的保存位置、保留期限、访问和删除方式。</p><h3>你的选择</h3><p>正式政策应说明查阅、更正、删除、撤回授权、账号注销等适用权利的渠道。</p><h3>联系我们</h3><p>正式政策应提供运营主体、隐私联系渠道、版本与生效日期。上述内容需由项目提供，不能沿用参考产品文本。</p></div>`,'about')
);

const faqItems = [
  ['device','搜索不到打印机怎么办？','确认打印机已开机并靠近手机；检查蓝牙开关和系统授权。返回设备扫描页重新扫描。如果仍无结果，请检查打印机是否被其他手机或 App 占用。'],
  ['device','连接失败后如何重试？','先确认打印机可用并未被占用，必要时重启打印机。在设备扫描列表中重新选择；连接时保持手机与设备靠近。'],
  ['print','打印内容不清晰怎么办？','检查热敏纸安装与打印头状态。清洁前请按设备说明关机。打印设置只使用当前机型支持的选项；可先打印自检页区分设备问题和内容问题。'],
  ['print','打印空白或内容偏移怎么办？','检查纸张正反面和标签尺寸，确认当前输出方向、实际纸张和设备支持宽度一致。先恢复偏移为零，再按真实设备效果调整。'],
  ['print','PDF 可以只打印部分页面吗？','可以在 PDF 编辑中剔除不需要的页面，并在打印预览中设置有效页码范围。裁剪和页码选择应以最终输出预览为准。'],
  ['print','模板与打印记录有什么区别？','模板保存在线上，可继续逐元素编辑；本地打印记录用于再次打开和打印。删除本地记录不等于删除线上模板或原 PDF。'],
  ['print','为什么需要登录保存模板？','线上模板属于账号。登录后可以在线上保存与管理；当前编辑内容在登录返回后继续保留。'],
  ['device','如何查看设备信息和自检？','连接设备后，点击首页右上方设备入口进入设备详情，可查看型号、连接状态及可取得的硬件信息，并使用设备支持的自检功能。']
];
function renderFaq(filter='all') {
  document.querySelectorAll('[data-help-filter]').forEach(el=>el.classList.toggle('active',el.dataset.helpFilter===filter));
  document.getElementById('faq-list').innerHTML=faqItems.map(([type,question,answer],index)=>filter!=='all'&&type!==filter?'':`<article class="faq"><button aria-expanded="false" aria-controls="faq-answer-${index}" onclick="toggleFaq(this)"><span>${question}</span>${svg('arrow')}</button><div class="faq-answer" id="faq-answer-${index}" hidden>${answer}</div></article>`).join('');
}
function toggleFaq(button) {
  const expanded=button.getAttribute('aria-expanded')==='true';
  button.setAttribute('aria-expanded',String(!expanded));
  document.getElementById(button.getAttribute('aria-controls')).hidden=expanded;
  fitScreen(document.getElementById('help'));
}
function filterHelp(filter) { renderFaq(filter); fitScreen(document.getElementById('help')); }
function switchHistory(tab) {
  if(!['template','pdf'].includes(tab))return;
  const previous=historyTab;
  historyTab=tab; historySelection.clear();
  document.querySelector('.history-tabs').dataset.active=tab;
  ['template','pdf'].forEach(type=>{
    const el=document.getElementById('history-'+type+'-tab');
    el.classList.toggle('active',type===tab);el.setAttribute('aria-selected',String(type===tab));
    el.tabIndex=type===tab?0:-1;
  });
  const list=document.getElementById('history-records');
  list.setAttribute('aria-labelledby','history-'+tab+'-tab');
  historyListAnimation?.cancel();
  renderHistory();
  if(previous!==tab&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    historyListAnimation=list.animate([{opacity:.55,transform:`translateX(${tab==='pdf'?16:-16}px)`},{opacity:1,transform:'translateX(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
}
document.querySelector('.history-tabs').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const tab=event.key==='Home'?'template':event.key==='End'?'pdf':historyTab==='template'?'pdf':'template';
  switchHistory(tab);document.getElementById('history-'+tab+'-tab').focus();
});
function renderHistory() {
  const records=demoRecords.filter(record=>record.type===historyTab);
  const list=document.getElementById('history-records');
  list.innerHTML=records.length?records.map(record=>`<button class="history-record" aria-pressed="${historySelection.has(record.id)}" onclick="openRecord('${record.id}')"><span class="history-preview">${record.type==='pdf'?svg('file'):labelMarkup(record.preview)}</span><span class="history-text"><b>${record.name}</b><small>${record.time}<br>${record.detail}</small></span>${historyEditing?`<span class="record-select">${svg('check')}</span>`:`<span class="chevron">${svg('arrow')}</span>`}</button>`).join(''):`<div class="history-empty">${svg('clock')}还没有这类打印记录</div>`;
  document.getElementById('history-actions').classList.toggle('visible',historyEditing&&records.length>0);
  document.getElementById('history-delete').textContent=historySelection.size?`删除 ${historySelection.size} 条记录`:'删除记录';
  document.getElementById('history-delete').disabled=historySelection.size===0;
  fitScreen(document.getElementById('history'));
}
function toggleHistoryEditing() {
  historyEditing=!historyEditing;historySelection.clear();
  document.getElementById('history-edit').textContent=historyEditing?'完成':'编辑';renderHistory();
}
function openRecord(id) {
  const record=demoRecords.find(item=>item.id===id);if(!record)return;
  if(historyEditing){historySelection.has(id)?historySelection.delete(id):historySelection.add(id);renderHistory();return;}
  if(record.type==='pdf'){
    const file=pdfState.files.find(file=>file.name===record.name);
    if(file)openPdfFile(file.id,'history');
    else showModal('fail','文件不可用','文件已不在 PDF 列表中，请重新导入后再打开。');
    return;
  }
  go('editor');
  toast('success','已打开演示记录：'+record.name);
}
function selectAllHistory() {
  const records=demoRecords.filter(record=>record.type===historyTab);
  const all=records.every(record=>historySelection.has(record.id));
  records.forEach(record=>all?historySelection.delete(record.id):historySelection.add(record.id));renderHistory();
}
function deleteHistory() {
  if(!historySelection.size)return;
  confirm(`删除 ${historySelection.size} 条记录？`,'仅删除本地演示记录，不影响线上模板或原 PDF。',()=>{
    demoRecords=demoRecords.filter(record=>!historySelection.has(record.id));historySelection.clear();renderHistory();toast('success','记录已删除');
  });
}
function chooseLanguage(id) {
  if(!languages.some(item=>item[0]===id))return;
  pendingLanguage=id;
  document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-checked',String(el.dataset.language===id)));
}
function confirmLanguage() {
  preferences.language=pendingLanguage;
  const name=languages.find(item=>item[0]===preferences.language)[1];
  mineButtons[1].lastElementChild.textContent=name+'　›';
  go('mine');toast('success','已选择 '+name);
}
phoneEl.insertAdjacentHTML('beforeend',`<div class="personal-dialog-layer unit-dialog-layer" id="unit-dialog-layer" hidden onclick="if(event.target===this)closeUnitDialog()"><section class="personal-dialog unit-dialog" role="dialog" aria-modal="true" aria-labelledby="unit-dialog-title"><h2 id="unit-dialog-title">切换单位</h2><div class="unit-options" role="group" aria-label="尺寸单位">${[['mm','毫米'],['inch','英寸']].map(([unit,name])=>`<button class="unit-option" data-unit="${unit}" aria-pressed="${unit===preferences.unit}" onclick="selectPendingUnit('${unit}')"><b>${unit}</b><span>${name}</span><span class="choice-check">${svg('check')}</span></button>`).join('')}</div><div class="unit-actions"><button class="secondary unit-cancel" onclick="closeUnitDialog()">取消</button><button class="primary unit-confirm" onclick="applyUnit(pendingUnit)">确定</button></div></section></div>`);
let unitDialogFocus=null,unitDialogBackground=[],pendingUnit=preferences.unit;
function selectPendingUnit(unit) {
  if(!['mm','inch'].includes(unit))return;
  pendingUnit=unit;
  document.querySelectorAll('#unit-dialog-layer [data-unit]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.unit===unit)));
}
function openUnitDialog() {
  const layer=document.getElementById('unit-dialog-layer');if(!layer.hidden)return;
  unitDialogFocus=document.activeElement;
  selectPendingUnit(preferences.unit);
  unitDialogBackground=[...document.querySelectorAll('.screen,.bottom-nav,.side')].filter(el=>!el.inert);
  unitDialogBackground.forEach(el=>el.inert=true);layer.hidden=false;
  layer.querySelector(`[data-unit="${preferences.unit}"]`).focus({preventScroll:true});
}
function closeUnitDialog(restoreFocus=true) {
  const layer=document.getElementById('unit-dialog-layer');if(layer.hidden)return;
  layer.hidden=true;unitDialogBackground.forEach(el=>el.inert=false);unitDialogBackground=[];
  if(restoreFocus&&unitDialogFocus?.isConnected)unitDialogFocus.focus({preventScroll:true});
  unitDialogFocus=null;
}
document.getElementById('unit-dialog-layer').addEventListener('keydown',event=>{
  const controls=[...event.currentTarget.querySelectorAll('button')],index=controls.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeUnitDialog()}
  if(event.key==='Tab'&&((event.shiftKey&&index===0)||(!event.shiftKey&&index===controls.length-1))){event.preventDefault();controls[event.shiftKey?controls.length-1:0].focus()}
});
const newInputs=[...document.querySelectorAll('#new .row input')];
const newPhysicalSize=[30,15];
let labelShape='rectangle';
function displayDimension(mm){return Number((preferences.unit==='mm'?mm:mm/25.4).toFixed(preferences.unit==='mm'?2:3));}
function syncNewLabel(syncInputs=true){
  if(syncInputs)newInputs.forEach((input,index)=>input.value=displayDimension(newPhysicalSize[index]));
  document.querySelectorAll('#new .unit-suffix').forEach(el=>el.textContent=preferences.unit);
  document.querySelectorAll('[data-shape]').forEach(button=>{
    const selected=button.dataset.shape===labelShape;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('#new [data-size]').forEach(button=>{
    const selected=button.dataset.size.split(',').every((mm,i)=>Math.abs(+mm-newPhysicalSize[i])<.02);
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
    button.textContent=button.dataset.size.split(',').map(mm=>displayDimension(+mm)).join(' × ');
  });
  const [width,height]=newPhysicalSize,scale=Math.min(248/width,158/height);
  const paper=document.querySelector('#new .new-label');
  paper.style.setProperty('--paper-width',width*scale+'px');paper.style.setProperty('--paper-height',height*scale+'px');
  paper.classList.toggle('ellipse-label',labelShape==='ellipse');
  paper.parentElement.setAttribute('aria-label',`${labelShape==='ellipse'?'弧形':'矩形'}标签预览，${newPhysicalSize.map(displayDimension).join(' × ')} ${preferences.unit}`);
}
function chooseShape(shape){
  labelShape=shape;
  syncNewLabel();
}
function chooseSize(width,height){newPhysicalSize.splice(0,2,width,height);syncNewLabel();}
newInputs.forEach((input,index)=>input.addEventListener('input',()=>{
  const value=Number(input.value);
  if(Number.isFinite(value)&&value>0){
    newPhysicalSize[index]=value*(preferences.unit==='inch'?25.4:1);
    syncNewLabel(false);
  }
}));
function createLabel(){
  if(newInputs.some(input=>!Number.isFinite(Number(input.value))||Number(input.value)<=0)){toast('warn','请输入有效的宽度和高度');return;}
  const dimension=newPhysicalSize.map(displayDimension).join(' × ')+' '+preferences.unit;
  document.querySelector('#editor .topbar h1').firstChild.textContent='未命名标签 ';
  ['#editor .topbar small'].forEach(selector=>{
    const element=document.querySelector(selector);element.textContent=dimension;
    element.dataset.originalDimension=newPhysicalSize.map(mm=>Number(mm.toFixed(2))).join(' × ')+' mm';
  });
  go('editor');
}
function applyUnit(unit) {
  if(!['mm','inch'].includes(unit))return;
  const changed=unit!==preferences.unit;preferences.unit=unit;
  mineButtons[2].lastElementChild.textContent=preferences.unit+'　›';
  syncNewLabel();
  document.querySelectorAll('.template small,.template-large .muted,#editor .topbar small,#preview .topbar small').forEach(el=>{
    if(!el.dataset.originalDimension)el.dataset.originalDimension=el.textContent;
    el.textContent=preferences.unit==='mm'?el.dataset.originalDimension:el.dataset.originalDimension.replace(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*mm/g,(_,w,h)=>`${Number((+w/25.4).toFixed(3))} × ${Number((+h/25.4).toFixed(3))} inch`);
  });
  closeUnitDialog();if(changed)toast('success','显示单位已切换为 '+preferences.unit);
}
function checkVersion() {
  const button=document.getElementById('check-update'),status=document.getElementById('update-status');
  button.disabled=true;button.textContent='正在获取…';status.innerHTML='<span class="small-spinner"></span>正在获取更新信息';
  setTimeout(()=>{button.disabled=false;button.textContent='更新';status.innerHTML=svg('info')+'演示完成 · 尚未接入发布服务'},900);
}
function showUpdateExample() {
  confirm('发现新版本 1.1.0','演示更新提示：更稳定的连接与更流畅的标签编辑。实际更新说明与版本以发布服务为准。',()=>toast('warn','正式应用商店链接待配置'));
  document.getElementById('modalConfirm').textContent='去更新';
}
function syncAccountViews() {
  const name=authState.loggedIn?preferences.displayName:'未登录';
  document.getElementById('settings-name').textContent=name;
  document.getElementById('settings-description').textContent=authState.loggedIn?'原型会话 · 演示账号':'登录后管理个人信息';
  document.getElementById('settings-session').textContent=authState.loggedIn?'退出登录':'登录 ESPrint';
  document.getElementById('accountName').textContent=authState.loggedIn?preferences.displayName:'请登录';
  document.getElementById('accountHint').textContent=authState.loggedIn?'ID: 演示账号':'ID: --';
  document.querySelector('#mine .mine-header').setAttribute('aria-label',authState.loggedIn?'打开个人资料':'请登录，打开登录页面');
}
function openProfile() { authState.loggedIn?go('profile'):startLogin('profile'); }
function accountSessionAction() {
  if(!authState.loggedIn){startLogin('settings');return;}
  confirm('退出当前账号？','退出仅结束原型登录状态，不删除本地演示记录。',()=>{authState.loggedIn=false;syncAccountViews();go('mine');toast('success','已退出登录');});
}
function saveProfile() {
  const value=document.getElementById('profile-name').value.trim();
  if(!value){toast('warn','请输入昵称');return;}
  preferences.displayName=value;syncAccountViews();go('settings');toast('success','演示资料已更新');
}
viewLegal=function(name) {
  legalReturn=document.querySelector('.screen.active')?.id||'about';
  go(name==='用户协议'?'terms':'privacy');
};
document.querySelectorAll('#terms .back,#privacy .back').forEach(button=>button.onclick=()=>go(legalReturn));
document.querySelector('#history .topbar .spacer').outerHTML='<button class="top-action history-edit-button" id="history-edit" onclick="toggleHistoryEditing()">编辑</button>';
document.getElementById('history-edit').style.cssText='font-size:11px;min-width:36px';
mineButtons.forEach((button,index)=>button.onclick=()=>go(['history','language','units','help','contact','updates','about'][index]));
mineButtons[2].onclick=openUnitDialog;
document.querySelector('#mine .mine-header').onclick=()=>authState.loggedIn?openProfile():startLogin('mine');

const additionalPages=[['history','本地打印记录'],['language','切换语言'],['help','帮助中心'],['contact','联系我们'],['updates','版本更新'],['about','关于 ESPrint'],['settings','账号设置'],['profile','个人资料'],['terms','用户协议'],['privacy','隐私政策']];
pages.push(...additionalPages);
links.innerHTML=pages.map(([id,name])=>`<button data-page="${id}" onclick="go('${id}')">${name}</button>`).join('');
document.querySelector('.side h2').textContent='ESPrint · V1.0.0';
document.querySelector('.side > p').textContent='iPhone 16 Pro 布局。顶部导航由透明随滚动渐变为毛玻璃；点击页面目录或手机界面体验全部流程。';
document.querySelector('.side > p').insertAdjacentHTML('afterend','<span class="device-spec">iPhone 16 Pro · 402 × 874 pt</span>');

const fixedPages=new Set(['editor','login','register','forgot']);
function fitScreen(screen) {
  if(!screen?.classList.contains('active'))return;
  screen.classList.remove('fixed-screen');
  if(fixedPages.has(screen.id)||screen.scrollHeight<=screen.clientHeight+1)screen.classList.add('fixed-screen');
}
function syncNavigation(screen) {
  if(!screen)return;
  const progress=Math.max(0,Math.min(1,screen.scrollTop/88));
  screen.style.setProperty('--scroll-progress',progress.toFixed(4));
  if(screen.classList.contains('active')){
    phoneEl.style.setProperty('--scroll-progress',progress.toFixed(4));
    const navigation=screen.querySelector('.home-top,.topbar');
    phoneEl.style.setProperty('--navigation-height',(navigation?.offsetHeight||64)+'px');
  }
}
document.querySelectorAll('.screen').forEach(screen=>{
  screen.addEventListener('scroll',()=>syncNavigation(screen),{passive:true});
  if(fixedPages.has(screen.id))screen.classList.add('fixed-screen');
  if(['login','register','forgot'].includes(screen.id))screen.classList.add('auth-screen');
});
const baseGo=go;
go=function(id,options={}) {
  if(id==='units'){if(document.querySelector('.screen.active')?.id!=='mine')go('mine');openUnitDialog();return;}
  closeUnitDialog(false);
  closeCatalogSize();
  closePersonalPopover(false);closePersonalDialog(false);
  closePdfMenu(false);closePdfRename(false);
  preparePdfNavigation(id);
  if(id!=='templates'&&personalState.editing){personalState.editing=false;personalState.selected.clear();renderPersonalTemplates();}
  if(id==='templates')renderPersonalTemplates();
  if(id==='favorites')renderFavorites();
  if(id==='all-templates')renderCatalog();
  if(id==='template-search')renderCatalogSearch();
  if(id==='editor'){
    const source=document.querySelector('.screen.active')?.id;
    if(source!=='preview')templateEditorReturn=['home','all-templates','template-search','templates','favorites'].includes(source)?source:'home';
    document.querySelector('#editor .back').onclick=()=>go(templateEditorReturn);
  }
  if(id==='settings'||id==='mine')syncAccountViews();
  if(id==='language')chooseLanguage(preferences.language);
  if(id==='profile'){
    document.getElementById('profile-name').value=preferences.displayName;
    document.getElementById('profile-email').textContent=document.getElementById('login-email').value||'演示邮箱';
  }
  baseGo(id,options);
  phoneEl.dataset.page=id;
  const screen=document.querySelector('.screen.active');
  syncNavigation(screen);fitScreen(screen);
  if(id==='templates')syncPersonalNavigation();
  syncPdfNavigation(id);
};
let historySwipeX=0;
document.getElementById('history-records').addEventListener('touchstart',event=>{historySwipeX=event.changedTouches[0].clientX;},{passive:true});
document.getElementById('history-records').addEventListener('touchend',event=>{
  const distance=event.changedTouches[0].clientX-historySwipeX;
  if(Math.abs(distance)>70&&!historyEditing)switchHistory(distance<0?'pdf':'template');
},{passive:true});
window.addEventListener('resize',()=>{
  const screen=document.querySelector('.screen.active');
  fitScreen(screen);syncNavigation(screen);
});
renderFaq();switchHistory('template');syncAccountViews();syncNewLabel();go(location.hash.slice(1)||'home');
