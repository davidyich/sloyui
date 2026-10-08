import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
const surfaces=['canvas','base','raised','floating'] as const;
function App(){
 const [narrow,setNarrow]=useState(false);
 const [theme,setTheme]=useState<'light'|'dark'>('dark'),[borders,setBorders]=useState<'on'|'off'>('off'),[radius,setRadius]=useState<'compact'|'default'|'rounded'>('default');
 const [position,setPosition]=useState<'top-center'|'bottom-center'>('bottom-center'),[scope,setScope]=useState<'container'|'viewport'>('container');
 const [items,setItems]=useState<UI.ToastStackItem[]>(Array.from({length:4},(_,i)=>({id:String(i),title:i===3?'Deploying to production…':`Notification ${i+1}`,description:i===3?'Building 24 routes and warming the cache.':'Changes saved and available on your devices. More information can wrap to another line.',duration:Infinity,loading:i===3})));
 return <UI.LocaleProvider locale="en"><main data-theme={theme} data-borders={borders} data-radius={radius} data-surface="base" style={{padding:24,maxWidth:narrow?390:undefined,boxSizing:'border-box',minHeight:'100vh',fontFamily:'var(--cap-font-sans)' ,background:'var(--cap-surface-current)',color:'var(--cap-content-primary)'}}>
  <h1>Feedback and file audit</h1><div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}><UI.Button onClick={()=>setNarrow(!narrow)}>Width {narrow?390:"auto"}</UI.Button><UI.Button onClick={()=>setTheme(theme==='dark'?'light':'dark')}>Theme {theme}</UI.Button><UI.Button onClick={()=>setBorders(borders==='on'?'off':'on')}>Borders {borders}</UI.Button><UI.Select label="Radius" value={radius} onValueChange={v=>setRadius(v as typeof radius)} options={['compact','default','rounded'].map(value=>({value,label:value}))}/><UI.Button onClick={()=>setPosition(position==='top-center'?'bottom-center':'top-center')}>Position {position}</UI.Button><UI.Button onClick={()=>setScope(scope==='container'?'viewport':'container')}>Scope {scope}</UI.Button></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,270px),1fr))',gap:16}}>{surfaces.map(surface=><section key={surface} data-audit-surface={surface} data-surface={surface} data-accent="purple" style={{padding:16,borderRadius:'var(--cap-radius-xl)',background:'var(--cap-surface-current)',minWidth:0}}>
   <h2>{surface}</h2><UI.ActionBar label={surface+' actions'}><UI.Button size="sm">Copy</UI.Button><UI.Separator orientation="vertical" length={24}/><UI.Button size="sm">Paste</UI.Button></UI.ActionBar><UI.Separator/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{(["primary","secondary","accent"] as const).map(variant=><UI.SplitButton key={variant} size="sm" label={variant} variant={variant} items={[{id:"note",label:"Note"}]}/>)}</div><UI.Separator contrast="strong"/><UI.FileCard name="brand-guidelines.pdf" sizeLabel="248 KB" onRemove={()=>{}}/>
  </section>)}</div>
  <div style={{marginTop:24,display:'grid',gap:20}}><UI.FloatingActionBar position="static" variant="divided" label="Floating actions" leading={<UI.Counter value={3}/>} action={{label:'Done',icon:'check',onClick:()=>{}}}><UI.IconButton icon="copy" label="Copy" variant="ghost"/><UI.IconButton icon="sliders" label="Settings" variant="ghost"/></UI.FloatingActionBar>
   <div id="toast-frame" data-surface="canvas" style={{position:'relative',height:320,transform:'translateZ(0)',borderRadius:'var(--cap-radius-xl)',background:'var(--cap-surface-current)'}}><UI.ToastStack shape="pill" label="Audit notifications" limit={4} scope={scope} position={position} items={items} onDismiss={id=>setItems(list=>list.filter(item=>item.id!==id))}/></div>
  </div>
 </main></UI.LocaleProvider>
}
createRoot(document.getElementById('root')!).render(<App/>);
