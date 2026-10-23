import * as UI from '../src';
import type {CatalogState} from './catalog-state';

export type AnnouncementDraft={message:string;actionLabel:string;href:string};
export function announcementDraft(item:CatalogState['settings']['announcement']):AnnouncementDraft{
 return {message:item.message,actionLabel:item.actionLabel,href:item.href};
}
export function sameAnnouncement(a:AnnouncementDraft,b:AnnouncementDraft){return a.message===b.message&&a.actionLabel===b.actionLabel&&a.href===b.href;}
export function validAnnouncementHref(value:string){
 const href=value.trim();if(!href||/[\s\u0000-\u001f\u007f\\]/.test(href))return false;
 if(href.startsWith('#'))return href.length>1;
 if(href.startsWith('/'))return !href.startsWith('//');
 try{const url=new URL(href);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function parseAnnouncementMessage(message:string){
 const parts:{text:string;highlight:boolean}[]=[];
 const pattern=/\[([^\[\]]+)\]/g;let cursor=0;
 for(const match of message.matchAll(pattern)){
  if(match.index>cursor)parts.push({text:message.slice(cursor,match.index),highlight:false});
  parts.push({text:match[1],highlight:true});cursor=match.index+match[0].length;
 }
 if(cursor<message.length)parts.push({text:message.slice(cursor),highlight:false});
 return parts;
}
export function CatalogAnnouncementMessage({message,actionLabel,href}:{message:string;actionLabel:string;href:string}){
 return <span className="catalog-announcement-message"><span className="catalog-announcement-copy">{parseAnnouncementMessage(message).map((part,index)=>part.highlight?<UI.Tag key={index} size="xs" interactive={false}><span className="catalog-announcement-highlight">{part.text}</span></UI.Tag>:<span key={index} className="catalog-announcement-text">{part.text}</span>)}</span><UI.Button className="catalog-announcement-cta" variant="primary" size="xs" disabled={!validAnnouncementHref(href)||!actionLabel.trim()} onClick={()=>location.assign(href.trim())}><span className="catalog-announcement-action-label">{actionLabel}</span></UI.Button></span>;
}
