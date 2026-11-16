/* Rulers and alignment aids share the paper's physical coordinate system. */
(() => {
  const editor=window.esprintEditor;if(!editor)return;
  const {state,paper,workspace}=editor;
  const ns='http://www.w3.org/2000/svg';
  const layer=document.createElementNS(ns,'svg');layer.classList.add('editor-guide-layer');layer.setAttribute('aria-hidden','true');workspace.append(layer);
  const horizontal=workspace.querySelector('.editor-ruler-x'),vertical=workspace.querySelector('.editor-ruler-y');
  let preview=null;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function metrics(){
    const r=paper.getBoundingClientRect(),w=workspace.getBoundingClientRect();
    return {x:r.x-w.x,y:r.y-w.y,px:r.width/state.width,py:r.height/state.height,width:w.width,height:w.height};
  }
  function rect(item){
    const element=paper.querySelector(`[data-id="${item.id}"]`);
    const w=item.w/100*state.width;
    const h=['text','time','serial'].includes(item.kind)&&element?element.offsetHeight/Math.max(1,paper.clientHeight)*state.height:item.h/100*state.height;
    const cx=item.x/100*state.width+w/2,cy=item.y/100*state.height+h/2;
    const angle=(item.rotation||0)*Math.PI/180;
    const width=Math.abs(w*Math.cos(angle))+Math.abs(h*Math.sin(angle)),height=Math.abs(h*Math.cos(angle))+Math.abs(w*Math.sin(angle));
    return {left:cx-width/2,right:cx+width/2,top:cy-height/2,bottom:cy+height/2,cx,cy,width,height,w,h};
  }
  function tickStep(scale){
    const desired=7/Math.max(.001,scale),base=10**Math.floor(Math.log10(desired));
    return [1,2,5,10].map(n=>n*base).find(n=>n>=desired)||base*10;
  }
  function drawRulers(item=preview||editor.selected()){
    if(!workspace.clientWidth||!paper.clientWidth)return;
    const m=metrics(),inch=typeof preferences!=='undefined'&&preferences.unit==='inch',unit=inch?25.4:1;
    const selected=item?rect(item):null;
    function axis(isX){
      const length=isX?m.width:m.height,origin=isX?m.x:m.y,scale=(isX?m.px:m.py)*unit,step=tickStep(scale);
      const start=Math.floor(-origin/scale/step)-1,end=Math.ceil((length-origin)/scale/step)+1;
      const pieces=[];
      for(let i=start;i<=end&&i-start<500;i++){
        const value=i*step,pos=origin+value*scale;if(pos<0||pos>length)continue;
        const major=i%5===0;
        pieces.push(isX?`<path d="M${pos.toFixed(2)} ${major?15:19}v${major?7:3}"/>`:`<path d="M${major?16:20} ${pos.toFixed(2)}h${major?7:3}"/>`);
        if(major&&value>=-.00001){const label=Number(value.toFixed(inch?3:2));pieces.push(isX?`<text x="${pos}" y="10" text-anchor="middle">${label}</text>`:`<text x="10" y="${pos-3}" text-anchor="middle">${label}</text>`);}
      }
      if(selected){
        const points=isX?[selected.left,selected.right]:[selected.top,selected.bottom];
        for(const v of points){const pos=(isX?m.x:m.y)+v*(isX?m.px:m.py);pieces.push(isX?`<path class="editor-ruler-marker" d="M${pos} 14v9"/>`:`<path class="editor-ruler-marker" d="M15 ${pos}h9"/>`);}
      }
      return `<svg viewBox="0 0 ${isX?`${length} 25`:`25 ${length}`}" width="100%" height="100%" xmlns="${ns}">${pieces.join('')}</svg>`;
    }
    horizontal.innerHTML=axis(true);vertical.innerHTML=axis(false);
  }
  function line(x1,y1,x2,y2,dashed=false){return `<path class="${dashed?'editor-snap-line':'editor-distance-line'}" d="M${x1} ${y1}L${x2} ${y2}"/>`;}
  function distance(x1,y1,x2,y2,value,verticalLine){
    const inch=typeof preferences!=='undefined'&&preferences.unit==='inch';
    const label=(value/(inch?25.4:1)).toFixed(inch?2:1),width=label.length*5.8+7;
    const x=verticalLine?x1+5:(x1+x2)/2-width/2,y=verticalLine?(y1+y2)/2-6:y1-17;
    return line(x1,y1,x2,y2)+`<rect class="editor-distance-label-bg" x="${x}" y="${y}" width="${width}" height="13" rx="3"/><text class="editor-distance-label" x="${x+width/2}" y="${y+9}" text-anchor="middle">${esc(label)}</text>`;
  }
  function drawGuides(item,matches={}){
    const m=metrics(),r=rect(item),parts=[];
    const px=x=>m.x+x*m.px,py=y=>m.y+y*m.py;
    if(matches.x!==undefined)parts.push(line(px(matches.x),25,px(matches.x),m.height,true));
    if(matches.y!==undefined)parts.push(line(25,py(matches.y),m.width,py(matches.y),true));
    const closest={};
    for(const other of state.items){
      if(other.id===item.id)continue;
      const q=rect(other),overlapY=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top),overlapX=Math.min(r.right,q.right)-Math.max(r.left,q.left);
      const add=(key,gap,a,b,c,d,v)=>{if(gap>.001&&(!closest[key]||gap<closest[key].gap))closest[key]={gap,markup:distance(a,b,c,d,gap,v)};};
      if(overlapY>0){const y=py((Math.max(r.top,q.top)+Math.min(r.bottom,q.bottom))/2);add('left',r.left-q.right,px(q.right),y,px(r.left),y,false);add('right',q.left-r.right,px(r.right),y,px(q.left),y,false);}
      if(overlapX>0){const x=px((Math.max(r.left,q.left)+Math.min(r.right,q.right))/2);add('top',r.top-q.bottom,x,py(q.bottom),x,py(r.top),true);add('bottom',q.top-r.bottom,x,py(r.bottom),x,py(q.top),true);}
    }
    layer.setAttribute('viewBox',`0 0 ${m.width} ${m.height}`);
    layer.innerHTML=parts.join('')+Object.values(closest).map(value=>value.markup).join('');
    drawRulers(item);
  }
  function guideMove(item){
    const m=metrics(),r=rect(item),xTargets=[0,state.width/2,state.width],yTargets=[0,state.height/2,state.height];
    state.items.filter(other=>other.id!==item.id).forEach(other=>{const q=rect(other);xTargets.push(q.left,q.cx,q.right);yTargets.push(q.top,q.cy,q.bottom);});
    const find=(values,targets,tolerance)=>{let best=null;for(const v of values)for(const target of targets){const d=target-v;if(Math.abs(d)<=tolerance&&(!best||Math.abs(d)<Math.abs(best.delta)))best={delta:d,target};}return best;};
    const x=find([r.left,r.cx,r.right],xTargets,4/Math.max(.001,m.px)),y=find([r.top,r.cy,r.bottom],yTargets,4/Math.max(.001,m.py)),matches={};
    if(x){item.x+=x.delta/state.width*100;matches.x=x.target;}
    if(y){item.y+=y.delta/state.height*100;matches.y=y.target;}
    preview=item;drawGuides(item,matches);return item;
  }
  function clearGuides(){preview=null;layer.innerHTML='';drawRulers();}
  function resizeFromCorner(item,dx,dy,equal){
    const width=paper.clientWidth,height=paper.clientHeight,oldW=item.w/100*width,oldH=item.h/100*height;
    const rad=(item.rotation||0)*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad),lx=dx*c+dy*s,ly=-dx*s+dy*c;
    const minimum=['qr','barcode'].includes(item.kind)?item.kind==='qr'?34:60:26;
    let w=Math.max(minimum,oldW+lx),h=Math.max(item.kind==='barcode'?24:minimum,oldH+ly);
    if(equal){const min=Math.max(minimum/Math.max(1,oldW),(item.kind==='barcode'?24:minimum)/Math.max(1,oldH));const scale=Math.max(min,(oldW*(oldW+lx)+oldH*(oldH+ly))/Math.max(1,oldW**2+oldH**2));w=oldW*scale;h=oldH*scale;}
    const cx=item.x/100*width+oldW/2,cy=item.y/100*height+oldH/2,anchorX=cx-c*oldW/2+s*oldH/2,anchorY=cy-s*oldW/2-c*oldH/2;
    const newCx=anchorX+c*w/2-s*h/2,newCy=anchorY+s*w/2+c*h/2;
    return {x:(newCx-w/2)/width*100,y:(newCy-h/2)/height*100,w:w/width*100,h:h/height*100};
  }
  window.esprintGeometry={rect,metrics,drawRulers,guideMove,clearGuides,resizeFromCorner};
  new ResizeObserver(()=>drawRulers()).observe(workspace);
  drawRulers();
})();
