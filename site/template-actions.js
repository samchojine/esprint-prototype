/* Folder and template management for the local, clickable prototype. */
iconPaths.edit='<path d="m15 4 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4ZM4 22h16"/>';
iconPaths.copy='<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>';
iconPaths.trash='<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>';
iconPaths.folderplus='<path d="M3 8V5h6l2 3h10v12H3V8Z"/><path d="M12 11v6m-3-3h6"/>';

// Upgrade the earlier ID-only snapshot to full records for rename/move/copy.
const personalSnapshot=readPrototypeValue('esprint.prototype.library.v21',null);
if(personalSnapshot&&Array.isArray(personalSnapshot.folders)&&Array.isArray(personalSnapshot.items)){
 const ids=new Set(['default']);
 personalFolders=[['default','默认文件夹'],...personalSnapshot.folders.filter(folder=>{
  if(!Array.isArray(folder)||!/^[-\w]+$/.test(folder[0])||ids.has(folder[0])||typeof folder[1]!=='string'||!folder[1].trim())return false;
  ids.add(folder[0]);return true;
 }).map(([id,name])=>[id,name.slice(0,30)])];
 const itemIds=new Set();
 personalItems=personalSnapshot.items.filter(item=>{
  if(!item||typeof item.id!=='string'||!/^[-\w]+$/.test(item.id)||itemIds.has(item.id)||typeof item.name!=='string'||!Number.isFinite(item.width)||item.width<=0||!Number.isFinite(item.height)||item.height<=0)return false;
  itemIds.add(item.id);return true;
 }).map(item=>({id:item.id,name:item.name.slice(0,40),width:item.width,height:item.height,type:['parcel','price','archive'].includes(item.type)?item.type:'archive',folder:ids.has(item.folder)?item.folder:'default',updated:typeof item.updated==='string'?item.updated:'刚刚',favoriteKey:'personal:'+item.id}));
}

let personalPopover=null,personalDialog=null;
phoneEl.insertAdjacentHTML('beforeend',`
 <div class="personal-popover-layer" id="personal-popover-layer" hidden onclick="if(event.target===this)closePersonalPopover()"><div class="personal-popover" id="personal-popover" role="menu" aria-label="操作菜单"></div></div>
 <div class="personal-dialog-layer" id="personal-dialog-layer" hidden onclick="if(event.target===this)closePersonalDialog()"><section class="personal-dialog" role="dialog" aria-modal="true" aria-labelledby="personal-dialog-title"><form id="personal-dialog-form" onsubmit="submitPersonalDialog(event)"><h2 id="personal-dialog-title"></h2><div id="personal-dialog-body"></div><p class="personal-dialog-error" id="personal-dialog-error" role="alert"></p><div class="personal-dialog-actions"><button type="button" class="secondary" onclick="closePersonalDialog()">取消</button><button type="submit" class="primary" id="personal-dialog-confirm">确定</button></div></form></section></div>
`);

function personalFolderMarkup(){
 return `<button class="personal-folder personal-add-folder" id="personal-add-folder" aria-haspopup="dialog" onclick="openFolderCreate()"><span class="personal-folder-icon">${svg('folderplus')}</span><span>新增文件夹</span></button>`+personalFolders.map(([id,name])=>`<div class="personal-folder-shell"><button class="personal-folder" data-personal-folder="${id}" aria-current="${personalState.folder===id?'true':'false'}" onclick="choosePersonalFolder('${id}')"><span class="personal-folder-icon">${svg('folder')}</span><span class="personal-folder-name">${templateText(name)}</span></button>${id==='default'?'':`<button class="personal-folder-edit" data-folder-edit="${id}" aria-label="编辑${templateText(name)}" aria-haspopup="menu" aria-expanded="false" onclick="openPersonalPopover(event,'folder','${id}')">${svg('more')}</button>`}</div>`).join('');
}
function persistPersonalLibrary(){savePrototypeValue('esprint.prototype.library.v21',{folders:personalFolders,items:personalItems})}
function refreshPersonalLibrary(){
 persistPersonalLibrary();renderPersonalTemplates();renderFavorites();renderCatalogSearch();syncTemplateFavoriteButtons();
}
function removePersonalItems(ids){
 personalItems=personalItems.filter(item=>!ids.has(item.id));
 ids.forEach(id=>{templateFavorites.delete('personal:'+id);personalState.selected.delete(id)});
 savePrototypeValue('esprint.prototype.favorites.v20',[...templateFavorites]);
 refreshPersonalLibrary();
}
function newPersonalId(prefix){return prefix+'-'+crypto.randomUUID()}

function closePersonalPopover(restoreFocus=true){
 const menu=document.getElementById('personal-popover-layer');if(!menu||menu.hidden)return;
 const trigger=personalPopover?.trigger;
 menu.hidden=true;trigger?.setAttribute('aria-expanded','false');personalPopover=null;
 if(restoreFocus&&trigger?.isConnected)trigger.focus({preventScroll:true});
}
function openPersonalPopover(event,type,id){
 event.stopPropagation();
 const trigger=event.currentTarget;
 if(personalPopover?.trigger===trigger){closePersonalPopover();return}
 closePersonalPopover(false);
 if(type==='folder'&&!personalFolders.some(([key])=>key===id&&key!=='default'))return;
 if(type==='template'&&!personalItems.some(item=>item.id===id))return;
 personalPopover={type,id,trigger};
 const actions=type==='folder'?[['rename','edit','重命名'],['delete','trash','删除']]:[['rename','edit','重命名'],['move','folder','移动到'],['copy','copy','复制'],['delete','trash','删除']];
 const layer=document.getElementById('personal-popover-layer'),menu=document.getElementById('personal-popover');
 menu.innerHTML=actions.map(([action,icon,label])=>`<button role="menuitem" class="personal-menu-item ${action==='delete'?'personal-menu-danger':''}" data-personal-action="${action}" onclick="runPersonalMenuAction('${action}')">${svg(icon)}<span>${label}</span></button>`).join('');
 menu.setAttribute('aria-label',type==='folder'?'文件夹操作':'模板操作');
 layer.hidden=false;trigger.setAttribute('aria-expanded','true');
 const bounds=layer.getBoundingClientRect(),anchor=trigger.getBoundingClientRect();
 const width=menu.offsetWidth,height=menu.offsetHeight,minimumTop=62+7;
 let left,top,side;
 if(type==='folder'){
  left=Math.min(bounds.width-width-12,anchor.right-bounds.left+12);
  top=Math.min(Math.max(anchor.top-bounds.top-9,minimumTop),bounds.height-height-15);side='left';
 }else{
  left=Math.min(bounds.width-width-12,Math.max(12,anchor.right-bounds.left-width));
  top=anchor.bottom-bounds.top+9;side='top';
  if(top+height>bounds.height-15){top=anchor.top-bounds.top-height-9;side='bottom'}
  top=Math.max(minimumTop,top);
 }
 menu.style.left=left+'px';menu.style.top=top+'px';menu.dataset.arrow=side;
 menu.style.setProperty('--arrow-position',type==='folder'?Math.max(17,Math.min(height-18,anchor.top+anchor.height/2-bounds.top-top))+'px':Math.max(18,Math.min(width-18,anchor.left+anchor.width/2-bounds.left-left))+'px');
 menu.querySelector('button').focus({preventScroll:true});
}
function runPersonalMenuAction(action){
 const target=personalPopover;if(!target)return;
 closePersonalPopover(false);
 if(target.type==='folder'){
  if(action==='rename')openFolderRename(target.id,target.trigger);
  if(action==='delete')deletePersonalFolder(target.id);
 }else{
  if(action==='rename')openTemplateRename(target.id,target.trigger);
  if(action==='move')openTemplateMove(target.id,target.trigger);
  if(action==='copy')copyPersonalTemplate(target.id);
  if(action==='delete')deleteSinglePersonalTemplate(target.id);
 }
}

function openPersonalDialog(kind,id,titleText,body,trigger){
 closePersonalPopover(false);
 personalDialog={kind,id,trigger:trigger||document.activeElement};
 document.getElementById('personal-dialog-title').textContent=titleText;
 document.getElementById('personal-dialog-body').innerHTML=body;
 document.getElementById('personal-dialog-error').textContent='';
 document.getElementById('personal-dialog-layer').hidden=false;
 const input=document.getElementById('personal-name-input');
 if(input){input.focus({preventScroll:true});input.select()}
 else document.querySelector('#personal-dialog-body button:not(:disabled)')?.focus({preventScroll:true});
}
function nameInputMarkup(label,value='',max=30){return `<label class="personal-name-field"><span>${label}</span><input id="personal-name-input" aria-label="${label}" value="${templateText(value)}" placeholder="${label}" maxlength="${max}" autocomplete="off" oninput="document.getElementById('personal-dialog-error').textContent='' "></label>`}
function openFolderCreate(){openPersonalDialog('create-folder',null,'新增文件夹',nameInputMarkup('文件夹名称'),document.getElementById('personal-add-folder'))}
function openFolderRename(id,trigger){
 const folder=personalFolders.find(([key])=>key===id);if(!folder||id==='default')return;
 openPersonalDialog('rename-folder',id,'重命名文件夹',nameInputMarkup('文件夹名称',folder[1]),trigger);
}
function openTemplateRename(id,trigger){
 const item=personalItems.find(item=>item.id===id);if(!item)return;
 openPersonalDialog('rename-template',id,'重命名模板',nameInputMarkup('模板名称',item.name,40),trigger);
}
function openTemplateMove(id,trigger){
 const item=personalItems.find(item=>item.id===id);if(!item)return;
 openPersonalDialog('move-template',id,'移动到',`<div class="personal-move-folders" role="group" aria-label="目标文件夹">${personalFolders.map(([key,name])=>`<button type="button" class="personal-move-folder" data-move-folder="${key}" aria-pressed="false" ${key===item.folder?'disabled':''} onclick="selectPersonalMoveFolder('${key}')">${svg('folder')}<span>${templateText(name)}</span>${key===item.folder?'<small>当前位置</small>':svg('check')}</button>`).join('')}</div>`,trigger);
 document.getElementById('personal-dialog-confirm').disabled=true;
}
function selectPersonalMoveFolder(id){
 if(!personalDialog||personalDialog.kind!=='move-template')return;
 personalDialog.destination=id;
 document.querySelectorAll('[data-move-folder]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.moveFolder===id)));
 document.getElementById('personal-dialog-confirm').disabled=false;
}
function closePersonalDialog(restoreFocus=true){
 const layer=document.getElementById('personal-dialog-layer');if(!layer||layer.hidden)return;
 const trigger=personalDialog?.trigger;layer.hidden=true;personalDialog=null;
 document.getElementById('personal-dialog-confirm').disabled=false;
 if(restoreFocus){
  const fallback=document.getElementById('personal-manage');
  (trigger?.isConnected?trigger:fallback)?.focus({preventScroll:true});
 }
}
function submitPersonalDialog(event){
 event.preventDefault();if(!personalDialog)return;
 const state=personalDialog,input=document.getElementById('personal-name-input');
 const name=input?.value.trim();
 if(input){
  let error=!name?'请输入名称':'';
  if(!error&&state.kind.includes('folder')&&personalFolders.some(([id,label])=>id!==state.id&&label===name))error='已有同名文件夹，请换一个名称';
  if(error){document.getElementById('personal-dialog-error').textContent=error;input.focus();return}
 }
 let message='';
 if(state.kind==='create-folder'){
  const id=newPersonalId('folder');personalFolders.push([id,name]);personalState.folder=id;message='文件夹已新增';
 }else if(state.kind==='rename-folder'){
  const folder=personalFolders.find(([id])=>id===state.id);if(!folder||folder[0]==='default')return;
  folder[1]=name;message='文件夹已重命名';
 }else if(state.kind==='rename-template'){
  const item=personalItems.find(item=>item.id===state.id);if(!item)return;
  item.name=name;item.updated='刚刚';message='模板已重命名';
 }else if(state.kind==='move-template'){
  const item=personalItems.find(item=>item.id===state.id);
  if(!item||!personalFolders.some(([id])=>id===state.destination)||item.folder===state.destination)return;
  item.folder=state.destination;item.updated='刚刚';personalState.selected.delete(item.id);message='模板已移动';
 }
 closePersonalDialog();refreshPersonalLibrary();toast('success',message);
 if(state.kind==='create-folder'){const rail=document.getElementById('personal-folders');rail.scrollTop=rail.scrollHeight;}
}
function deletePersonalFolder(id){
 const folder=personalFolders.find(([key])=>key===id);if(!folder||id==='default')return;
 const count=personalItems.filter(item=>item.folder===id).length;
 confirm(`删除“${folder[1]}”？`,count?'文件夹内的模板将移至默认文件夹，模板会保留。':'确定删除这个空文件夹？',()=>{
  personalItems.forEach(item=>{if(item.folder===id)item.folder='default'});
  personalFolders=personalFolders.filter(([key])=>key!==id);
  if(personalState.folder===id)personalState.folder='default';
  refreshPersonalLibrary();toast('success','文件夹已删除');
 });
}
function copyPersonalTemplate(id){
 const item=personalItems.find(item=>item.id===id);if(!item)return;
 const suffix=' 副本',base=item.name.replace(/ 副本(?: \d+)?$/,'').slice(0,30);
 let name=base+suffix,index=2;
 while(personalItems.some(other=>other.folder===item.folder&&other.name===name))name=base+suffix+' '+index++;
 const copyId=newPersonalId('my');
 personalItems.splice(personalItems.indexOf(item)+1,0,{...item,id:copyId,favoriteKey:'personal:'+copyId,name,updated:'刚刚'});
 refreshPersonalLibrary();toast('success','已复制到当前文件夹');
}
function deleteSinglePersonalTemplate(id){
 const item=personalItems.find(item=>item.id===id);if(!item)return;
 confirm(`删除“${item.name}”？`,'删除后将从我的模板中移除，对应的收藏也会取消。',()=>{removePersonalItems(new Set([id]));toast('success','模板已删除')});
}

// Dismiss anchored menus on scroll; dialogs remain modal and trap keyboard focus.
['personal-results','personal-folders'].forEach(id=>document.getElementById(id).addEventListener('scroll',()=>closePersonalPopover(false),{passive:true}));
window.addEventListener('resize',()=>closePersonalPopover(false));
document.addEventListener('keydown',event=>{
 if(personalDialog){
  if(event.key==='Escape'){event.preventDefault();closePersonalDialog()}
  if(event.key==='Tab'){
   const controls=[...document.querySelectorAll('#personal-dialog-layer input,#personal-dialog-layer button:not(:disabled)')],first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }else if(personalPopover){
  const buttons=[...document.querySelectorAll('#personal-popover button')],index=buttons.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();closePersonalPopover()}
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();
  }
  if(event.key==='Tab')closePersonalPopover();
 }
});
renderPersonalTemplates();renderFavorites();syncTemplateFavoriteButtons();
