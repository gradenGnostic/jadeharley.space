(() => {
  'use strict';
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const autoBtn = document.getElementById('autoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const labelsBtn = document.getElementById('labelsBtn');

  const JADE = '#4ac925', JADE2 = '#9cff7e';
  let W=0,H=0,DPR=1,t=0;
  let yaw = -0.55;
  let pitch = 0.88;
  let zoom = 1;
  let autoRotate = true;
  let showLabels = true;
  let dragging = false;
  let lastX=0,lastY=0;
  let selectedId = 'skaia';
  const clickables = [];
  const particles = [];
  const planetImages = {};

  const stars = Array.from({length:260},()=>({
    x:Math.random(), y:Math.random(), s:Math.random()*1.8+.35, p:Math.random()*9
  }));

  const bodies = [
    {id:'skaia', name:'Skaia', role:'Center / Battlefield', player:'central body', color:'#8cd7ff', radius:56, imageScale:2.25, orbit:0, theta:0, y:0, image:'Omgitsskaia.webp', desc:'The center of this model. Skaia surrounds the Battlefield and acts as the visual heart of the Incipisphere.'},
    {id:'prospit', name:'Prospit', role:'golden moon-kingdom', player:'dream moon', color:'#f7d66a', radius:18, imageScale:2.65, orbit:105, theta:.38, y:9, image:'ProspitMain.png', desc:'Placed close to Skaia. In the Medium layout, Prospit orbits near the clouds of Skaia rather than sitting with the outer Lands.'},
    {id:'lowas', name:'LOWAS', role:'Land of Wind and Shade', player:'John', color:'#78d2ff', radius:27, imageScale:2.7, orbit:188, theta:1.50, y:-8, image:'LOWAS_default.webp', desc:'John Egbert\'s Land, orbiting through the Medium around Skaia.'},
    {id:'lolar', name:'LOLAR', role:'Land of Light and Rain', player:'Rose', color:'#ff8ef6', radius:27, imageScale:2.7, orbit:242, theta:3.15, y:10, image:'Rosesland.webp', desc:'Rose Lalonde\'s Land, positioned among the beta kids\' Lands in the Medium.'},
    {id:'lohac', name:'LOHAC', role:'Land of Heat and Clockwork', player:'Dave', color:'#ff9d4a', radius:28, imageScale:2.7, orbit:295, theta:5.18, y:-12, image:'LOHAC_no_mesa.webp', desc:'Dave Strider\'s Land, positioned in the outer Medium orbit.'},
    {id:'lofaf', name:'LOFAF', role:'Land of Frost and Frogs', player:'Jade', color:'#aeefff', radius:30, imageScale:2.7, orbit:346, theta:4.20, y:13, image:'Defrosted_Frost_and_Frogs.webp', desc:'Jade Harley\'s Land, set along the outer path of the Medium.'},
    {id:'derse', name:'Derse', role:'purple moon-kingdom', player:'far side beyond the Veil', color:'#b48cff', radius:20, imageScale:2.9, orbit:430, theta:.92, y:-4, image:'DerseHSBC.webp', desc:'Placed past the Veil ring, farther from Skaia than the main Lands.'}
  ];

  bodies.forEach(body=>{
    const img = new Image();
    img.src = body.image;
    planetImages[body.id] = img;
  });

  function resize(){
    DPR=Math.max(1,Math.min(2,devicePixelRatio||1));
    W=innerWidth; H=innerHeight-92;
    if(innerWidth<850) H=innerHeight-150;
    canvas.width=Math.floor(W*DPR); canvas.height=Math.floor(H*DPR);
    canvas.style.width='100%'; canvas.style.height='100%';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  addEventListener('resize', resize); resize();

  autoBtn.onclick=()=>{autoRotate=!autoRotate;autoBtn.classList.toggle('active',autoRotate);};
  labelsBtn.onclick=()=>{showLabels=!showLabels;labelsBtn.classList.toggle('active',showLabels);};
  resetBtn.onclick=()=>{yaw=-0.55; pitch=0.88; zoom=1;};

  function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)}}
  canvas.addEventListener('pointerdown',e=>{const p=pos(e);dragging=true;lastX=p.x;lastY=p.y;canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');autoRotate=false;autoBtn.classList.remove('active');});
  canvas.addEventListener('pointermove',e=>{
    if(!dragging) return;
    const p=pos(e), dx=p.x-lastX, dy=p.y-lastY;
    lastX=p.x; lastY=p.y;
    yaw += dx * 0.008;
    pitch = clamp(pitch + dy * 0.006, 0.24, 1.34);
  });
  canvas.addEventListener('pointerup',e=>{dragging=false;canvas.classList.remove('dragging');try{canvas.releasePointerCapture(e.pointerId)}catch(_){}});
  canvas.addEventListener('pointercancel',()=>{dragging=false;canvas.classList.remove('dragging')});
  canvas.addEventListener('click',e=>{
    const p=pos(e);
    for(let i=clickables.length-1;i>=0;i--){
      const c=clickables[i];
      const dx=p.x-c.x, dy=p.y-c.y;
      if(dx*dx+dy*dy <= c.r*c.r){selectedId=c.id;drawHud();sparkle(c.x,c.y,c.color,28);return;}
    }
  });
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom + (e.deltaY<0?.08:-.08), .62, 1.52);},{passive:false});

  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function selected(){return bodies.find(b=>b.id===selectedId)||bodies[0];}
  function drawHud(){
    const b=selected();
    hud.innerHTML = `<b>${b.name}</b><br>${b.role}<br><span class="green">${b.player}</span><br><br>${b.desc}<br><br><span class="gold">view:</span> yaw ${(yaw*180/Math.PI|0)}deg · tilt ${(pitch*180/Math.PI|0)}deg · zoom ${zoom.toFixed(2)}x`;
  }

  function clear(){ctx.clearRect(0,0,W,H);}
  function text(s,x,y,size=14,color=JADE2,align='left'){
    ctx.font=`${size}px Courier New, monospace`;
    ctx.fillStyle=color; ctx.textAlign=align; ctx.fillText(s,x,y); ctx.textAlign='left';
  }
  function drawStars(){
    for(const s of stars){
      const x=(s.x*W + Math.sin(t*.00018+s.p)*12)%W;
      const y=(s.y*H + t*.002*s.s)%H;
      const a=.22+.65*Math.sin(t*.003+s.p)**2;
      ctx.globalAlpha=a; ctx.fillStyle=s.s>1.65?'#d7ffd0':JADE2;
      ctx.fillRect(x,y,s.s,s.s);
    }
    ctx.globalAlpha=1;
  }
  function line(x1,y1,x2,y2,color=JADE,a=.5,w=1){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  function circle(x,y,r,fill,stroke=JADE,a=1){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=a;ctx.strokeStyle=stroke;ctx.stroke();ctx.restore();}
  function box(x,y,w,h,color=JADE,alpha=.12){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.globalAlpha=.65;ctx.strokeStyle=color;ctx.strokeRect(x+.5,y+.5,w-1,h-1);ctx.restore();}
  function drawPlanetImage(b,p,r){
    const img = planetImages[b.id];
    if(!img || !img.complete || !img.naturalWidth) return false;
    const maxSide = r * (b.imageScale || 2.6);
    const aspect = img.naturalWidth / img.naturalHeight;
    const w = aspect >= 1 ? maxSide : maxSide * aspect;
    const h = aspect >= 1 ? maxSide / aspect : maxSide;
    ctx.save();
    ctx.shadowColor = b.color;
    ctx.shadowBlur = b.id === selectedId ? 24 : 12;
    ctx.drawImage(img,p.x-w/2,p.y-h/2,w,h);
    ctx.restore();
    return true;
  }

  function worldPoint(orbit, theta, yOffset=0){
    const r=orbit*zoom;
    const x=Math.cos(theta)*r;
    const z=Math.sin(theta)*r;
    const y=yOffset*zoom;
    return project(x,y,z);
  }
  function project(x,y,z){
    const cy=Math.cos(yaw), sy=Math.sin(yaw);
    const x1=x*cy - z*sy;
    const z1=x*sy + z*cy;
    const cp=Math.cos(pitch), sp=Math.sin(pitch);
    const y1=y*cp - z1*sp;
    const z2=y*sp + z1*cp;
    const perspective=720/(720+z2);
    return {x:W*.53 + x1*perspective, y:H*.54 + y1*perspective, z:z2, scale:perspective};
  }
  function ringPoints(orbit, n=160){
    const pts=[];
    for(let i=0;i<=n;i++) pts.push(worldPoint(orbit, i/n*Math.PI*2, 0));
    return pts;
  }
  function drawRing(orbit, color, alpha=.24, width=1){
    const pts=ringPoints(orbit);
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.beginPath();
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();ctx.restore();
  }
  function drawVeil(){
    drawRing(388,'#d7ffd0',.33,1.2);
    const pts=[];
    for(let i=0;i<96;i++) pts.push(worldPoint(388, i/96*Math.PI*2, 0));
    pts.forEach((p,i)=>{if(i%3===0)circle(p.x,p.y,2.2*p.scale,'#d7ffd0','#d7ffd0',.45)});
    const label=worldPoint(388,.1,0); text('THE VEIL',label.x+14,label.y-8,12,'rgba(215,255,208,.78)');
  }
  function drawSkaia(p){
    const r=56*zoom*p.scale;
    if(drawPlanetImage(bodies[0],p,r)){
      if(showLabels) text('SKAIA',p.x,p.y+r*.72,14*clamp(p.scale,.7,1.2),'#e8ffff','center');
      return;
    }
    ctx.save();ctx.translate(p.x,p.y);
    ctx.strokeStyle='rgba(140,215,255,.88)';ctx.lineWidth=1.4;
    for(let i=0;i<8;i++){ctx.rotate(Math.PI/8);ctx.beginPath();ctx.ellipse(0,0,r,r*.42,0,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='rgba(140,215,255,.25)';ctx.beginPath();ctx.arc(0,0,r*.55,0,Math.PI*2);ctx.fill();
    ctx.restore();
    circle(p.x,p.y,r*.42,'rgba(140,215,255,.23)','rgba(232,255,255,.9)',1);
    text('SKAIA',p.x,p.y+5,14*clamp(p.scale,.7,1.2),'#e8ffff','center');
  }
  function drawBody(b, p){
    if(b.id==='skaia'){drawSkaia(p);return;}
    const selected = b.id===selectedId;
    const r=b.radius*zoom*p.scale;
    if(selected) circle(p.x,p.y,r*1.45,'rgba(255,255,255,.08)','#fff',.95);
    if(!drawPlanetImage(b,p,r)){
      circle(p.x,p.y,r,b.color,selected?'#fff':'rgba(74,201,37,.9)',1);
      if(b.id==='prospit'){
        ctx.strokeStyle='#fff5b6';ctx.beginPath();ctx.arc(p.x,p.y,r+7*p.scale,0,Math.PI*2);ctx.stroke();
      }
      if(b.id==='derse'){
        line(p.x-r,p.y,p.x+r,p.y,'#261045',.7,1.2);
      }
      if(b.id==='lowas'){
        ctx.save();ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=1;
        for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,r-5*p.scale-i*4*p.scale,Math.PI*.08,Math.PI*1.35);ctx.stroke();}
        ctx.restore();
      }
      if(b.id==='lolar'){
        ctx.save();ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=1;
        for(let i=-1;i<2;i++){ctx.beginPath();ctx.moveTo(p.x-r,p.y+i*9*p.scale);ctx.bezierCurveTo(p.x-8*p.scale,p.y-20*p.scale+i*5,p.x+8*p.scale,p.y+20*p.scale-i*5,p.x+r,p.y+i*9*p.scale);ctx.stroke();}
        ctx.restore();
      }
      if(b.id==='lohac'){
        for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.00028;line(p.x,p.y,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,'#4b1800',.55,1);}
      }
      if(b.id==='lofaf'){
        ctx.save();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.ellipse(p.x,p.y,r*.9,r*.28,.35,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(74,201,37,.48)';ctx.fillRect(p.x-8*p.scale,p.y+4*p.scale,17*p.scale,7*p.scale);ctx.restore();
      }
    }
    if(showLabels){
      const labelSize=12*clamp(p.scale,.72,1.25);
      text(b.name,p.x,p.y-r-12,labelSize,'#fff','center');
      if(b.player && !['prospit','derse'].includes(b.id)) text(b.player,p.x,p.y+r+22,labelSize*.86,JADE2,'center');
    }
  }
  function sparkle(x,y,color=JADE2,n=18){
    for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*3.2,vy:(Math.random()-.5)*3.2,life:35+Math.random()*35,color});
  }
  function drawParticles(){
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;ctx.globalAlpha=Math.max(0,p.life/60);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);ctx.globalAlpha=1;if(p.life<=0)particles.splice(i,1);}
  }
  function drawMiniAxis(){
    const ox=W-145, oy=H-64;
    box(ox-34,oy-34,118,60,JADE,.08);
    const center={x:ox,y:oy};
    const right=project(55,0,0), up=project(0,-55,0), front=project(0,0,55);
    const c=project(0,0,0);
    line(center.x,center.y,center.x+(right.x-c.x)*.65,center.y+(right.y-c.y)*.65,'#78d2ff',.8,2);
    line(center.x,center.y,center.x+(up.x-c.x)*.65,center.y+(up.y-c.y)*.65,'#9cff7e',.8,2);
    line(center.x,center.y,center.x+(front.x-c.x)*.65,center.y+(front.y-c.y)*.65,'#f7d66a',.8,2);
    text('2.5D',ox+45,oy+5,11,'#d7ffd0','center');
  }
  function drawMap(){
    clear(); drawStars(); clickables.length=0;
    if(autoRotate) yaw += 0.0014;
    drawRing(105,'#f7d66a',.20,1);
    drawRing(188,JADE,.18,1);
    drawRing(242,JADE,.18,1);
    drawRing(295,JADE,.18,1);
    drawRing(346,JADE,.18,1);
    drawVeil();
    drawRing(430,'#b48cff',.20,1);

    ['lowas','lolar','lohac','lofaf'].forEach(id=>{
      const b=bodies.find(x=>x.id===id);
      for(let g=1;g<=7;g++){
        const p=worldPoint(62+g*(b.orbit-70)/8,b.theta,0);
        circle(p.x,p.y,2.2*p.scale,'#d7ffd0','#d7ffd0',.36);
      }
    });

    const projected = bodies.map(b=>({b, p:worldPoint(b.orbit,b.theta,b.y)}));
    projected.sort((a,b)=>b.p.z-a.p.z);
    projected.forEach(({b,p})=>{
      drawBody(b,p);
      const r=(b.id==='skaia'?62:b.radius+14)*(b.imageScale || 1.4)*.55*zoom*p.scale;
      clickables.push({id:b.id,x:p.x,y:p.y,r,color:b.color,z:p.z});
    });
    clickables.sort((a,b)=>b.z-a.z);

    drawMiniAxis();
    drawParticles();
    drawHud();
  }
  function loop(){t=performance.now();drawMap();requestAnimationFrame(loop);}
  drawHud(); loop();
})();
