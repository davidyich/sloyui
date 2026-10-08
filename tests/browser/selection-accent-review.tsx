import { createRoot } from 'react-dom/client';
import { Button, Checkbox, Radio, RadioGroup, Slider, Switch } from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';

createRoot(document.getElementById('root')!).render(<main style={{fontFamily:'var(--cap-font-sans)'}}>
  {(['light','dark'] as const).map(theme=><section key={theme} data-theme={theme} data-surface="base" style={{padding:24,background:'var(--cap-surface-current)',color:'var(--cap-content-primary)'}}>
    <h1>{theme}</h1>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:24}}>
      {(['neutral','blue','rose'] as const).map(accent=><article key={accent} data-accent={accent}>
        <h2>{accent}</h2>
        {[true,false].map(contrast=><div key={String(contrast)} data-selection-check={`${theme}/${accent}/${contrast}`} style={{display:'grid',gap:12,marginBottom:24}}>
          <h3>{contrast?'Solid selection':'Soft selection'}</h3>
          <span hidden data-accent-pair style={{background:`var(--cap-accent-${contrast?'solid-':''}normal)`,color:`var(--cap-accent-${contrast?'solid-':''}text)`}} />
          <span hidden data-neutral-pair style={{background:`var(--cap-${contrast?'action':'control'}-normal)`,color:`var(--cap-${contrast?'action':'control'}-text)`}} />
          <Checkbox label="Checkbox" defaultChecked contrast={contrast}/>
          <Radio label="Radio" name={`${theme}/${accent}/${contrast}`} defaultChecked contrast={contrast}/>
          <Switch label="Accent switch" defaultChecked contrast={contrast}/>
          <Switch label="Neutral switch" defaultChecked variant="neutral" contrast={contrast}/>
          <RadioGroup label="Radio group" defaultValue="a" contrast={contrast} options={[{value:'a',label:'Option A'},{value:'b',label:'Option B'}]}/>
          <Slider label="Density" defaultValue={60} contrast={contrast}/>
          <Button variant="primary">Primary button</Button>
        </div>)}
      </article>)}
    </div>
  </section>)}
</main>);
