/* The last saved two-axis offset is shared by PDF and label printing. */
const printOffsetStorageKey='esprint.prototype.print-offset.v35';
const storedPrintOffset=readPrototypeValue(printOffsetStorageKey,{});
const lastPrintOffset={x:validPrintOffset(storedPrintOffset?.x),y:validPrintOffset(storedPrintOffset?.y)};
let printOffsetDraft={...lastPrintOffset};
function validPrintOffset(value){return Number.isFinite(value)?Math.max(-10,Math.min(10,Math.round(value*2)/2)):0}
function formatPrintOffset(offset){return `X ${offset.x} · Y ${offset.y} mm`}
phoneEl.insertAdjacentHTML('beforeend',`<section id="print-offset" class="screen print-offset-screen"><header class="topbar"><button class="back" aria-label="取消偏移设置" onclick="go('preview')">${svg('back')}</button><h1>偏移设置</h1><button class="top-action print-offset-save" onclick="savePrintOffset()">保存</button></header><div class="print-offset-content"><div class="print-offset-stage"><div class="print-offset-paper" role="img" aria-label="偏移预览，未设置偏移"><div class="print-offset-printable"></div></div></div><div class="print-offset-readout"><b id="print-offset-coordinates">X 0 · Y 0 mm</b><button onclick="resetPrintOffset()">恢复默认</button></div><div class="print-offset-pad" aria-label="调整打印偏移，每次 0.5 毫米"><button class="offset-up" aria-label="向上移动 0.5 毫米" onclick="adjustPrintOffset(0,-.5)">${svg('printDirection')}</button><button class="offset-left" aria-label="向左移动 0.5 毫米" onclick="adjustPrintOffset(-.5,0)">${svg('printDirection')}</button><span class="print-offset-center" aria-hidden="true"><i></i></span><button class="offset-right" aria-label="向右移动 0.5 毫米" onclick="adjustPrintOffset(.5,0)">${svg('printDirection')}</button><button class="offset-down" aria-label="向下移动 0.5 毫米" onclick="adjustPrintOffset(0,.5)">${svg('printDirection')}</button></div></div></section>`);
pages.push(['print-offset','偏移设置']);
function renderPrintOffset(){printOffsetDraft={...lastPrintOffset};syncPrintOffset();fitPrintOffsetPaper()}
function adjustPrintOffset(x,y){printOffsetDraft={x:validPrintOffset(printOffsetDraft.x+x),y:validPrintOffset(printOffsetDraft.y+y)};syncPrintOffset()}
function resetPrintOffset(){printOffsetDraft={x:0,y:0};syncPrintOffset()}
function syncPrintOffset(){
 document.getElementById('print-offset-coordinates').textContent=formatPrintOffset(printOffsetDraft);
 const paper=document.querySelector('.print-offset-paper'),size=printPreviewPhysicalSize();
 paper.style.setProperty('--offset-x',printOffsetDraft.x/size[0]*paper.clientWidth+'px');paper.style.setProperty('--offset-y',printOffsetDraft.y/size[1]*paper.clientHeight+'px');
 const edges=[];if(printOffsetDraft.y>0)edges.push('上边');if(printOffsetDraft.y<0)edges.push('下边');if(printOffsetDraft.x<0)edges.push('右边');if(printOffsetDraft.x>0)edges.push('左边');
 paper.setAttribute('aria-label',edges.length?'偏移预览，'+edges.join('和')+'显示阴影':'偏移预览，未设置偏移');
}
function fitPrintOffsetPaper(){
 const stage=document.querySelector('.print-offset-stage');if(!stage.clientWidth||!stage.clientHeight)return;
 const [width,height]=printPreviewPhysicalSize(),scale=Math.min((stage.clientWidth-44)/width,(stage.clientHeight-36)/height),paper=document.querySelector('.print-offset-paper');
 paper.style.width=width*scale+'px';paper.style.height=height*scale+'px';syncPrintOffset();
}
function savePrintOffset(){Object.assign(lastPrintOffset,printOffsetDraft);savePrototypeValue(printOffsetStorageKey,lastPrintOffset);go('preview')}
new ResizeObserver(()=>fitPrintOffsetPaper()).observe(document.querySelector('.print-offset-stage'));
document.addEventListener('keydown',event=>{
 if(document.querySelector('.screen.active')?.id!=='print-offset')return;
 const moves={ArrowUp:[0,-.5],ArrowDown:[0,.5],ArrowLeft:[-.5,0],ArrowRight:[.5,0]};
 if(moves[event.key]){event.preventDefault();adjustPrintOffset(...moves[event.key])}
 if(event.key==='Escape'){event.preventDefault();go('preview')}
});
