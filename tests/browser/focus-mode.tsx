import {createRoot} from 'react-dom/client';
import {Button, Input, Select} from '../../src';
import '../../src/styles/styles.css';

createRoot(document.getElementById('root')!).render(<main data-focus-ring="off" style={{padding:32,display:'grid',gap:16}}>
 <Button id="off">Off</Button>
 <Input label="Off field"/>
 <Select label="Off menu" options={[{value:'one',label:'One'},{value:'two',label:'Two'}]} />
 <section data-focus-ring="on"><Button id="nested-on">Nested on</Button><section data-focus-ring="off"><Button id="nested-off">Nested off</Button></section></section>
</main>);
