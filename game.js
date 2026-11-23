import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = (s) => document.querySelector(s);
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({canvas:$('#world'),antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
const camera = new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,700);
scene.fog = new THREE.Fog(0xd99a68,95,330);

const horses = [
  {name:'Cinder',breed:'MUSTANG',years:4,color:0x68402f,mane:0x30231e,emoji:'🐎',speed:1.04,stamina:100},
  {name:'Sundance',breed:'PAINT HORSE',years:5,color:0xe9dcc1,mane:0x482b20,emoji:'🐴',speed:.96,stamina:115},
  {name:'Copper',breed:'QUARTER HORSE',years:3,color:0xa65d2e,mane:0x3c241b,emoji:'🐎',speed:1.16,stamina:92}
];
let horseIndex=0, bond=72, spirit=84, stamina=100, coins=240, level=1;
let mode='stable', raceActive=false, raceElapsed=0, nextGate=0, toastTimer=0;
const keys={};
let audioCtx=null,musicOn=false,musicTimer=null;
let worldTime=0;
const horseRoot=new THREE.Group();
scene.add(horseRoot);
let horseRig=null;
const gates=[];
const props=[];

function mat(color,roughness=.9,extra={}){return new THREE.MeshStandardMaterial({color,roughness,...extra});}
function box(parent,w,h,d,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function ball(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,r1,r2,h,material,x,y,z,segments=8){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

function initWorld(){
  scene.background=new THREE.Color(0xd99462);
  const hemi=new THREE.HemisphereLight(0xffe6c6,0x806044,2.1);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffd49a,3.2);sun.position.set(-45,70,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.bias=-.0002;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(700,700),mat(0xc58a56));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
  // Rolling sandy ridges and distant red-rock country.
  for(let i=0;i<16;i++){const x=(i%8)*57-195,z=Math.floor(i/8)*-180-80;const hill=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat(i%2?0xc78652:0xb9784a));hill.position.set(x,-8,z);hill.scale.set(48,17,40);scene.add(hill);}
  for(let i=0;i<11;i++){const x=(i-5)*54-10,z=-205-Math.sin(i*1.6)*26;const rock=new THREE.Mesh(new THREE.CylinderGeometry(11+Math.random()*8,20+Math.random()*14,42+Math.random()*28,5),mat(i%2?0xa35e45:0xb86c4d));rock.position.set(x,18,z);rock.rotation.y=Math.random();scene.add(rock);}
  // sun disk
  const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(8,24,16),new THREE.MeshBasicMaterial({color:0xffe6a3}));sunDisk.position.set(-92,47,-235);scene.add(sunDisk);
  // Distant ranch buildings.
  buildRanch();
  // Scattered cacti, scrub, boulders and tumbleweed.
  for(let i=0;i<55;i++){let x=(Math.random()-.5)*270,z=(Math.random()-.5)*250;if(Math.abs(x)<12&&Math.abs(z)<35)continue;buildCactus(x,z, .7+Math.random()*.8);}
  for(let i=0;i<95;i++){let x=(Math.random()-.5)*240,z=(Math.random()-.5)*210;if(Math.abs(x)<10&&Math.abs(z)<24)continue;buildShrub(x,z);}
  createCourse();
  createHorse();
  horseRoot.position.set(0,0,8);
}
function buildRanch(){
  const wood=mat(0x71412c),woodLight=mat(0x98603c),roof=mat(0x50342b),cream=mat(0xe4c18c);
  const barn=new THREE.Group();barn.position.set(-19,0,-12);scene.add(barn);
  box(barn,15,7,10,wood,0,3.5,0);const roofMesh=new THREE.Mesh(new THREE.ConeGeometry(10.3,4,4),roof);roofMesh.rotation.y=Math.PI/4;roofMesh.scale.set(1,1,.75);roofMesh.position.set(0,9,0);roofMesh.castShadow=true;barn.add(roofMesh);
  box(barn,4.5,4.2,.25,roof,0,2.1,5.08);box(barn,1.3,2.8,.3,woodLight,0,1.4,5.25);box(barn,.08,2.7,.35,cream,0,1.4,5.45);box(barn,3.1,.2,.3,cream,0,3,5.4);
  const sign=box(barn,5.5,1.15,.22,roof,0,6.1,5.1);sign.rotation.z=0; // stable sign
  for(let x=-7;x<=7;x+=14)for(let z=-4;z<=4;z+=8)box(barn,.38,8,.38,woodLight,x,4,z);
  // Corral fence.
  const fence=mat(0xb27b4f);for(const x of [-10,4]){for(let z=8;z<=25;z+=4){box(scene,.22,1.1,.22,fence,x,.55,z);if(z<25){box(scene,.16,.15,4,fence,x,.72,z+2);box(scene,.16,.15,4,fence,x,.34,z+2);}}}
  for(let x=-10;x<=4;x+=3.5){box(scene,.22,1.1,.22,fence,x,.55,25);if(x<4){box(scene,3.5,.15,.18,fence,x+1.75,.72,25);box(scene,3.5,.15,.18,fence,x+1.75,.34,25);}}
}
function buildCactus(x,z,s){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);const green=mat(0x47724b),dark=mat(0x33583c);
  cylinder(g,.44,.55,3.5,green,0,1.75,0,9);ball(g,0,3.5,0,.43,.45,.43,green);
  if(Math.random()>.25){cylinder(g,.2,.24,1.15,green,.72,1.7,0,8);cylinder(g,.2,.2,1.1,green,.93,2.25,0,8);ball(g,.2,2.83,0,.2,.2,.2,green);}
  if(Math.random()>.48){cylinder(g,.18,.2,1.1,dark,-.66,1.15,0,8);cylinder(g,.18,.18,.9,dark,-.86,1.6,0,8);ball(g,-.86,2.05,0,.18,.18,.18,dark);}
}
function buildShrub(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const c=Math.random()>.5?0x9c5e3a:0x746344;for(let i=0;i<4;i++){const b=ball(g,(Math.random()-.5)*.8,.25+Math.random()*.25,(Math.random()-.5)*.7,.55,.3,.45,mat(c));b.rotation.y=Math.random();}if(Math.random()<.14){ball(g,0,.15,0,.6,.35,.55,mat(0x9f7658));}}
function createCourse(){
  const points=[[0,-30],[23,-59],[52,-35],[48,0],[22,28],[-22,11]];
  points.forEach((p,i)=>{const gate=new THREE.Group();gate.position.set(p[0],0,p[1]);scene.add(gate);const postMat=mat(0x805034),gold=new THREE.MeshStandardMaterial({color:0xffd06a,emissive:0xd77924,emissiveIntensity:.75,roughness:.35});
    for(const x of [-3.6,3.6]){cylinder(gate,.17,.22,4.2,postMat,x,2.1,0,8);ball(gate,x,4.25,0,.26,.3,.26,mat(0xc49359));}
    box(gate,7.5,.25,.25,postMat,0,4.15,0);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.11,8,24),gold);ring.position.set(0,2.15,0);ring.castShadow=true;gate.add(ring);
    const flag=box(gate,.9,.55,.08,gold,0,3.5,0);flag.rotation.z=.08;gates.push({group:gate,ring,position:new THREE.Vector3(p[0],0,p[1]),index:i});
  });
  const barrelMat=mat(0x9e4931);for(const p of [[-8,-20],[10,-43],[34,-48],[59,-25],[43,15],[0,19]]){cylinder(scene,.6,.65,1.3,barrelMat,p[0],.65,p[1],12);}
}
function createHorse(){
  if(horseRig)horseRoot.remove(horseRig.group);
  const data=horses[horseIndex],g=new THREE.Group();horseRoot.add(g);
  const coat=mat(data.color),mane=mat(data.mane),dark=mat(0x251d1a),hoof=mat(0x332a23),white=mat(0xffe6c6);
  ball(g,0,1.55,0,.63,.66,1.15,coat);
  ball(g,0,1.48,0,.67,.26,.88,mat(data.color===0xe9dcc1?0xc6b69b:0x4e3124)); // belly shading
  // neck rises from front shoulder toward head
  const neck=ball(g,0,2.12,-.78,.42,.9,.45,coat);neck.rotation.x=-.42;neck.rotation.z=.05;
  ball(g,0,2.78,-1.03,.31,.36,.38,coat);
  ball(g,0,2.68,-1.36,.27,.22,.35,coat);
  ball(g,0,2.58,-1.63,.24,.17,.19,mat(data.color===0xe9dcc1?0x80634c:0x493027));
  // ears, eye whites and pupils
  for(const s of [-1,1]){const ear=ball(g,s*.17,3.12,-1.05,.1,.32,.11,coat);ear.rotation.z=s*-.18;ball(g,s*.25,2.83,-1.2,.085,.075,.05,white);ball(g,s*.27,2.83,-1.24,.04,.05,.035,dark);}
  // mane and forelock
  for(let i=0;i<7;i++){const tuft=ball(g,0,2.7-i*.14,-.82-i*.105,.25-i*.012,.16,.22,mane);tuft.rotation.x=-.45;}
  ball(g,0,3.04,-1.28,.25,.16,.2,mane);
  const tail=ball(g,0,1.63,1.15,.22,.24,.8,mane);tail.rotation.x=-.35;
  // Saddle blanket and leather saddle
  const blanket=ball(g,0,2.05,.08,.67,.16,.72,mat(0xb3472b));blanket.rotation.x=-.08;
  ball(g,0,2.2,.06,.52,.2,.52,mat(0x443028));
  for(const s of [-1,1]){const stirrup=cylinder(g,.05,.05,.72,mat(0xb38a51),s*.55,1.55,.14,8);box(g,.2,.08,.28,hoof,s*.55,1.19,.14);}
  // Four animated legs with upper and lower segments.
  const legs=[];for(const x of [-.36,.36])for(const z of [-.68,.7]){const pivot=new THREE.Group();pivot.position.set(x,1.35,z);g.add(pivot);const upper=cylinder(pivot,.18,.13,.68,coat,0,-.34,0,8);upper.rotation.x=(z<0?-.06:.06);const lower=cylinder(pivot,.1,.075,.65,coat,0,-.92,-.02,8);const h=box(pivot,.24,.2,.32,hoof,0,-1.31,-.06);h.rotation.x=-.08;legs.push({pivot,phase:(x+z)*1.5,front:z<0});}
  // Cowboy rider, boots, denim shirt, neckerchief and broad hat.
  const rider=new THREE.Group();rider.position.set(0,2.35,.2);g.add(rider);const denim=mat(0x45657a),jeans=mat(0x38485a),skin=mat(0xc78d64),leather=mat(0x593a29),hat=mat(0x684329);
  ball(rider,0,.45,.05,.3,.43,.27,denim);ball(rider,0,.92,-.02,.23,.27,.22,skin);ball(rider,0,.65,-.04,.12,.12,.24,mat(0xb94f38));
  const brim=ball(rider,0,1.22,-.02,.52,.08,.42,hat);const crown=cylinder(rider,.23,.27,.26,hat,0,1.37,-.02,12);ball(rider,0,1.51,-.02,.22,.06,.25,hat);
  for(const s of [-1,1]){const leg=ball(rider,s*.24,.08,.12,.14,.42,.16,jeans);leg.rotation.z=s*.28;ball(rider,s*.31,-.2,-.01,.16,.11,.25,leather);const arm=ball(rider,s*.34,.57,-.2,.12,.36,.12,denim);arm.rotation.z=s*.45;ball(rider,s*.36,.28,-.38,.09,.1,.1,skin);}
  horseRig={group:g,legs,tail,coat};
}
function showToast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100);}
function updateHorseCard(){const h=horses[horseIndex];$('#horseName').textContent=h.name;$('#horseBreed').innerHTML=`${h.breed} <span>·</span> ${h.years} YEARS`;$('#horseEmoji').textContent=h.emoji;$('#level').textContent=String(level).padStart(2,'0');$('.horse-switch span').innerHTML=horses.map((_,i)=>`<i class="${i===horseIndex?'active':''}"></i>`).join('');}
function updateStats(){[['bond',bond],['stamina',stamina],['spirit',spirit]].forEach(([name,value])=>{$(`#${name}Text`).textContent=`${Math.round(value)}%`;$(`#${name}Bar`).style.width=`${value}%`;});$('#coinCount').textContent=coins;}
function selectHorse(step){horseIndex=(horseIndex+step+horses.length)%horses.length;createHorse();updateHorseCard();showToast(`${horses[horseIndex].name} is ready to ride!`);sound('horse');}
function startRace(){mode='race';raceActive=true;raceElapsed=0;nextGate=0;gates.forEach(g=>{g.group.visible=true;g.ring.material.emissiveIntensity=.65;});horseRoot.position.set(0,0,8);horseRoot.rotation.y=0;stamina=Math.min(100,stamina+18);$('#rideBtn').querySelector('span').textContent='END THE TRAIL';$('#questTitle').textContent='Canyon Canter';$('#questDesc').textContent='Ride through all 6 trail markers before the sun dips.';$('#gateCount').innerHTML='0 <i>/ 6</i>';$('#questBar').style.width='0%';$('#modeLabel').textContent='CANYON CANTER';$('#locationLabel').textContent='THE CANYON TRAIL';showToast('Trail started — ride through the glowing markers!');sound('start');}
function finishRace(won){raceActive=false;mode='stable';$('#rideBtn').querySelector('span').textContent='RIDE AGAIN';$('#modeLabel').textContent='STABLE';if(won){coins+=120;level=Math.min(99,level+1);bond=Math.min(100,bond+8);$('#questTitle').textContent='Trail conquered!';$('#questDesc').textContent='A fine ride, partner. Your horse is proud of you.';$('#gateCount').innerHTML='6 <i>/ 6</i>';$('#questBar').style.width='100%';showToast('Trail complete! +120 coins · Level up!');sound('win');}else{showToast('Trail ended. The open range will be waiting.');sound('stop');}updateStats();}
function setFreeRide(){if(raceActive){finishRace(false);return;}mode=mode==='free'?'stable':'free';$('#modeLabel').textContent=mode==='free'?'FREE RIDE':'STABLE';$('#locationLabel').textContent=mode==='free'?'OPEN RANGE':'DRY CREEK RANCH';$('#freeRideBtn').querySelector('b').textContent=mode==='free'?'Back to Stable':'Free Ride';showToast(mode==='free'?'The whole desert is yours, partner.':'Back at Dry Creek Ranch.');sound('start');}
function action(name){if(name==='brush'){bond=Math.min(100,bond+9);spirit=Math.min(100,spirit+2);showToast('A good brushing. Bond is growing!');sound('brush');}if(name==='feed'){stamina=Math.min(100,stamina+22);bond=Math.min(100,bond+3);showToast('Yum! Your horse has more energy.');sound('feed');}if(name==='pet'){spirit=Math.min(100,spirit+10);bond=Math.min(100,bond+5);showToast(`${horses[horseIndex].name} nuzzles your hand.`);sound('horse');}updateStats();}
function ensureAudio(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();}if(audioCtx.state==='suspended')audioCtx.resume();}
function tone(freq,duration=.18,type='sine',volume=.045,when=0){if(!audioCtx)return;const o=audioCtx.createOscillator(),gain=audioCtx.createGain();o.type=type;o.frequency.value=freq;gain.gain.setValueAtTime(.0001,audioCtx.currentTime+when);gain.gain.exponentialRampToValueAtTime(volume,audioCtx.currentTime+when+.025);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+when+duration);o.connect(gain);gain.connect(audioCtx.destination);o.start(audioCtx.currentTime+when);o.stop(audioCtx.currentTime+when+duration+.03);}
function sound(kind){if(!audioCtx)return;const patterns={brush:[[660,.1],[820,.11]],feed:[[392,.12],[523,.15],[659,.2]],horse:[[523,.14],[659,.2]],start:[[392,.12],[523,.12],[784,.25]],stop:[[440,.12],[330,.22]],win:[[523,.15],[659,.15],[784,.15],[1047,.3]],gate:[[659,.1],[880,.18]]};(patterns[kind]||[]).forEach(([n,d],i)=>tone(n,d,'sine',.055,i*.1));}
function toggleMusic(){ensureAudio();musicOn=!musicOn;$('#soundBtn').classList.toggle('active',musicOn);$('#soundBtn').setAttribute('aria-label',musicOn?'Turn music off':'Turn music on');if(musicTimer)clearInterval(musicTimer);if(musicOn){const notes=[392,494,587,494,440,587,659,587,392,494,587,784,659,587,494,440];let i=0;const play=()=>{if(musicOn){tone(notes[i%notes.length],.42,'triangle',.022);if(i%4===0)tone(notes[i%notes.length]/2,.68,'sine',.014);i++;}};play();musicTimer=setInterval(play,510);}else{musicTimer=null;}}
function setControl(name,down){keys[name]=down;}
function onKey(e,down){const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(down&&k==='r')setFreeRide();if(down&&k==='escape'&&raceActive)finishRace(false);keys[k]=down;}
function update(dt){worldTime+=dt;const forward=keys.w||keys.arrowup||keys.forward,back=keys.s||keys.arrowdown||keys.back,left=keys.a||keys.arrowleft||keys.left,right=keys.d||keys.arrowright||keys.right,gallop=keys.shift;
  const moving=forward||back,turn=(left?-1:0)+(right?1:0);if(turn)horseRoot.rotation.y+=turn*dt*(moving?1.8:1.2);
  let speed=0;if(forward)speed=(gallop&&stamina>2?15:9)*horses[horseIndex].speed;if(back)speed=-4;
  if(mode==='stable'&&!raceActive)speed*=.55;
  if(speed){const yaw=horseRoot.rotation.y;horseRoot.position.x+=Math.sin(yaw)*speed*dt;horseRoot.position.z-=Math.cos(yaw)*speed*dt;}
  if(gallop&&forward&&stamina>0)stamina=Math.max(0,stamina-dt*3.2);else stamina=Math.min(100,stamina+dt*(raceActive?1.3:3));
  const gait=speed?Math.sin(worldTime*(gallop?15:9))*Math.min(1,Math.abs(speed)/8):Math.sin(worldTime*2)*.025;
  horseRig.legs.forEach(l=>{l.pivot.rotation.x=gait*(l.front?1:-1)*(l.phase<0?-1:1);});horseRig.tail.rotation.x=-.35+Math.sin(worldTime*3)*.08;
  horseRig.group.position.y=Math.abs(gait)*.055;
  const behind=8.5;const desired=new THREE.Vector3(horseRoot.position.x+Math.sin(horseRoot.rotation.y)*behind,horseRoot.position.y+4.4,horseRoot.position.z+Math.cos(horseRoot.rotation.y)*behind);
  camera.position.lerp(desired,1-Math.exp(-dt*2.7));const target=new THREE.Vector3(horseRoot.position.x,2.4,horseRoot.position.z-2.5*Math.cos(horseRoot.rotation.y));camera.lookAt(target);
  if(raceActive){raceElapsed+=dt;const remain=Math.max(0,120-raceElapsed);$('#timerLabel').textContent=`⏱  ${String(Math.floor(remain/60)).padStart(2,'0')}:${String(Math.floor(remain%60)).padStart(2,'0')}`;if(remain<=0){finishRace(false);}const gate=gates[nextGate];if(gate&&horseRoot.position.distanceTo(gate.position)<5.4){gate.ring.material.emissiveIntensity=0;gate.group.visible=false;nextGate++;$('#gateCount').innerHTML=`${nextGate} <i>/ 6</i>`;$('#questBar').style.width=`${nextGate/6*100}%`;showToast(nextGate===6?'Final marker!':'Marker found! Keep riding.');sound('gate');if(nextGate>=6)finishRace(true);}}
  gates.forEach((g,i)=>{if(g.group.visible){g.ring.rotation.z=Math.sin(worldTime*2+i)*.12;g.ring.material.emissiveIntensity=i===nextGate&&raceActive?1.15:.65;}});
  updateStats();
}

initWorld();
updateHorseCard();updateStats();
camera.position.set(0,7,18);camera.lookAt(0,1.8,0);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
window.addEventListener('keydown',e=>onKey(e,true));window.addEventListener('keyup',e=>onKey(e,false));window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
$('#prevHorse').addEventListener('click',()=>selectHorse(-1));$('#nextHorse').addEventListener('click',()=>selectHorse(1));
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>action(button.dataset.action)));
$('#rideBtn').addEventListener('click',()=>raceActive?finishRace(false):startRace());$('#freeRideBtn').addEventListener('click',setFreeRide);
$('#soundBtn').addEventListener('click',toggleMusic);
$('#closeQuest').addEventListener('click',()=>$('#questCard').classList.toggle('collapsed'));
$('#helpBtn').addEventListener('click',()=>{$('#helpModal').classList.add('open');$('#helpModal').setAttribute('aria-hidden','false');});
function closeHelp(){$('#helpModal').classList.remove('open');$('#helpModal').setAttribute('aria-hidden','true');}
$('#helpClose').addEventListener('click',closeHelp);$('#gotIt').addEventListener('click',closeHelp);$('#helpModal').addEventListener('click',e=>{if(e.target.id==='helpModal')closeHelp();});
document.querySelectorAll('.mobile-pad button').forEach(button=>{const c=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);setControl(c,true);});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>button.addEventListener(ev,()=>setControl(c,false)));});
let previous=performance.now();function frame(now){const dt=Math.min(.04,(now-previous)/1000);previous=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
