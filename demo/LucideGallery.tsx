import { useMemo, useState } from 'react';
import { iconOptions as options } from './icon-catalogue';
import * as UI from '../src';

export default function LucideGallery(){
 const [value,setValue]=useState('folder'),[size,setSize]=useState('20');
 const selected=useMemo(()=>options.find(option=>option.name===value),[value]);
 return <div className="catalog-stack"><div className="catalog-row"><UI.SegmentedControl label="Размер иконки" value={size} onValueChange={setSize} options={[12,16,20,24,32].map(n=>({value:String(n),label:String(n)}))}/>{selected&&<><UI.Icon name={selected.icon} size={Number(size)}/><span>{selected.name}</span></>}</div><UI.IconPicker value={value} onValueChange={setValue} options={options} iconSize={Number(size)}/>{selected&&<UI.CodeBlock label="icon.tsx" language="tsx">{`import { ${selected.keywords?.split(' ')[0]??selected.name} } from 'lucide-react';\nimport { Icon } from '${UI.SLOY_UI.packageName}';\n\n<Icon name={${selected.keywords?.split(' ')[0]??selected.name}} size={${size}} />`}</UI.CodeBlock>}<span className="catalog-muted">{options.length} иконок Lucide</span></div>;
}
