/* Public template catalogue. Filtering and search use local prototype data. */
const catalogCategories=[['all','全部'],['popular','热门'],['latest','上新'],['life','生活收纳'],['shop','商品标签'],['logistics','物流仓储']];
const catalogItems=templates.map(([name,dimension,type],index)=>{
  const [width,height]=dimension.match(/\d+/g).map(Number);
  const category=[0,2,3,7,13].includes(index)?'logistics':[1,5,9,10,15,18].includes(index)?'shop':'life';
  return {id:index,name,width,height,type,category,popular:[0,1,6,7,9,11,17].includes(index),latest:index>=14};
});
const catalogState={category:'all',size:'all',query:'',recent:[],scope:'public',returnTo:'all-templates'};
function catalogEscape(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function catalogDimension(item){
  const unit=typeof preferences==='undefined'?'mm':preferences.unit;
  const format=value=>unit==='mm'?value:Number((value/25.4).toFixed(3));
  return `${format(item.width)} × ${format(item.height)} ${unit}`;
}
phoneEl.insertAdjacentHTML('beforeend',`
 <section id="all-templates" class="screen catalog-screen">
  <header class="topbar catalog-header">
   <div class="catalog-title-row"><button class="back" aria-label="返回首页" onclick="go('home')">${svg('back')}</button><h1>所有模板</h1><span class="spacer"></span></div>
   <button class="catalog-search-trigger" onclick="openCatalogSearch()">${svg('search')}<span>搜索模板名称、分类或尺寸</span></button>
   <div class="catalog-categories" role="tablist" aria-label="模板分类">${catalogCategories.map(([id,label])=>`<button class="catalog-category" role="tab" data-catalog-category="${id}" id="category-${id}" aria-selected="${id==='all'}" aria-controls="catalog-results" onclick="chooseCatalogCategory('${id}')">${label}</button>`).join('')}</div>
   <div class="catalog-filter-row"><button id="catalog-size-trigger" class="catalog-size-trigger" aria-haspopup="dialog" onclick="openCatalogSize()"><span id="catalog-size-label">所有尺寸</span>${svg('arrow')}</button><span id="catalog-count" role="status"></span></div>
  </header>
  <div class="catalog-content"><div id="catalog-results" role="tabpanel" aria-labelledby="category-all"></div><p class="catalog-end" id="catalog-end"></p></div>
 </section>
 <section id="template-search" class="screen catalog-screen">
  <header class="topbar catalog-search-top"><button class="back" aria-label="返回所有模板" onclick="go('all-templates')">${svg('back')}</button><form class="catalog-search-form" onsubmit="submitCatalogSearch(event)"><div class="catalog-search-input">${svg('search')}<input id="catalog-query" type="search" aria-label="搜索所有模板" placeholder="搜索模板名称、分类或尺寸" autocomplete="off" enterkeyhint="search" oninput="updateCatalogQuery(this.value)"><button type="button" class="catalog-search-clear" aria-label="清空搜索" onclick="clearCatalogQuery()" hidden>${svg('close')}</button></div><button type="submit" class="catalog-search-submit">搜索</button></form></header>
  <div class="catalog-search-content" id="catalog-search-content"></div>
 </section>
 <div id="catalog-size-overlay" class="catalog-size-overlay" hidden onclick="if(event.target===this)closeCatalogSize()"><section class="catalog-size-sheet" role="dialog" aria-modal="true" aria-labelledby="catalog-size-title"><div class="catalog-sheet-heading"><h2 id="catalog-size-title">筛选尺寸</h2><button aria-label="关闭尺寸筛选" onclick="closeCatalogSize()">${svg('close')}</button></div><div id="catalog-size-options" class="catalog-size-options" role="group" aria-label="模板尺寸"></div></section></div>
`);
pages.splice(1,0,['all-templates','所有模板'],['template-search','模板搜索']);

function catalogCards(items,origin){
  if(!items.length)return `<div class="catalog-empty">${svg('search')}<p>没有找到匹配的模板</p><button class="secondary" onclick="${origin==='all-templates'?'resetCatalogFilters()':'clearCatalogQuery()'}">${origin==='all-templates'?'重置筛选':'重新搜索'}</button></div>`;
  const columns=[[],[]];
  items.forEach((item,index)=>{
    const height=[188,139,159,207,153][item.id%5];
    columns[index%2].push(`<div class="catalog-card-shell"><button class="catalog-card" data-catalog-id="${item.id}" onclick="openCatalogTemplate('${item.id}','${origin}')" aria-label="打开${catalogEscape(item.name)}"><div class="catalog-thumbnail tone-${index%4}" style="--catalog-height:${Number.isFinite(height)?height:159}px">${labelMarkup(item.type)}${item.latest?'<span class="catalog-badge">NEW</span>':''}</div><b>${catalogEscape(item.name)}</b><small>${catalogDimension(item)}</small></button>${favoriteButton(item.favoriteKey||'catalog:'+item.id,item.name)}</div>`);
  });
  return `<div class="catalog-masonry">${columns.map(column=>`<div class="catalog-column">${column.join('')}</div>`).join('')}</div>`;
}
function settleCatalogLayout(id){
  const screen=document.getElementById(id);
  if(typeof fitScreen==='function')fitScreen(screen);
  if(typeof syncNavigation==='function')syncNavigation(screen);
}
function renderCatalog(){
  const category=catalogState.category;
  let items=catalogItems.filter(item=>(category==='all'||category==='popular'&&item.popular||category==='latest'&&item.latest||item.category===category)&&(catalogState.size==='all'||`${item.width},${item.height}`===catalogState.size));
  if(category==='latest')items=items.slice().reverse();
  document.querySelectorAll('[data-catalog-category]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.catalogCategory===category)));
  const selectedSize=catalogItems.find(item=>`${item.width},${item.height}`===catalogState.size);
  document.getElementById('catalog-size-label').textContent=selectedSize?catalogDimension(selectedSize):'所有尺寸';
  document.getElementById('catalog-size-trigger').setAttribute('aria-pressed',String(!!selectedSize));
  document.getElementById('catalog-count').textContent=`${items.length} 款模板`;
  const results=document.getElementById('catalog-results');
  results.setAttribute('aria-labelledby','category-'+category);results.innerHTML=catalogCards(items,'all-templates');
  document.getElementById('catalog-end').textContent=items.length?'已显示全部模板':'';
  settleCatalogLayout('all-templates');
}
function chooseCatalogCategory(category){
  catalogState.category=category;document.getElementById('all-templates').scrollTop=0;renderCatalog();
  document.getElementById('category-'+category).scrollIntoView({block:'nearest',inline:'nearest'});
}
function resetCatalogFilters(){catalogState.category='all';catalogState.size='all';renderCatalog();}
function openCatalogSize(){
  const sizes=[...new Map(catalogItems.map(item=>[`${item.width},${item.height}`,item])).entries()].sort(([,a],[,b])=>a.width-b.width||a.height-b.height);
  document.getElementById('catalog-size-options').innerHTML=`<button class="catalog-size-option" data-catalog-size="all" aria-pressed="${catalogState.size==='all'}" onclick="chooseCatalogSize('all')">所有尺寸</button>`+sizes.map(([key,item])=>`<button class="catalog-size-option" data-catalog-size="${key}" aria-pressed="${catalogState.size===key}" onclick="chooseCatalogSize('${key}')">${catalogDimension(item)}</button>`).join('');
  document.getElementById('catalog-size-overlay').hidden=false;
  document.querySelector('.catalog-size-option[aria-pressed="true"]').focus();
}
function closeCatalogSize(){
  const overlay=document.getElementById('catalog-size-overlay');
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;
  if(document.getElementById('all-templates').classList.contains('active'))document.getElementById('catalog-size-trigger').focus();
}
function chooseCatalogSize(size){catalogState.size=size;document.getElementById('all-templates').scrollTop=0;closeCatalogSize();renderCatalog();}
document.addEventListener('keydown',event=>{
  const overlay=document.getElementById('catalog-size-overlay');if(overlay.hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeCatalogSize();}
  if(event.key==='Tab'){
    const buttons=[...overlay.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
function openCatalogSearch(scope='public'){
  if(catalogState.scope!==scope){catalogState.query='';document.getElementById('catalog-query').value='';}
  catalogState.scope=scope;catalogState.returnTo=scope==='mine'?'templates':'all-templates';
  go('template-search');document.getElementById('catalog-query').focus();
}
function normalizeCatalogQuery(query){return query.toLowerCase().replace(/[\s×x*＊]/g,'');}
function catalogKeywordButtons(words){return words.map(word=>`<button class="catalog-keyword" data-search-word="${catalogEscape(word)}">${catalogEscape(word)}</button>`).join('');}
function renderCatalogSearch(){
  const query=catalogState.query.trim(),target=document.getElementById('catalog-search-content');
  const personal=catalogState.scope==='mine';
  const input=document.getElementById('catalog-query');
  input.placeholder=personal?'搜索我的模板名称或尺寸':'搜索模板名称、分类或尺寸';
  input.setAttribute('aria-label',personal?'搜索我的模板':'搜索所有模板');
  const back=document.querySelector('#template-search .back');
  back.setAttribute('aria-label',personal?'返回我的模板':'返回所有模板');back.onclick=()=>go(catalogState.returnTo);
  document.querySelector('.catalog-search-clear').hidden=!catalogState.query;
  if(!query){
    const words=personal?['快递标签','货架位置标签','价格标签','40 × 20']:['快递标签','厨房收纳','商品价格','40 × 20','物流仓储','文件归档'];
    target.innerHTML=`${catalogState.recent.length?`<div class="catalog-section-heading"><h2>最近搜索</h2><button aria-label="清空最近搜索" onclick="clearCatalogRecent()">清空</button></div><div class="catalog-keywords">${catalogKeywordButtons(catalogState.recent)}</div>`:''}<div class="catalog-section-heading"><h2>${personal?'快捷搜索':'热门搜索'}</h2></div><div class="catalog-keywords">${catalogKeywordButtons(words)}</div>`;
  }else{
    const normalized=normalizeCatalogQuery(query);
    const source=personal?personalItems:catalogItems;
    const items=source.filter(item=>normalizeCatalogQuery(`${item.name} ${catalogDimension(item)} ${item.width}×${item.height} ${catalogCategories.find(([id])=>id===item.category)?.[1]||''}`).includes(normalized));
    target.innerHTML=`<div class="catalog-section-heading"><span role="status">找到 ${items.length} 款模板</span></div>${catalogCards(items,'template-search')}`;
  }
  settleCatalogLayout('template-search');
}
document.getElementById('catalog-search-content').addEventListener('click',event=>{
  const button=event.target.closest('[data-search-word]');if(!button)return;
  document.getElementById('catalog-query').value=button.dataset.searchWord;catalogState.query=button.dataset.searchWord;commitCatalogSearch();
});
function updateCatalogQuery(query){catalogState.query=query;renderCatalogSearch();}
function commitCatalogSearch(){
  const query=catalogState.query.trim();
  if(query)catalogState.recent=[query,...catalogState.recent.filter(term=>term!==query)].slice(0,8);
  document.getElementById('catalog-query').blur();renderCatalogSearch();
}
function submitCatalogSearch(event){event.preventDefault();commitCatalogSearch();}
function clearCatalogQuery(){catalogState.query='';document.getElementById('catalog-query').value='';renderCatalogSearch();document.getElementById('catalog-query').focus();}
function clearCatalogRecent(){catalogState.recent=[];renderCatalogSearch();}
function openCatalogTemplate(id,origin){
  const item=catalogItems.find(item=>String(item.id)===String(id))||(typeof personalItems!=='undefined'?personalItems.find(item=>item.id===id):null);if(!item)return;
  if(origin==='template-search')commitCatalogSearch();
  templateEditorReturn=origin;
  go('editor');
  document.querySelector('#editor .topbar h1').firstChild.textContent=item.name+' ';
  const dimension=document.querySelector('#editor .topbar small');dimension.textContent=catalogDimension(item);dimension.dataset.originalDimension=`${item.width} × ${item.height} mm`;
}
renderCatalog();renderCatalogSearch();
