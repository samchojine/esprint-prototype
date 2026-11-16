/* Personal folders and favorites are local interactive prototype data. */
let personalFolders=[['default','默认文件夹'],['warehouse','仓储标签'],['shop','商品标签'],['life','生活收纳']];
const personalExamples=[
 ['my-1','快递标签',100,150,'parcel','default','今天 09:32'],
 ['my-2','货架位置标签',30,15,'archive','warehouse','昨天 15:20'],
 ['my-3','价格标签',40,20,'price','shop','11 月 08 日'],
 ['my-4','仓储货架',60,40,'archive','warehouse','11 月 07 日'],
 ['my-5','厨房收纳',40,20,'archive','life','11 月 06 日'],
 ['my-6','服饰吊牌',40,60,'price','shop','11 月 05 日'],
 ['my-7','日期标签',30,15,'archive','default','11 月 04 日']
].map(([id,name,width,height,type,folder,updated])=>({id,name,width,height,type,folder,updated,favoriteKey:'personal:'+id}));
const savedPersonalIds=readPrototypeValue('esprint.prototype.personal.v20',null);
let personalItems=personalExamples.filter(item=>!Array.isArray(savedPersonalIds)||savedPersonalIds.includes(item.id));
const personalState={folder:'default',editing:false,selected:new Set()};
let templateEditorReturn='home';

document.getElementById('templates').innerHTML=`
 <header class="topbar personal-header"><button class="back" aria-label="返回首页" onclick="go('home')">${svg('back')}</button><div class="personal-search"><button class="catalog-search-trigger" onclick="openCatalogSearch('mine')">${svg('search')}<span>搜索我的模板</span></button></div><button class="top-action personal-manage" id="personal-manage" aria-label="管理模板" aria-pressed="false" onclick="togglePersonalEditing()">${svg('more')}</button></header>
 <div class="personal-workspace"><nav class="personal-folders" id="personal-folders" aria-label="模板文件夹"></nav><div class="personal-results" id="personal-results"><div class="personal-list-heading"><span id="personal-folder-name">默认文件夹</span><span id="personal-count" role="status"></span></div><div id="personal-cards"></div></div></div>
 <div class="personal-actions" id="personal-actions" hidden><span class="personal-selection-count" id="personal-selection-count" role="status">已选 0 项</span><button class="secondary" id="personal-select-all" onclick="selectAllPersonal()">全选</button><button class="danger-solid" id="personal-delete" onclick="deletePersonalSelection()" disabled>删除</button></div>
`;
document.getElementById('favorites').innerHTML=`${topbar('我的收藏')}<div class="catalog-content favorites-content" id="favorites-content"></div>`;

function visiblePersonalItems(){return personalItems.filter(item=>item.folder===personalState.folder)}
function renderPersonalTemplates(){
 closePersonalPopover(false);
 if(!personalFolders.some(([id])=>id===personalState.folder))personalState.folder='default';
 const items=visiblePersonalItems();
 document.getElementById('personal-folders').innerHTML=personalFolderMarkup();
 document.getElementById('personal-folder-name').textContent=personalFolders.find(([id])=>id===personalState.folder)[1];
 document.getElementById('personal-count').textContent=`${items.length} 款`;
 document.getElementById('personal-cards').innerHTML=items.length?items.map(item=>{
  const selected=personalState.selected.has(item.id);
  return `<article class="personal-card"><button class="personal-open" data-personal-id="${item.id}" ${personalState.editing?`aria-pressed="${selected}"`:''} aria-label="${personalState.editing?'选择':'打开'}${templateText(item.name)}" onclick="openPersonalTemplate('${item.id}')"><div class="personal-thumbnail">${labelMarkup(item.type)}${personalState.editing?`<span class="personal-check ${selected?'is-selected':''}">${svg('check')}</span>`:''}</div><b>${templateText(item.name)}</b><small>${catalogDimension(item)}</small><span class="personal-updated">${templateText(item.updated)}</span></button><button class="personal-template-menu" data-template-menu="${item.id}" aria-label="操作${templateText(item.name)}" aria-haspopup="menu" aria-expanded="false" onclick="openPersonalPopover(event,'template','${item.id}')">${svg('more')}</button></article>`;
 }).join(''):`<div class="personal-empty">${svg('folder')}<p>这个文件夹还没有模板</p></div>`;
 const manage=document.getElementById('personal-manage');
 manage.innerHTML=personalState.editing?'完成':svg('more');
 manage.setAttribute('aria-label',personalState.editing?'完成多选':'管理模板');
 manage.setAttribute('aria-pressed',String(personalState.editing));
 document.getElementById('templates').classList.toggle('is-selecting',personalState.editing);
 document.getElementById('personal-actions').hidden=!personalState.editing;
 document.getElementById('personal-selection-count').textContent=`已选 ${personalState.selected.size} 项`;
 document.getElementById('personal-delete').disabled=personalState.selected.size===0;
 document.getElementById('personal-delete').textContent=personalState.selected.size?`删除 (${personalState.selected.size})`:'删除';
 const all=items.length>0&&items.every(item=>personalState.selected.has(item.id));
 document.getElementById('personal-select-all').textContent=all?'取消全选':'全选';
 document.getElementById('personal-select-all').disabled=items.length===0;
 document.getElementById('personal-select-all').setAttribute('aria-pressed',String(all));
 settleCatalogLayout('templates');
 syncPersonalNavigation();
}
function choosePersonalFolder(folder){
 personalState.folder=folder;
 document.getElementById('personal-results').scrollTop=0;
 renderPersonalTemplates();
}
function togglePersonalEditing(){
 personalState.editing=!personalState.editing;personalState.selected.clear();renderPersonalTemplates();
}
function openPersonalTemplate(id){
 if(personalState.editing){
  personalState.selected.has(id)?personalState.selected.delete(id):personalState.selected.add(id);
  renderPersonalTemplates();return;
 }
 openCatalogTemplate(id,'templates');
}
function selectAllPersonal(){
 const items=visiblePersonalItems(),all=items.every(item=>personalState.selected.has(item.id));
 items.forEach(item=>all?personalState.selected.delete(item.id):personalState.selected.add(item.id));renderPersonalTemplates();
}
function deletePersonalSelection(){
 if(!personalState.selected.size)return;
 const ids=new Set(personalState.selected);
 confirm(`删除这 ${ids.size} 个模板？`,'删除后将从我的模板中移除，对应的收藏也会取消。',()=>{
  removePersonalItems(ids);
  toast('success',`已删除 ${ids.size} 个模板`);
 });
}
function syncPersonalNavigation(){
 const screen=document.getElementById('templates');if(!screen.classList.contains('active'))return;
 const progress=Math.max(0,Math.min(1,document.getElementById('personal-results').scrollTop/88));
 screen.style.setProperty('--scroll-progress',progress.toFixed(4));phoneEl.style.setProperty('--scroll-progress',progress.toFixed(4));
}
document.getElementById('personal-results').addEventListener('scroll',syncPersonalNavigation,{passive:true});

function toggleTemplateFavorite(event,key){
 event.preventDefault();event.stopPropagation();
 const selected=!templateFavorites.has(key);
 selected?templateFavorites.add(key):templateFavorites.delete(key);
 savePrototypeValue('esprint.prototype.favorites.v20',[...templateFavorites]);
 syncTemplateFavoriteButtons();
 if(document.getElementById('favorites').classList.contains('active'))renderFavorites();
 toast('success',selected?'已收藏':'已取消收藏');
}
function syncTemplateFavoriteButtons(){
 document.querySelectorAll('[data-favorite-key]').forEach(button=>{
  const selected=templateFavorites.has(button.dataset.favoriteKey);
  button.setAttribute('aria-pressed',String(selected));
  button.setAttribute('aria-label',(selected?'取消收藏':'收藏')+button.dataset.favoriteName);
 });
}
function renderFavorites(){
 const items=[...catalogItems,...personalItems].filter(item=>templateFavorites.has(item.favoriteKey||'catalog:'+item.id));
 document.getElementById('favorites-content').innerHTML=items.length?catalogCards(items,'favorites'):`<div class="favorites-empty">${svg('heart')}<p>还没有收藏的模板</p><button class="secondary" onclick="go('all-templates')">去发现模板</button></div>`;
 settleCatalogLayout('favorites');
}
