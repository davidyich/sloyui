import {createRoot} from 'react-dom/client';
import {LocaleProvider} from '../../src';
import {TabsGroupsExample} from '../../demo/TabsGroupsExample';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
createRoot(document.getElementById('root')!).render(<LocaleProvider locale="en"><main data-theme="dark" data-surface="base" data-borders="off" data-radius="default" style={{padding:32,minHeight:'100vh',fontFamily:'var(--cap-font-sans)',background:'var(--cap-surface-current)',color:'var(--cap-content-primary)'}}><h1>Project board</h1><TabsGroupsExample/></main></LocaleProvider>);
