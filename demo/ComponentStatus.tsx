import {Tag,type Color} from '../src';
import {componentStatuses,type ComponentStatus} from './catalog';
import {useCatalogText} from './catalog-locale';

const statusColors:Record<ComponentStatus,Color>={ready:'neutral','needs-review':'pink','not-ready':'orange',archived:'neutral'};

export function ComponentStatusTag({status}:{status:ComponentStatus}) {
 const c=useCatalogText();
 return <Tag className="catalog-status-tag" data-status={status} color={statusColors[status]} size="xs" interactive={false}>{c(componentStatuses[status])}</Tag>;
}

export function ComponentStatusDot({status,title}:{status:ComponentStatus;title?:string}) {
 const c=useCatalogText();
 return <span className="catalog-review-dot" data-status={status} data-accent={statusColors[status]} role="img" aria-label={c(componentStatuses[status])} title={title??c(componentStatuses[status])}/>;
}
