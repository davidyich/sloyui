import {createRoot} from 'react-dom/client';
import {Accordion,Button,LocaleProvider} from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
createRoot(document.getElementById('root')!).render(<LocaleProvider locale="en"><main style={{fontFamily:'var(--cap-font-sans)'}}>{(['light','dark'] as const).map(theme=><section key={theme} data-theme={theme} data-surface="base" style={{padding:24,background:'var(--cap-surface-current)',color:'var(--cap-content-primary)'}}><h1>{theme} accordion</h1><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:24}}>{(['default','navigation','bouncy'] as const).map(variant=><Accordion key={variant} title={`${theme} ${variant}`} variant={variant} icon="folder" defaultOpen><p>One quiet surface includes this content.</p><Button size="sm">Content action</Button></Accordion>)}</div><p>Move the pointer here to leave the accordion.</p></section>)}</main></LocaleProvider>);
