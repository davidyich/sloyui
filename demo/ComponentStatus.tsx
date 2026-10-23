import {Tag,Menu,type Color} from '../src';
import {useState} from 'react';
import {useCatalogAdmin} from './CatalogAdmin';
import {saveCatalog} from './catalog-state';
import {componentStatuses,type ComponentStatus} from './catalog';
import {useCatalogText} from './catalog-locale';

const statusColors:Record<ComponentStatus,Color>={ready:'neutral','needs-review':'pink','not-ready':'orange',archived:'neutral'};

export function ComponentStatusTag({status,componentId}:{status:ComponentStatus;componentId?:string}) {
 const c=useCatalogText();
 const {admin,notify}=useCatalogAdmin(),[busy,setBusy]=useState(false);
 const tag=<Tag className="catalog-status-tag" data-status={status} color={statusColors[status]} size="xs" interactive={false}>{c(componentStatuses[status])}</Tag>;
 if(!admin||!componentId)return tag;
 return <span className="catalog-status-editor"><Menu label={`${c('Статус компонента')} · ${componentId}`} triggerContent={tag} size="xs" disabled={busy} items={Object.entries(componentStatuses).map(([value,label])=>({id:value,label:c(label),icon:value===status?'check':undefined,onSelect:async()=>{setBusy(true);try{await saveCatalog(`components/${componentId}`,{status:value});notify(c('Статус сохранён'));}catch(error){notify((error as Error).message);}finally{setBusy(false);}}}))}/></span>;
}

export function ComponentStatusDot({status,title}:{status:ComponentStatus;title?:string}) {
 const c=useCatalogText();
 return <span className="catalog-review-dot" data-status={status} data-accent={statusColors[status]} role="img" aria-label={c(componentStatuses[status])} title={title??c(componentStatuses[status])}/>;
}
