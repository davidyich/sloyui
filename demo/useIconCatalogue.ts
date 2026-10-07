import { useEffect, useState } from 'react';
import { iconNames, type IconOption } from '../src';
const fallback: IconOption[]=iconNames.map(name=>({name,icon:name}));
let request: Promise<IconOption[]> | undefined;
export function useIconCatalogue(enabled=true) {
 const [options,setOptions]=useState<IconOption[]>(fallback);
 useEffect(()=>{if(!enabled)return;let active=true;request??=import('./icon-catalogue').then(module=>module.iconOptions);request.then(value=>{if(active)setOptions(value);}).catch(()=>{request=undefined;});return()=>{active=false;};},[enabled]);
 return options;
}
