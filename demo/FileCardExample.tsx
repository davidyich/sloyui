import { useState } from 'react';
import { FileCard } from '../src/components/file-card.js';
import { Button } from '../src/components/primitives.js';
import { useTranslate } from '../src/components/locale.js';

// Original miniature landscape for demonstrating image previews; no external asset.
const preview = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#d3e8eb"/><path d="M0 78 35 30 72 79 97 48 120 79V120H0Z" fill="#72998b"/><path d="M0 94 52 72 90 95 120 83V120H0Z" fill="#3a7064"/><path d="M0 105Q48 84 120 109V120H0Z" fill="#91c1c8"/></svg>')}`;
const files = [
  {name:'cover-shot.png',sizeLabel:'1.8 MB',thumbnail:preview},
  {name:'brand-guidelines.pdf',sizeLabel:'248 KB'},
  {name:'series-a-deck.pptx',sizeLabel:'4.2 MB'},
  {name:'contract-v3.docx',sizeLabel:'86 KB'},
  {name:'q3-forecast.xlsx',sizeLabel:'312 KB'},
];
export function FileCardExample() {
  const t = useTranslate(), [removed, setRemoved] = useState<string[]>([]);
  return <div style={{display:'grid',gap:16,width:'100%'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:12,width:'100%'}}>
      {files.filter(file=>!removed.includes(file.name)).map(file=><FileCard key={file.name} {...file} onRemove={()=>setRemoved(current=>[...current,file.name])} />)}
    </div>
    {removed.length>0 && <Button variant="ghost" onClick={()=>setRemoved([])}>{t('Вернуть файлы','Restore files')}</Button>}
  </div>;
}
