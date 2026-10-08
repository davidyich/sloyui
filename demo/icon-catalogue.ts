import * as lucide from 'lucide-react';
import { type IconOption, type IconSource } from '../src';
// The lazy demo catalog includes canonical Lucide names, export aliases and kit names.
const kitAliases: Record<string,string> = {Square:'border',PanelsTopLeft:'table',SlidersHorizontal:'sliders',Minus:'minus',ArrowDownWideNarrow:'sort',Mic:'microphone',Plus:'plus',Search:'search',X:'close',Check:'check',ChevronRight:'chevron',ChevronDown:'down',Menu:'menu',Grid2X2:'grid',FileText:'page',BookOpen:'book',Box:'cube',CalendarDays:'calendar',Sun:'sun',Moon:'moon',Settings:'settings',Copy:'copy',ArrowRight:'arrow',ExternalLink:'external',Code:'code',Folder:'folder',Tag:'tag',Sparkles:'sparkle',Info:'info',TriangleAlert:'warning',Trash2:'trash',Ellipsis:'more',ListFilter:'filter',List:'list',Clock:'clock',Layers:'layers',Heart:'heart',PanelLeft:'panelLeft',PanelRight:'panelRight'};
const namesByGlyph = new Map<unknown,string[]>();
for(const [name,glyph] of Object.entries(lucide)) {
 const names=namesByGlyph.get(glyph)??[]; names.push(name); namesByGlyph.set(glyph,names);
}
const synonyms: Record<string,string>={Search:'find поиск',X:'dismiss cancel закрыть',Folder:'directory папка',FileText:'document файл документ',Trash2:'delete удалить',Settings:'cog настройки'};
export const iconOptions: IconOption[]=Object.entries(lucide.icons).map(([name,icon])=>({name:kitAliases[name]??name,icon:icon as IconSource,keywords:[name,...namesByGlyph.get(icon)??[],synonyms[name]??''].join(' ')}));
