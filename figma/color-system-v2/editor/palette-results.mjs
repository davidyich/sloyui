/** Presentation identity excludes authored values so edits replace paint in place. */
export function paletteViewKey(request){
 const {page,isDetail,accent,project,theme,scheme,surface,exportScope,format,paletteView}=request;
 const colors=isDetail&&!(page==='tokens'&&exportScope==='all')?[[accent.id,accent.name]]:[project.neutral.accent,...project.accents].map(a=>[a.id,a.name]);
 return JSON.stringify([page,isDetail,colors,theme,scheme,surface,page==='tokens'?exportScope:null,page==='tokens'?format:null,page==='palettes'?paletteView:null]);
}
const slot=c=>JSON.stringify([c.accent,c.theme,c.scheme,c.surface]);
const merge=(previous,incoming)=>{
 const positions=new Map(previous.map((c,index)=>[slot(c),index])),next=[...previous];
 for(const context of incoming){const index=positions.get(slot(context));if(index===undefined){positions.set(slot(context),next.length);next.push(context);}else next[index]=context;}
 return next;
};
/** Keep a bounded set of visible snapshots, separate from the exact solver cache. */
export function createPaletteResultStore(){
 const views=new Map(),requests=new Map();let active=null,current=null,sequence=0,painted=0,floor=0;
 const empty=(key,viewKey)=>({key,viewKey,contexts:[],text:'',pending:true,error:'',elapsedMs:0});
 const read=request=>{
  const key=JSON.stringify(request),viewKey=paletteViewKey(request),previous=current?.viewKey===viewKey?current:views.get(viewKey);
  return previous?.key===key?previous:{...empty(key,viewKey),contexts:previous?.contexts??[],text:previous?.text??''};
 };
 const remember=result=>{
  if(result.contexts.length>512)return;
  views.delete(result.viewKey);views.set(result.viewKey,result);
  while(views.size>12||[...views.values()].reduce((sum,value)=>sum+value.contexts.length,0)>512)views.delete(views.keys().next().value);
 };
 return {
  read,
  start(request){
   const id=++sequence,key=JSON.stringify(request),viewKey=paletteViewKey(request),previous=read(request),cached=previous.key===key&&!previous.pending&&!previous.error;
   if(active?.viewKey!==viewKey||cached){floor=id;painted=id-1;}
   active={id,key,viewKey,started:performance.now()};requests.set(id,active);
   while(requests.size>256)requests.delete(requests.keys().next().value);
   current=cached?previous:{...previous,key,viewKey,pending:true,error:'',elapsedMs:0};
   return{id,request,result:current,cached};
  },
  receive(data){
   const origin=requests.get(data.id);
   // Old views never leak into navigation. During a continuous edit, completed
   // intermediate frames from this view can still advance the visible colors.
   if(!origin||!active||origin.viewKey!==active.viewKey||data.id<floor||data.id<painted)return null;
   painted=data.id;
   const incoming=data.append??data.contexts;
   current={key:active.key,viewKey:active.viewKey,contexts:incoming?merge(current?.contexts??[],incoming):current?.contexts??[],text:data.id===active.id&&typeof data.text==='string'?data.text:current?.text??'',pending:data.id!==active.id||!data.done,error:data.id===active.id?data.error??'':'',elapsedMs:Math.round(performance.now()-origin.started)};
   remember(current);return current;
  },
  fail(message){return active?this.receive({id:active.id,done:true,error:message}):null;}
 };
}
