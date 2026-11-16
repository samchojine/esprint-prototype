/* Monochrome element rendering. Barcode validation/encoding is delegated to bwip-js. */
(() => {
  const editor=window.esprintEditor;if(!editor)return;
  const {state,paper}=editor;
  const assets=new Map(),images=new Map(),codes=new Map(),processed=new Map();
  const supported=new Set(['image','shape','icon','border','barcode','qr']);
  const barcodeTypes=[['Code128','code128'],['UPC-A','upca'],['UPC-E','upce'],['EAN-13','ean13'],['Code93','code93'],['Code39','code39'],['CodeBar','rationalizedCodabar'],['ITF','interleaved2of5']];
  const qrTypes=[['QR_CODE','qrcode'],['PDF417','pdf417'],['DATA_MATRIX','datamatrix'],['AZTEC','azteccode']];
  const shapeTypes=[['line','横线'],['rectangle','矩形'],['rounded','圆角矩形'],['triangle','等边三角形'],['rightTriangle','直角三角形'],['vertical','竖线'],['diamond','菱形'],['circle','圆形']];
  function svg(content,view='0 0 24 24'){return `<svg viewBox="${view}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;}
  const glyphs={close:'<path d="m6 6 12 12M6 18 18 6"/>',rotate:'<path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"/>',resize:'<path d="M5 15v4h4M19 9V5h-4M5 19l14-14"/>'};
  function settings(item){return {equal:true,ratio:'',mirrorX:false,mirrorY:false,invert:false,thresholdEnabled:false,threshold:127,lineWidth:.5,dashed:false,...item.settings};}
  function code(item){
    const type=item.encoding||(item.kind==='qr'?'QR_CODE':'Code128'),text=String(item.content??'123456').replace(/[\r\n]/g,'');
    if(!text)throw new Error('请输入内容');
    if(item.kind==='barcode'&&/[^\x00-\x7f]/.test(text))throw new Error('Unsupported character: barcode content must be ASCII');
    const bcid=(item.kind==='qr'?qrTypes:barcodeTypes).find(row=>row[0]===type)?.[1];
    if(!bcid)throw new Error('不支持的编码类型');
    const key=JSON.stringify([bcid,text]);if(codes.has(key))return codes.get(key);
    const options={bcid,text,scale:3,paddingwidth:item.kind==='qr'?8:4,paddingheight:item.kind==='qr'?8:2};
    if(item.kind==='barcode')options.height=10;
    const markup=bwipjs.toSVG(options),view=markup.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const result={markup,width:view[2],height:view[3]};
    if(codes.size>100)codes.delete(codes.keys().next().value);codes.set(key,result);return result;
  }
  function codeError(error,item){
    const message=String(error?.message||error),type=item.encoding||'Code128';
    if(message==='请输入内容')return message;
    if(/check.?digit|checksum/i.test(message))return `${type} 校验位不正确，请检查内容`;
    if(['UPC-A','UPC-E','EAN-13'].includes(type))return type==='UPC-A'?'UPC-A 需要 11 位或 12 位数字':type==='UPC-E'?'UPC-E 需要符合规则的 7 位或 8 位数字':'EAN-13 需要 12 位或 13 位数字';
    if(type==='ITF')return 'ITF 内容须为偶数位数字';
    if(type==='CodeBar')return 'CodeBar 使用 A–D 起止符，内部为数字或支持的符号';
    if(/character|latin|ascii|ord|encoding/i.test(message))return `${type} 不支持这些字符，请修改内容`;
    if(/too.?long|capacity|size|length/i.test(message))return '内容长度不适合当前编码，请缩短内容或切换编码';
    return '编码失败，请检查内容与编码类型';
  }
  function shape(item){
    const config=settings(item),w=Math.max(1,item.w/100*paper.clientWidth),h=Math.max(1,item.h/100*paper.clientHeight),stroke=config.lineWidth*paper.clientWidth/state.width;
    const p=Math.min(stroke/2+1,Math.min(w,h)/3),x=p,y=p,right=w-p,bottom=h-p,cx=w/2,cy=h/2;
    const outline={
      line:`<path d="M${x} ${cy}H${right}"/>`,vertical:`<path d="M${cx} ${y}V${bottom}"/>`,
      rectangle:`<rect x="${x}" y="${y}" width="${right-x}" height="${bottom-y}"/>`,
      rounded:`<rect x="${x}" y="${y}" width="${right-x}" height="${bottom-y}" rx="${Math.min(8*25.4/72*paper.clientWidth/state.width,(right-x)/4,(bottom-y)/4)}"/>`,
      triangle:`<path d="M${cx} ${y}L${right} ${bottom}H${x}Z"/>`,rightTriangle:`<path d="M${x} ${y}L${right} ${bottom}H${x}Z"/>`,
      diamond:`<path d="M${cx} ${y}L${right} ${cy}L${cx} ${bottom}L${x} ${cy}Z"/>`,
      circle:`<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(1,w/2-p)}" ry="${Math.max(1,h/2-p)}"/>`
    };
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#17202c" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${config.dashed?`stroke-dasharray="${stroke*3} ${stroke*2}"`:''}>${outline[item.shape||'line']||outline.rectangle}</g></svg>`;
  }
  function loadImage(src){
    if(images.has(src))return images.get(src);
    const promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(src);reject(new Error('图片加载失败'));};image.src=src;});
    images.set(src,promise);return promise;
  }
  async function processImage(item){
    const config=settings(item);if(!config.thresholdEnabled)return item.src;
    const key=item.src+'::'+config.threshold;if(processed.has(key))return processed.get(key);
    const promise=(async()=>{
      const image=await loadImage(item.src),scale=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4){const value=.299*data[i]+.587*data[i+1]+.114*data[i+2]>=config.threshold?255:0;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;}
      context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
    })();
    if(processed.size>24)processed.delete(processed.keys().next().value);processed.set(key,promise);return promise;
  }
  function paint(item,element,handles=true){
    if(!supported.has(item.kind))return;
    const config=settings(item);element.classList.add('editor-graphic');element.style.height=item.h+'%';element.style.padding='0';element.replaceChildren();
    const ink=document.createElement('div');ink.className='element-object-ink';
    ink.style.transform=`scale(${config.mirrorX?-1:1},${config.mirrorY?-1:1})`;
    if(item.kind==='shape')ink.innerHTML=shape(item);
    else if(item.kind==='barcode'||item.kind==='qr'){
      try{
        const encoded=code(item),image=document.createElement('div');image.className='element-code-bars';image.innerHTML=encoded.markup;
        if(item.kind==='barcode')image.querySelector('svg').setAttribute('preserveAspectRatio','none');
        if(item.kind==='barcode'&&item.codeStyle!=='bars'){
          const caption=document.createElement('span');caption.className='element-code-caption';caption.textContent=item.content||'123456';
          caption.style.cssText=`font-size:${(item.codeFont||10)*25.4/72*paper.clientWidth/state.width}px;line-height:1.08;white-space:nowrap;`;
          ink.style.display='flex';ink.style.flexDirection=item.codeStyle==='above'?'column-reverse':'column';ink.append(image,caption);
        }else ink.append(image);
      }catch(error){const message=document.createElement('span');message.className='element-code-error';message.textContent=codeError(error,item);ink.append(message);}
    }else if(item.kind==='image'){
      const image=document.createElement('img');image.alt='标签图片';image.draggable=false;image.src=item.src;ink.append(image);
      if(config.thresholdEnabled)processImage(item).then(src=>{if(image.isConnected)image.src=src;}).catch(()=>{image.alt='图片处理失败，请重试';});
    }else{
      const source=assets.get(item.assetId);
      if(source){ink.innerHTML=source;ink.querySelector('svg').setAttribute('preserveAspectRatio','none');if(config.invert){ink.style.background='#17202c';ink.querySelector('svg').style.filter='brightness(0) invert(1)';}}
      else{const image=document.createElement('img');image.alt=item.assetName||'素材';image.draggable=false;image.src=item.src;ink.append(image);}
    }
    element.append(ink);
    if(handles&&item.id===state.selected){
      [['delete','close','删除元素'],['rotate','rotate','旋转元素'],['resize','resize','调整元素大小']].forEach(([key,icon,label])=>{
        const button=document.createElement('button');button.type='button';button.className='text-object-handle element-object-handle';button.dataset.elementHandle=key;button.setAttribute('aria-label',label);button.innerHTML=svg(glyphs[icon]);button.disabled=!!item.locked&&key!=='delete';element.append(button);
      });
    }
  }
  window.esprintElementRenderer={supported,assets,settings,code,codeError,shape,loadImage,processImage,paint,svg,barcodeTypes,qrTypes,shapeTypes};
})();
