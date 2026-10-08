import { createRoot } from 'react-dom/client';
import { LocaleProvider, Menu } from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';

const themes = ['light', 'dark'] as const, borders = ['off', 'on'] as const, radii = ['compact', 'default', 'rounded'] as const;
createRoot(document.getElementById('root')!).render(<LocaleProvider locale="en"><main style={{fontFamily:'var(--cap-font-sans)'}}>{themes.map(theme=><section key={theme} data-theme={theme} data-surface="base" style={{padding:24,background:'var(--cap-surface-current)',color:'var(--cap-content-primary)'}}><h1>{theme} menus</h1><div style={{display:'flex',gap:24,flexWrap:'wrap'}}>{borders.flatMap(border=>radii.map(radius=><article key={border+radius} data-borders={border} data-radius={radius} style={{display:'grid',gap:8,padding:8}}><span>{border} / {radius}</span><Menu label={`${theme}/${border}/${radius}`} items={[{id:'open',label:'Open',icon:'page'},{id:'duplicate',label:'Duplicate',icon:'copy'},{id:'delete',label:'Delete',icon:'trash',separator:true,danger:true}]}/></article>))}</div></section>)}</main></LocaleProvider>);
