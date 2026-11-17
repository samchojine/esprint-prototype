/* Label-editor interaction prototype; PDF editing has its own module. */
(() => {
  const screen = document.getElementById('editor');
  const toolbar = screen.querySelector('.toolstrip');
  const workspace = screen.querySelector('.canvas-wrap');
  const paper = screen.querySelector('.canvas');
  const menu = screen.querySelector('.element-menu');
  const dimensions = screen.querySelector('.topbar small');
  const actions = screen.querySelector('.bottom-actions');
  const paths = {
    clear: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/>',
    undo: '<path d="m8 5-5 5 5 5M3 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)"/>',
    redo: '<path d="m16 5 5 5-5 5m5-5H11a6 6 0 0 0 0 12" transform="translate(0 -2)"/>',
    lock: '<rect x="6" y="10" width="12" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    unlock: '<rect x="6" y="10" width="12" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 7.5-2m-3.5 9v3"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2.5"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
    rotate: '<rect x="5" y="10" width="9" height="10" rx="2"/><path d="M7 6a8 8 0 0 1 13 7m0-7v7h-5"/>',
    canvasRotate: '<path d="M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5"/><rect x="7" y="10" width="10" height="11" rx="2"/><path d="M10 13h4m-4 3h3"/>',
    reset: '<path d="M8 3H4v4m12-4h4v4M4 17v4h4m8 0h4v-4"/><rect x="8" y="7" width="8" height="10" rx="1.5"/>',
    text: '<path d="M4 6V4h16v2M12 4v16m-4 0h8"/>',
    icon: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z"/>',
    border: '<rect x="3" y="4" width="18" height="16" rx="3"/><rect x="6" y="7" width="12" height="10" rx="1" stroke-dasharray="2 2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 5"/>',
    shape: '<circle cx="8" cy="9" r="5"/><rect x="10" y="10" width="11" height="11" rx="2" fill="#edf2fa" fill-opacity=".65"/>',
    barcode: '<path d="M3 7V4h4m10 0h4v3M3 17v3h4m10 0h4v-3M6 8v8m3-8v8m3-8v8m3-8v8m3-8v8"/><path stroke-width="2.5" d="M9 8v8m6-8v8"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M15 14h3v3h3v4h-7v-3m-8-12v1m11-1v1M6 17v1"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16m6-16v16"/>',
    scan: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M2 12h20M8 8v8m4-8v8m4-8v8"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    serial: '<path d="M9 3 7 21M17 3l-2 18M4 9h17M3 15h17"/>'
  };
  const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.icon}</svg>`;
  const entries = [['text','文本'],['icon','图标'],['border','边框'],['image','图片'],['shape','形状'],['barcode','条形码'],['qr','二维码'],['table','表格'],['scan','扫描'],['time','时间'],['serial','序列号']];
  const state = { width: 30, height: 15, zoom: 1, x: 0, y: 0, selected: null, textDefaultFont: 'system', items: [], undo: [], redo: [] };
  let page = 0, dimensionKey = '', nextId = 1;

  workspace.innerHTML = '<div class="editor-ruler editor-ruler-x" aria-hidden="true"></div><div class="editor-ruler editor-ruler-y" aria-hidden="true"></div>';
  workspace.append(paper);
  const floating = document.createElement('div');
  floating.className = 'float-tools';
  floating.innerHTML = `<button type="button" data-view="rotate" title="旋转画布" aria-label="旋转画布">${glyph('canvasRotate')}</button><button type="button" data-view="reset" title="恢复默认视图" aria-label="恢复默认视图">${glyph('reset')}</button>`;
  const toolbarRow = document.createElement('div');
  toolbarRow.className = 'editor-toolbar-row';
  toolbar.before(toolbarRow);
  toolbarRow.append(toolbar, floating);
  const zoomLabel = document.createElement('span');
  zoomLabel.className = 'editor-zoom';
  workspace.append(zoomLabel);
  const dock = document.createElement('div');
  dock.className = 'editor-dock';
  menu.before(dock);
  dock.append(menu);
  actions.className='editor-nav-actions';
  screen.querySelector('.top-action').replaceWith(actions);
  const pageBreak = 8;
  menu.innerHTML = `<div class="editor-menu-viewport" aria-label="添加元素，左右滑动切换菜单" tabindex="0">${[entries.slice(0,pageBreak), entries.slice(pageBreak)].map((items, index) => `<div class="element-grid" role="group" aria-label="第 ${index + 1} 页">${items.map(([key, label]) => `<button type="button" data-add="${key}"><span class="editor-menu-icon"><img src="assets/editor-menu/${key}.svg?v=1.0.2" alt="" aria-hidden="true" draggable="false" width="26" height="26"></span>${label}</button>`).join('')}</div>`).join('')}</div><div class="editor-menu-dots" aria-label="菜单分页">${[0,1].map(index => `<button type="button" data-page-index="${index}" aria-label="第 ${index + 1} 页菜单" aria-current="${index === 0}"></button>`).join('')}</div>`;
  const viewport = menu.querySelector('.editor-menu-viewport');
  const menuPagination = esprintPageIndicator.mount(menu.querySelector('.editor-menu-dots'), { buttonSelector: '[data-page-index]' });
  const snapshot = () => JSON.stringify({ items: state.items, selected: state.selected, textDefaultFont: state.textDefaultFont });
  function commit(change) {
    state.undo.push(snapshot()); state.redo = [];
    change(); render();
  }
  const selected = () => state.items.find(item => item.id === state.selected);
  function renderToolbar() {
    const item = selected();
    const editing = window.esprintText?.isEditing() || (window.esprintElements?.isEditing() || window.esprintData?.isEditing());
    floating.querySelectorAll('button').forEach(button => button.disabled = !!editing);
    actions.querySelectorAll('button').forEach(button=>button.disabled=!!editing);
    const labelSettings=screen.querySelector('.editor-label-settings');
    if(labelSettings)labelSettings.disabled=!!editing;
    const tools = ['clear', item?.locked ? 'unlock' : 'lock', 'copy', 'rotate', 'undo', 'redo'];
    const labels = { clear: item ? '删除' : '清空', lock:'锁定', unlock:'解锁', copy:'复制', rotate:'旋转元素', undo:'撤销', redo:'重做' };
    const disabled = key => {
      if (window.esprintText?.isEditing() || (window.esprintElements?.isEditing() || window.esprintData?.isEditing())) return true;
      if (key === 'clear') return !state.items.length;
      if (key === 'undo' || key === 'redo') return !state[key].length;
      if (!item) return true;
      if (key === 'lock' || key === 'unlock') return false;
      if (item.locked) return true;
      if (key === 'rotate') return item.kind === 'table';
      return false;
    };
    toolbar.innerHTML = tools.map(key => `${key === 'undo' ? '<span class="tool-divider" aria-hidden="true"></span>' : ''}<button type="button" data-tool="${key}" title="${labels[key]}" aria-label="${labels[key]}" ${key === 'unlock' ? 'aria-pressed="true"' : ''} ${disabled(key) ? 'disabled' : ''}>${glyph(key)}</button>`).join('');
    toolbar.setAttribute('aria-label', '编辑工具');
  }
  function render() {
    paper.innerHTML = '';
    state.items.forEach(item => {
      const element = document.createElement('div');
      element.className = `editor-object${item.id === state.selected ? ' is-selected' : ''}${item.locked ? ' is-locked' : ''}`;
      element.dataset.id = item.id; element.dataset.kind = item.kind;
      element.style.cssText = `left:${item.x}%;top:${item.y}%;width:${item.w}%;height:${item.h}%;transform:rotate(${item.rotation || 0}deg)`;
      if (item.text) element.textContent = item.text;
      else if (item.src) { const image = document.createElement('img'); image.src = item.src; image.alt = '添加的图片'; element.append(image); }
      else if (!['border','shape','table'].includes(item.kind)) element.innerHTML = glyph(item.kind);
      element.addEventListener('click', event => {
        event.stopPropagation();
        if (viewDragged || window.esprintText?.consumeClick() || window.esprintElements?.consumeClick()) return;
        const wasSelected = state.selected === item.id;
        state.selected = item.id; render();
        if (wasSelected && item.kind === 'text' && !item.locked) editText(item);
        if (wasSelected && ['barcode', 'qr'].includes(item.kind) && !item.locked) window.esprintElements?.openCodeInput(item);
      });
      element.addEventListener('dblclick', event => {
        event.stopPropagation();
        if (item.kind === 'text' && !item.locked) editText(item);
      });
      paper.append(element);
    });
    renderToolbar();
    window.esprintText?.refresh();
    window.esprintElements?.refresh();
    window.esprintData?.refresh();
    window.esprintEditorChrome?.syncSelectors();
  }
  function updateView() {
    if (!workspace.clientWidth || !workspace.clientHeight) return;
    // Fit against the base menu, independently of which property panel is open.
    // Changing the dock or raising the keyboard must not resize or move the paper.
    const panelHeight=parseFloat(getComputedStyle(screen).getPropertyValue('--editor-panel-height'))||237;
    const bottomInset=parseFloat(getComputedStyle(dock).paddingBottom)||0;
    const availableHeight=screen.querySelector('.editor').clientHeight-screen.querySelector('.topbar').offsetHeight-toolbarRow.offsetHeight-panelHeight-bottomInset;
    const maximumWidth=Math.max(1,workspace.clientWidth-60),maximumHeight=Math.max(1,availableHeight-60);
    const base=Math.min(maximumWidth/state.width,maximumHeight/state.height);
    paper.style.top=(30+Math.max(0,(maximumHeight-state.height*base)/2))+'px';
    paper.style.setProperty('--paper-width', `${state.width * base}px`);
    paper.style.setProperty('--paper-height', `${state.height * base}px`);
    paper.style.transform = `translate(calc(-50% + ${state.x}px), ${state.y}px) scale(${state.zoom})`;
    paper.classList.toggle('ellipse-paper', typeof labelShape !== 'undefined' && labelShape === 'ellipse');
    paper.setAttribute('aria-label', `${state.width} × ${state.height} mm 标签画布`);
    zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    workspace.querySelector('.editor-ruler-x').innerHTML = Array.from({length: 9}, (_, i) => `<span>${Number((state.width * i / 8).toFixed(1))}</span>`).join('');
    workspace.querySelector('.editor-ruler-y').innerHTML = Array.from({length: 6}, (_, i) => `<span>${Number((state.height * i / 5).toFixed(1))}</span>`).join('');
    window.esprintText?.refreshTypography();
    window.esprintElements?.viewChanged();
    window.esprintData?.refresh();
  }
  function resetView() { state.zoom = 1; state.x = 0; state.y = 0; updateView(); }
  function syncDimensions() {
    const value = dimensions.dataset.originalDimension || dimensions.textContent;
    if (value !== dimensionKey) {
      dimensionKey = value;
      const match = value.match(/([\d.]+)\s*×\s*([\d.]+)/);
      if (match && +match[1] > 0 && +match[2] > 0) { state.width = +match[1]; state.height = +match[2]; resetView(); }
    }
    updateView();
  }
  toolbar.addEventListener('click', event => {
    const key = event.target.closest('[data-tool]')?.dataset.tool;
    if (!key || event.target.closest('button').disabled) return;
    if (['undo','redo'].includes(key)) {
      const source = state[key], target = state[key === 'undo' ? 'redo' : 'undo'];
      if (!source.length) return;
      target.push(snapshot()); Object.assign(state, JSON.parse(source.pop())); render(); return;
    }
    const item = selected();
    commit(() => {
      if (key === 'clear') { state.items = item ? state.items.filter(value => value.id !== item.id) : []; state.selected = null; }
      if (key === 'lock' || key === 'unlock') item.locked = key === 'lock';
      if (key === 'copy') { const clone = { ...structuredClone(item), id: `element-${nextId++}`, x: Math.min(80, item.x + 3), y: Math.min(80, item.y + 4) }; state.items.push(clone); state.selected = clone.id; }
      if (key === 'rotate') item.rotation = ((item.rotation || 0) + 90) % 360;
    });
  });
  floating.querySelector('[data-view="reset"]').onclick = resetView;
  floating.querySelector('[data-view="rotate"]').onclick = () => {
    [state.width, state.height] = [state.height, state.width];
    dimensions.dataset.originalDimension = `${state.width} × ${state.height} mm`;
    dimensionKey = dimensions.dataset.originalDimension;
    dimensions.textContent = typeof preferences !== 'undefined' && preferences.unit === 'inch' ? `${Number((state.width / 25.4).toFixed(3))} × ${Number((state.height / 25.4).toFixed(3))} inch` : dimensionKey;
    if (typeof newPhysicalSize !== 'undefined') { newPhysicalSize[0] = state.width; newPhysicalSize[1] = state.height; }
    resetView();
  };
  function editText(item) {
    if (window.esprintText) { window.esprintText.openInput(item); return; }
    showModal('confirm', item ? '编辑文本' : '添加文本', '');
    const input = document.createElement('textarea');
    input.className = 'editor-text-input'; input.placeholder = '输入标签文字'; input.value = item?.text || '';
    input.setAttribute('aria-label', '标签文字');
    document.getElementById('modalText').replaceChildren(input);
    const buttons = document.getElementById('modalActions').querySelectorAll('button');
    buttons[1].onclick = () => {
      const value = input.value.trim();
      if (!value) { input.focus(); return; }
      if (item) commit(() => item.text = value); else addItem('text', value);
      closeModal();
    };
    input.focus();
  }
  function addItem(kind, text, src) {
    commit(() => {
      const item = { id: `element-${nextId++}`, kind, x: 27, y: 25, w: 28, h: 48, rotation: 0, text, src };
      if (text) { item.w = 55; item.x = 20; item.h = 30; item.y = 35; }
      state.items.push(item); state.selected = item.id;
    });
  }
  menu.addEventListener('click', event => {
    if (menuDragged) return;
    const key = event.target.closest('[data-add]')?.dataset.add;
    if (!key) return;
    if (window.esprintData?.addFromMenu(key)) return;
    if (window.esprintElements?.addFromMenu(key)) return;
    if (key === 'text') { editText(); return; }
    if (key === 'image') {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = () => addItem('image', null, reader.result); reader.readAsDataURL(file);
      };
      input.click(); return;
    }
    if (key === 'scan') { window.esprintScan?.open('editor'); return; }
    addItem(key, key === 'time' ? new Date().toLocaleDateString('zh-CN') : key === 'serial' ? '000001' : null);
  });
  function markPage() {
    const progress = viewport.scrollLeft / (viewport.clientWidth || 1);
    page = Math.max(0, Math.min(1, Math.round(progress)));
    menuPagination.update(progress);
    menu.querySelectorAll('[data-page-index]').forEach(button => button.setAttribute('aria-current', String(+button.dataset.pageIndex === page)));
    menu.querySelectorAll('.element-grid').forEach((grid, index) => grid.inert = index !== page);
  }
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function showPage(index) { viewport.scrollTo({ left: Math.max(0, Math.min(1, index)) * viewport.clientWidth, behavior: reducedMotion() ? 'instant' : 'smooth' }); }
  menu.querySelector('.editor-menu-dots').onclick = event => { const button = event.target.closest('[data-page-index]'); if (button) showPage(+button.dataset.pageIndex); };
  viewport.addEventListener('scroll', markPage, { passive: true });
  viewport.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); showPage(page + (event.key === 'ArrowRight' ? 1 : -1)); } });
  let menuGesture = null, menuDragged = false;
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    menuDragged = false; menuGesture = { id: event.pointerId, x: event.clientX, left: viewport.scrollLeft };
  });
  viewport.addEventListener('pointermove', event => {
    if (!menuGesture || menuGesture.id !== event.pointerId) return;
    const distance = event.clientX - menuGesture.x;
    if (Math.abs(distance) > 5) { menuDragged = true; viewport.setPointerCapture(event.pointerId); viewport.style.scrollSnapType = 'none'; viewport.scrollLeft = menuGesture.left - distance; }
  });
  function endMenu(event) {
    if (!menuGesture || menuGesture.id !== event.pointerId) return;
    const direction = viewport.scrollLeft - menuGesture.left;
    const index = Math.abs(direction) > 40 ? Math.round(menuGesture.left / viewport.clientWidth) + Math.sign(direction) : Math.round(viewport.scrollLeft / viewport.clientWidth);
    menuGesture = null; viewport.style.scrollSnapType = ''; showPage(index);
    setTimeout(() => { menuDragged = false; }, 0);
  }
  viewport.addEventListener('pointerup', endMenu); viewport.addEventListener('pointercancel', endMenu);
  const pointers = new Map();
  let pan = null, pinch = null, viewDragged = false;
  workspace.addEventListener('pointerdown', event => {
    if (event.target.closest('.float-tools') || event.button > 0) return;
    viewDragged = false; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pan = { clientX: event.clientX, clientY: event.clientY, x: state.x, y: state.y };
    if (pointers.size === 2) {
      const [a,b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x-b.x, a.y-b.y), zoom: state.zoom };
      workspace.setPointerCapture(event.pointerId);
    }
  });
  workspace.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && pinch) {
      const [a,b] = [...pointers.values()];
      state.zoom = Math.max(.5, Math.min(5, pinch.zoom * Math.hypot(a.x-b.x, a.y-b.y) / Math.max(1, pinch.distance))); viewDragged = true;
    } else if (pan) {
      const dx = event.clientX - pan.clientX, dy = event.clientY - pan.clientY;
      if (Math.hypot(dx,dy) < 5 && !viewDragged) return;
      viewDragged = true; state.x = pan.x + dx; state.y = pan.y + dy;
      workspace.setPointerCapture(event.pointerId); workspace.classList.add('is-panning');
    }
    updateView();
  });
  function endView(event) {
    pointers.delete(event.pointerId); pinch = null; pan = null;
    workspace.classList.remove('is-panning');
    if (!pointers.size) setTimeout(() => { viewDragged = false; }, 0);
  }
  workspace.addEventListener('pointerup', endView); workspace.addEventListener('pointercancel', endView);
  workspace.addEventListener('click', event => {
    if (window.esprintText?.consumeClick() || window.esprintElements?.consumeClick()) return;
    if (!event.target.closest('.editor-object, .float-tools') && !viewDragged) { clearSelection(); }
  });
  workspace.addEventListener('wheel', event => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) state.zoom = Math.max(.5, Math.min(5, state.zoom * Math.exp(-event.deltaY * .007)));
    else { state.x -= event.deltaX; state.y -= event.deltaY; }
    updateView();
  }, { passive: false });
  new ResizeObserver(() => { syncDimensions(); viewport.scrollLeft = page * viewport.clientWidth; }).observe(workspace);
  new MutationObserver(syncDimensions).observe(dimensions, { childList: true, attributes: true, characterData: true, subtree: true });
  new MutationObserver(() => { if (screen.classList.contains('active')) requestAnimationFrame(syncDimensions); }).observe(screen, { attributes: true, attributeFilter: ['class'] });
  function clearSelection() { window.esprintData?.dismiss(); window.esprintElements?.dismissPanel(); state.selected = null; render(); }
  window.esprintEditor = {
    state, screen, toolbar, workspace, paper, dock, menu, actions, glyph, selected, commit, render, renderToolbar, updateView,
    applyDimensions(width,height) { dimensions.dataset.originalDimension=`${width} × ${height} mm`;dimensions.textContent=typeof displayDimension==='function'?`${displayDimension(width)} × ${displayDimension(height)} ${preferences.unit}`:dimensions.dataset.originalDimension;syncDimensions();render(); },
    select(id) { state.selected = id; render(); },
    clearSelection,
    previewMarkup(index=0) { return window.esprintText?.previewMarkup(index) || ''; }
  };
  render(); syncDimensions(); markPage();
})();
