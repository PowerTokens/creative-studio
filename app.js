const byId = id => document.getElementById(id);
const canvas = byId('canvas'), ctx = canvas.getContext('2d');
const dims = {landscape:[1200,628],square:[1200,1200],portrait:[960,1200]};
const themes = {
  light:{bg:'#f7fcff',ink:'#0c2947',sub:'#4d6b85',blue:'#1b60cc',cyan:'#28bfce',card:'#ffffff',line:'#d3e5f3'},
  dark:{bg:'#07182f',ink:'#ffffff',sub:'#b7d0e9',blue:'#3676e7',cyan:'#48d6db',card:'#112946',line:'#31516f'},
  mint:{bg:'#edfcf8',ink:'#123c49',sub:'#547981',blue:'#1480b2',cyan:'#35d7ae',card:'#ffffff',line:'#c6e9df'}
};
let state={layout:'single',size:'landscape',color:'light',mode:'generate',photo:null,photoData:null,logo:null};
// This public OAuth client ID and the redirect URI must be registered with PowerTokens.
const PT_OAUTH_CLIENT_ID='';const PT_REDIRECT_URI=location.origin+'/creative-studio/';
let connection='account',defaultKey='',accessToken='';
function accountMessage(message){byId('accountstatus').textContent=message}
function randomUrlSafe(bytes=32){let raw=crypto.getRandomValues(new Uint8Array(bytes));return Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('')}
async function challenge(verifier){let hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));return btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
byId('connections').addEventListener('click',event=>{let button=event.target.closest('button');if(!button)return;connection=button.dataset.value;byId('connections').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));byId('accountpanel').style.display=connection==='account'?'':'none';byId('manualpanel').style.display=connection==='manual'?'':'none'});
byId('signin').onclick=async()=>{if(!PT_OAUTH_CLIENT_ID){accountMessage('PT web OAuth client registration is pending. Use your own API Key for now.');return}let verifier=randomUrlSafe(48),stateValue=randomUrlSafe(16);sessionStorage.setItem('pt_oauth_verifier',verifier);sessionStorage.setItem('pt_oauth_state',stateValue);let url=new URL('https://www.powertokens.ai/oauth/authorize');url.search=new URLSearchParams({client_id:PT_OAUTH_CLIENT_ID,redirect_uri:PT_REDIRECT_URI,response_type:'code',scope:'read',state:stateValue,code_challenge:await challenge(verifier),code_challenge_method:'S256'});location.assign(url.toString())};
async function finishOAuth(){let url=new URL(location.href),code=url.searchParams.get('code'),returnedState=url.searchParams.get('state');if(!code)return;history.replaceState(null,'',PT_REDIRECT_URI);let verifier=sessionStorage.getItem('pt_oauth_verifier'),expected=sessionStorage.getItem('pt_oauth_state');sessionStorage.removeItem('pt_oauth_verifier');sessionStorage.removeItem('pt_oauth_state');if(!PT_OAUTH_CLIENT_ID||!verifier||!expected||returnedState!==expected){accountMessage('Sign-in state check failed. Please try again.');return}try{let body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:PT_REDIRECT_URI,code_verifier:verifier,client_id:PT_OAUTH_CLIENT_ID});let res=await fetch('https://powertokens.ai/api/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});let token=await res.json();if(!res.ok||!token.access_token)throw new Error(token.error_description||'Could not complete sign-in');accessToken=token.access_token;res=await fetch('https://powertokens.ai/api/oauth/userinfo',{headers:{Authorization:'Bearer '+accessToken}});let user=await res.json();if(!res.ok||!user.key)throw new Error('The PT account did not return a default Key');defaultKey=user.key;accountMessage('Signed in as '+(user.name||user.email||'PT user')+' · '+(user.credits??'—')+' Credits');byId('signin').style.display='none';byId('signout').style.display=''}catch(error){accessToken='';defaultKey='';accountMessage('Sign-in failed: '+error.message)}}
byId('signout').onclick=async()=>{let token=accessToken;accessToken='';defaultKey='';byId('signin').style.display='';byId('signout').style.display='none';accountMessage('Signed out.');if(token)try{await fetch('https://powertokens.ai/api/oauth/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})})}catch{}};
finishOAuth();
const imageModels=[
  {id:'dola-seedream-5-0-pro-260628',name:'Seedream 5.0 Pro',provider:'BytePlus',generate:true,edit:true,size:'2K',page:'https://powertokens.ai/models/dola-seedream-5-0-pro-260628'},
  {id:'seedream-5-0-260128',name:'Seedream 5.0',provider:'BytePlus',generate:true,edit:true,size:'2K',page:'https://powertokens.ai/models/seedream-5-0-260128'},
  {id:'wan2.7-image',name:'Wan 2.7 Image',provider:'Alibaba',generate:true,edit:false,size:'2K',page:'https://powertokens.ai/models/wan2.7-image'},
  {id:'image-01',name:'MiniMax Image-01',provider:'MiniMax',generate:true,edit:false,size:'2K',page:'https://powertokens.ai/models/image-01'},
  {id:'kling-image-o1',name:'Kling Image O1',provider:'Kling',generate:true,edit:false,size:'1k',page:'https://powertokens.ai/models/kling-image-o1'}
];
function box(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function fit(text,x,y,w,size,min,color,weight=700){ctx.font=weight+' '+size+'px Arial, sans-serif';while(ctx.measureText(text).width>w&&size>min){size-=2;ctx.font=weight+' '+size+'px Arial, sans-serif'}ctx.fillStyle=color;ctx.fillText(text,x,y);return size}
function wrap(text,w,size,weight){ctx.font=weight+' '+size+'px Arial, sans-serif';let out=[];for(const para of text.split('\n')){let line='';for(const word of para.split(' ')){let n=line?line+' '+word:word;if(ctx.measureText(n).width>w&&line){out.push(line);line=word}else line=n}out.push(line)}return out}
function block(text,x,y,w,size,step,max,color,weight=700){let lines=wrap(text,w,size,weight).slice(0,max);ctx.fillStyle=color;ctx.font=weight+' '+size+'px Arial, sans-serif';lines.forEach((line,i)=>ctx.fillText(line,x,y+i*step));return y+lines.length*step}
function cover(img,x,y,w,h,r){ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();let scale=Math.max(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale;ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore()}
function abstract(x,y,w,h,t){ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,26);ctx.clip();let g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,t.blue);g.addColorStop(1,t.cyan);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.globalAlpha=.2;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(x+w*(.2+(i%4)*.22),y+h*(.15+Math.floor(i/4)*.5),55+i*10,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=17;ctx.stroke()}ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x+w*.58,y+h*.51,Math.min(w,h)*.25,0,Math.PI*2);ctx.fillStyle='#ffffff55';ctx.fill();ctx.beginPath();ctx.moveTo(x+w*.55,y+h*.39);ctx.lineTo(x+w*.55,y+h*.63);ctx.lineTo(x+w*.73,y+h*.51);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.restore()}
function draw(){
  const [W,H]=dims[state.size],t=themes[state.color],wide=W/H>1.4,pad=50,left=wide?575:W-100;
  canvas.width=W;canvas.height=H;ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.1;ctx.fillStyle=t.cyan;ctx.beginPath();ctx.arc(W-35,20,230,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  if(state.logo){let ratio=state.logo.width/state.logo.height,h=42,w=Math.min(140,h*ratio);ctx.drawImage(state.logo,pad,pad,w,h);fit('PowerTokens',pad+w+12,pad+29,240,27,20,t.ink,800)}
  else{box(pad,pad,40,40,12,null,t.blue);fit('P',pad+10,pad+31,30,32,32,t.blue,800);fit('PowerTokens',pad+54,pad+30,250,26,22,t.ink,800)}
  let y=wide?158:160;fit(byId('kicker').value.toUpperCase(),pad,y,left-20,16,11,t.blue,800);
  y=block(byId('headline').value||'Create more.',pad,y+58,left-15,wide?57:60,wide?66:68,wide?3:4,t.ink,800)+12;
  y=block(byId('subline').value,pad,y,left-20,wide?23:25,33,3,t.sub,500)+10;
  let models=byId('models').value.split('\n').map(s=>s.trim()).filter(Boolean),cy=wide?Math.max(y+12,410):Math.max(y+20,580);
  if(state.layout==='single'){box(pad,cy,left-30,70,15,t.card,t.line);fit(models[0]||'One API. More possibilities.',pad+20,cy+44,left-75,23,16,t.ink)}
  else models.slice(0,3).forEach((m,i)=>{let yy=cy+i*63;box(pad,yy,left-30,53,12,t.card,t.line);fit('0'+(i+1),pad+17,yy+34,45,21,21,t.blue,800);fit(m,pad+64,yy+34,left-112,22,14,t.ink)});
  let ax=wide?670:pad,ay=wide?126:Math.round(H*.56),aw=wide?W-ax-pad:W-pad*2,ah=wide?H-ay-pad:Math.round(H*.29);
  if(state.photo)cover(state.photo,ax,ay,aw,ah,26);else abstract(ax,ay,aw,ah,t);
  let badge=byId('price').value.trim()||byId('badge').value.trim();
  if(badge){let by=wide?H-pad-55:ay+ah+20,bw=Math.min(aw,Math.max(200,badge.length*13+45));box(ax,by,bw,45,23,t.blue);fit(badge,ax+21,by+30,bw-38,19,13,'#fff',800)}
  fit(byId('website').value,pad,H-pad+12,360,17,13,t.sub);
  byId('dimensions').textContent=W+' × '+H+' px';
}
function select(group,key){byId(group).addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;byId(group).querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));state[key]=b.dataset.value;draw()})}
select('layouts','layout');select('sizes','size');select('colors','color');
function refreshModels(){let provider=byId('provider').value,models=imageModels.filter(m=>(provider==='all'||m.provider===provider)&&m[state.mode]);byId('model').replaceChildren(...models.map(m=>{let option=document.createElement('option');option.value=m.id;option.textContent=m.name+' · '+m.provider;return option}));modelInfo()}
function modelInfo(){let m=imageModels.find(x=>x.id===byId('model').value);byId('modelinfo').innerHTML=m?'Model ID: '+m.id+' · <a target="_blank" rel="noopener" href="'+m.page+'">View PT model page</a>':'No model matches this filter.'}
select('modes','mode');byId('modes').addEventListener('click',refreshModels);byId('provider').addEventListener('change',refreshModels);byId('model').addEventListener('change',modelInfo);refreshModels();
['kicker','headline','subline','models','price','badge','website'].forEach(id=>byId(id).addEventListener('input',draw));
function upload(id,key){byId(id).addEventListener('change',e=>{let file=e.target.files[0];if(!file)return;let reader=new FileReader();reader.onload=()=>{let img=new Image();img.onload=()=>{state[key]=img;if(key==='photo')state.photoData=reader.result;draw()};img.src=reader.result};reader.readAsDataURL(file)})}
upload('photo','photo');upload('userlogo','logo');
byId('generate').onclick=async()=>{
  const button=byId('generate'),status=byId('generated'),key=connection==='account'?defaultKey:byId('apikey').value.trim(),model=imageModels.find(m=>m.id===byId('model').value),prompt=byId('imageprompt').value.trim();
  if(!key||!model||!prompt){status.textContent=connection==='account'?'Sign in to PT first, or switch to your own API Key.':'Enter an API key, choose a model, and write a prompt.';return}
  if(state.mode==='edit'&&!state.photoData){status.textContent='Upload a product image first to beautify it.';return}
  button.disabled=true;button.textContent='Generating…';status.textContent='Sending request to PowerTokens. This may take a minute.';
  try{
    const body={model:model.id,prompt,size:model.size,response_format:'b64_json',watermark:false};
    if(state.mode==='edit')body.image=state.photoData;
    const response=await fetch('https://api.powertokens.ai/v1/images/generations',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error?.message||result.message||'HTTP '+response.status);
    const item=result.data?.[0]||result.images?.[0]||result.output?.[0];
    const src=item?.b64_json?'data:image/png;base64,'+item.b64_json:(item?.url||item?.image_url);
    if(!src)throw new Error('The API returned no image. Check the response format for this model.');
    const image=new Image();image.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Image could not be loaded into the canvas.'));image.src=src});
    state.photo=image;state.photoData=src;draw();
    status.textContent='Image generated and placed in the ad preview.';
  }catch(error){status.textContent='Generation failed: '+error.message+' If this is a browser network restriction, use the PT Playground and upload the result above.'}
  finally{button.disabled=false;button.textContent='Generate with PT'}
};
function valid(){if(byId('price').value.trim()&&!byId('verified').checked){byId('status').textContent='Check the confirmation box before exporting a price claim.';return false}return true}
function blob(){return new Promise(resolve=>canvas.toBlob(resolve,'image/png'))}
function save(data,name){let url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function filename(){return 'powertokens-'+state.layout+'-'+state.color+'-'+state.size+'.png'}
byId('download').onclick=async()=>{if(!valid())return;save(await blob(),filename());byId('status').textContent='PNG downloaded.'};
function u16(n){return[n&255,(n>>>8)&255]}function u32(n){return[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function crc32(d){let c=-1;for(let x of d){c^=x;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1}return(c^-1)>>>0}
function zip(files){let parts=[],central=[],offset=0;for(let f of files){let n=new TextEncoder().encode(f.name),d=f.data,crc=crc32(d);let local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(d.length),...u32(d.length),...u16(n.length),...u16(0),...n]);parts.push(local,d);central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(d.length),...u32(d.length),...u16(n.length),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...n]));offset+=local.length+d.length}let len=central.reduce((s,x)=>s+x.length,0);return new Blob([...parts,...central,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(len),...u32(offset),...u16(0)])],{type:'application/zip'})}
byId('batch').onclick=async()=>{if(!valid())return;let old=state.size,files=[];for(let size of Object.keys(dims)){state.size=size;draw();files.push({name:filename(),data:new Uint8Array(await(await blob()).arrayBuffer())})}state.size=old;draw();save(zip(files),'powertokens-'+state.layout+'-'+state.color+'-3-sizes.zip');byId('status').textContent='Three-size ZIP downloaded.'};
draw();
