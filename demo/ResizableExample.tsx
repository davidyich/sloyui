import {useState} from 'react';
import * as UI from '../src';
export function ResizableExample({orientation='horizontal',withHandle=true,nested=true,disabled=false,minSize=15}:{orientation?:'horizontal'|'vertical';withHandle?:boolean;nested?:boolean;disabled?:boolean;minSize?:number}){
 const t=UI.useTranslate();const [layout,setLayout]=useState([35,65]);
 const content=(title:string,description:string)=><div className="catalog-resize-content"><strong>{title}</strong><p>{description}</p></div>;
 return <div className="catalog-resize-example"><UI.ResizablePanelGroup orientation={orientation} layout={layout} onLayoutChange={setLayout} disabled={disabled} label={t('Рабочее пространство','Workspace')}>
  <UI.ResizablePanel minSize={minSize} surface="canvas" label={t('Навигация','Navigation')}>{content(t('Коллекции','Collections'),t('Идеи, проекты, заметки.','Ideas, projects, notes.'))}</UI.ResizablePanel>
  <UI.ResizableHandle withHandle={withHandle}/>
  <UI.ResizablePanel minSize={minSize} label={t('Содержимое','Content')}>{nested?<UI.ResizablePanelGroup orientation={orientation==='horizontal'?'vertical':'horizontal'} defaultLayout={[60,40]} disabled={disabled} label={t('Области документа','Document areas')}><UI.ResizablePanel minSize={20} surface="raised">{content(t('Документ','Document'),t('Содержимое подстраивается под размер панели.','Content adapts to the panel size.'))}</UI.ResizablePanel><UI.ResizableHandle withHandle={withHandle}/><UI.ResizablePanel minSize={20} surface="canvas">{content(t('Заметки','Notes'),t('Вложенная группа на второй оси.','A nested group on the second axis.'))}</UI.ResizablePanel></UI.ResizablePanelGroup>:content(t('Документ','Document'),t('Потяните разделитель или используйте стрелки.','Drag the separator or use arrow keys.'))}</UI.ResizablePanel>
 </UI.ResizablePanelGroup><output className="catalog-resize-values" aria-live="off">{layout.map(value=>`${Math.round(value)}%`).join(' / ')}</output></div>;
}
export function ResizablePanelGroupStory(){const t=UI.useTranslate();return <section className="catalog-story"><h2>{t('Панели на двух осях','Panels on two axes')}</h2><ResizableExample/></section>;}
