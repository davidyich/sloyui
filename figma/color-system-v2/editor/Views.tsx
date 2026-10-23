import React, { type CSSProperties, type ReactElement } from 'react';
import { Circle, Pencil } from 'lucide-react';
import { Button, Icon, Popover, Tooltip } from '../../../src/index';
import { css, toHex, toHsl, contrast, composite, fromHex, type Context, type Color, type PaletteScale } from './model.mjs';
import './views.css';

export const roles = ['tertiary/normal', 'tertiary/active', 'secondary/normal', 'secondary/active', 'primary/normal', 'primary/active', 'content/primary', 'content/secondary', 'content/on-primary', 'border'];
export const roleLabel = (role: string) => role.replace('content/', 'Content / ').replace('border', 'Border').replace('/normal', ' · normal').replace('/active', ' · active');
export const onLayer=(c:Context,layer:string):Context=>c.layerFills?.[layer]?{...c,fills:{...c.fills,...c.layerFills[layer]},references:{...c.references,...c.layerReferences[layer]}}:c;
export const valueOf = (c: Context, role: string) => role === 'border' ? c.border : role.startsWith('content/') ? c.content[role.slice(8)] : c.fills[role];
export const backing = (c: Context) => c.bg.a < 1 ? composite(c.bg, fromHex(c.theme === 'Light' ? '#000000' : '#FFFFFF')) : c.bg;
/** Glass is painted over a visible backdrop; only numeric diagnostics precompose it. */
export const surfaceBackground = (c: Context) => c.bg.a < 1 ? `linear-gradient(${css(c.bg)},${css(c.bg)}),linear-gradient(135deg,#000,#fff)` : css(c.bg);
export const readable = (bg: Color) => contrast(fromHex('#FFFFFF'), bg) > contrast(fromHex('#171717'), bg) ? '#FFFFFF' : '#171717';
export type Pick = (c: Context, role: string) => void;
/** Invert changes the painted surface, while the portal keeps the outer theme. */
export const contextTooltipVariant = (c: Context): 'default' | 'inverse' => c.effectiveTheme !== c.theme ? 'default' : 'inverse';
const round = (n: number) => Number(n.toFixed(1));
export const paletteDescription = 'Единая растяжка для всех ролей. Тема и поверхность влияют на выбор ступени и прозрачности.';
/** A small opaque sample separates the color itself from its context metadata. */
export function ColorHintRow({label,value,detail}:{label:string;value:Color;detail?:string}) {
    return <div className="cap-pl-hint-color"><i aria-hidden="true" style={{background:css({...value,a:1})}}/><div><span>{label}</span><code>{toHex(value)}{value.a<1&&` · α ${round(value.a*100)}%`}</code>{detail&&<small>{detail}</small>}</div></div>;
}
export function PaletteStepDetails({scale,step,contexts=[]}:{scale:PaletteScale;step:PaletteScale['steps'][number];contexts?:Context[]}) {
    const uses=contexts.flatMap(c=>Object.entries(c.references).filter(([,name])=>name===step.name).map(([role])=>({c,role})));
    const distinct=uses.filter((use,index)=>uses.findIndex(other=>other.c.theme===use.c.theme&&other.c.surface===use.c.surface&&other.role===use.role)===index);
    const hsl=toHsl(step.value);
    return <div className="cap-pl-token-hint cap-pl-color-hint">
      <ColorHintRow label={`${scale.label} · ${String(step.index).padStart(2,'0')}`} value={step.value} detail={step.authored?'Опорная точка':step.interpolated?'Интерполяция между опорными точками':undefined}/>
      <code className="cap-pl-hint-alias">{step.name}</code>
      <div className="cap-pl-hint-coordinates"><span>HSL {round(hsl.h)}° · {round(hsl.s)}% · {round(hsl.l)}%</span><span>OKLCH {round(step.l*100)}% · {step.c.toFixed(3)} · {round(step.h)}°</span></div>
      {distinct.length>0&&<div className="cap-pl-hint-group">{distinct.slice(0,4).map(({c,role})=>{
        const base=role==='content/on-primary'?composite(c.fills['primary/normal'],backing(c)):backing(c);
        return <ColorHintRow key={`${c.theme}/${c.surface}/${role}`} label={`${c.surface} · ${roleLabel(role)}`} value={composite(valueOf(c,role),base)}/>;
      })}{distinct.length>4&&<small>Ещё: {distinct.length-4}</small>}</div>}
    </div>;
}
export function PaletteStepHint({scale,step,contexts,children}:{scale:PaletteScale;step:PaletteScale['steps'][number];contexts:Context[];children:ReactElement<{'aria-describedby'?:string}>}) {
    return <Tooltip variant="inverse" content={<PaletteStepDetails scale={scale} step={step} contexts={contexts}/>}>{children}</Tooltip>;
}
export function FillPairDetails({c,role}:{c:Context;role:string}) {
    const base=backing(c),inkRole=role==='primary'?'on-primary':'primary';
    return <div className="cap-pl-token-hint cap-pl-color-hint"><strong>{role}</strong><div className="cap-pl-hint-group">{['normal','active'].map(state=><ColorHintRow key={state} label={state==='normal'?'Normal':'Active'} value={composite(c.fills[`${role}/${state}`],base)} detail={`${c.references[`${role}/${state}`]} · α ${round(c.fills[`${role}/${state}`].a*100)}%`}/>)}</div><ColorHintRow label={`Content / ${inkRole}`} value={composite(c.content[inkRole],composite(c.fills[`${role}/normal`],base))}/></div>;
}

/** Identical text, outline and solid shapes make the content color easy to compare. */
export function ContentSample({ small = false }: { small?: boolean }) {
    const size = small ? 12 : 18;
    return <span className="cap-pl-aa"><span>Aa</span><Icon name={Circle} size={size}/><Icon name={Circle} size={size} fill="currentColor" strokeWidth={0}/></span>;
}
/** An anchored annotation keeps diagnostics next to the relevant surface. */
export function ContextIssues({ c }: { c: Context }) {
    return <span className="cap-pl-context-annotation"><Popover label={`${c.issues.length ? `Замечания: ${c.issues.length}` : 'Проверки пройдены'} · ${c.accent} · ${c.surface}`} triggerIcon={c.issues.length ? 'warning' : 'check'} size="sm" align="end" className="cap-pl-annotation-panel">
        <header><strong>{c.accent}</strong><span>{c.theme} · {c.surface}</span></header>
        <ul>{c.issues.length ? c.issues.map(issue => <li key={issue}>{issue}</li>) : <li>Контраст текста, различимость заливок и состояний проверены на допустимых подложках.</li>}</ul>
    </Popover><span className="cap-pl-annotation-count" aria-hidden="true" hidden={!c.issues.length}>{c.issues.length}</span></span>;
}
/** Only the accent swatch reacts; its backing and local polarity stay unchanged. */
export function AccentSample({ c, role, onPick, label }: { c: Context; role: string; onPick: Pick; label?: string }) {
    return <Tooltip variant={contextTooltipVariant(c)} caption={`${c.theme} · ${c.surface}`} content={<FillPairDetails c={c} role={role}/>}>
        <button className={label ? 'cap-pl-interactive-fill' : 'cap-pl-overview-sample cap-pl-interactive-fill'} aria-label={`${c.accent} ${c.theme} ${c.surface} ${role}`} onClick={()=>onPick(c,role+'/normal')} style={{'--pl-fill-normal':css(c.fills[role+'/normal']),'--pl-fill-active':css(c.fills[role+'/active']),color:css(c.content[role==='primary'?'on-primary':'primary'])} as CSSProperties}>{label ?? <ContentSample small/>}</button>
    </Tooltip>;
}
function TokenHint({ c, role, children, onBase, baseLabel }: { c: Context; role: string; onBase?: Color; baseLabel?: string; children: ReactElement<{ 'aria-describedby'?: string }> }) {
    const base = onBase ?? (role === 'content/on-primary' ? composite(c.fills['primary/normal'], backing(c)) : backing(c)), value = valueOf(c, role), paint = composite(value, base);
    const ink = role.startsWith('primary/') ? c.content['on-primary'] : c.content.primary;
    const ratio = role.startsWith('content/') ? (role === 'content/on-primary' && !onBase ? c.primary.minimumContrast : contrast(paint, base)) : role === 'border' ? contrast(paint, base) : contrast(composite(ink, paint), paint);
    const issues = c.issues.filter(issue => role.startsWith('primary/') || role === 'content/on-primary' ? issue.startsWith('Primary') : role === 'border' ? issue.startsWith('Border') : issue.includes(role) || issue.startsWith('Порядок'));
    const isFill=!role.startsWith('content/')&&role!=='border';
    return <Tooltip variant={contextTooltipVariant(c)} caption={`${c.theme} · ${c.surface}${baseLabel ? ' / ' + baseLabel : ''}`} content={<div className="cap-pl-token-hint cap-pl-color-hint">
      <div className="cap-pl-hint-heading"><strong>{roleLabel(role)}</strong><span>{isFill?'Текст · ':''}{ratio.toFixed(2)}:1</span></div>
      <ColorHintRow label="Пигмент" value={value} detail={c.references[role]}/>
      <div className="cap-pl-hint-group"><ColorHintRow label={baseLabel??'Surface / bg'} value={base}/>{(value.a<1||toHex(paint)!==toHex(value))&&<ColorHintRow label="Результат" value={paint}/>}</div>
      {isFill&&<small>Заливка к фону · {contrast(paint,base).toFixed(2)}:1</small>}
      {isFill&&<ColorHintRow label={`Content / ${role.startsWith('primary/')?'on-primary':'primary'}`} value={composite(ink,paint)}/>}
      {issues.slice(0, 3).map((issue, i) => <span className="cap-pl-hint-issue" key={i}>{issue}</span>)}
    </div>}>{children}</Tooltip>;
}
function Swatch({ c, role, onPick, small = false, onBase, baseLabel }: { c: Context; role: string; onPick: Pick; small?: boolean; onBase?: Color; baseLabel?: string }) {
    const ink = c.content[role.startsWith('primary') ? 'on-primary' : 'primary'], fill = c.fills[role], paint = composite(fill, onBase ?? backing(c));
    return <TokenHint c={c} role={role} onBase={onBase} baseLabel={baseLabel}><button className={`cap-pl-swatch cap-pl-sample-action${small ? ' cap-pl-mini' : ''}`} style={{ background: css(fill), color: css(ink) }} onClick={() => onPick(c, role)} aria-label={`${c.theme} ${c.surface} ${role}`}><ContentSample small={small}/>{!small && <span className="cap-pl-swatch-meta"><span>{role.endsWith('active') ? 'Active' : 'Normal'}</span><span>{contrast(composite(ink, paint), paint).toFixed(2)}:1</span></span>}</button></TokenHint>;
}
export function Preview({ c, onPick }: { c: Context; onPick: Pick }) {
    const base = backing(c), text = readable(base);
    return <section data-theme={c.theme.toLowerCase()} className={`cap-pl-preview ${c.surface === 'Glass' ? 'cap-pl-glass' : ''}`} style={{ background: surfaceBackground(c), color: text, '--pl-line': css(c.border) } as CSSProperties} aria-label={`${c.theme} ${c.surface} preview`}>
        <header className="cap-pl-preview-heading"><span><Icon name={c.theme === 'Light' ? 'sun' : 'moon'} size={16}/>{c.theme}</span><code>{toHex(c.bg)}{c.bg.a < 1 ? ` · ${round(c.bg.a * 100)}%` : ''}</code><ContextIssues c={c}/></header>
        <div className="cap-pl-role-grid">{['primary', 'secondary', 'tertiary'].map(role => <div key={role}><div className="cap-pl-role-label">{role}</div><div className="cap-pl-pair">{['normal', 'active'].map(state => <Swatch key={state} c={c} role={`${role}/${state}`} onPick={onPick}/>)}</div></div>)}</div>
        <div className="cap-pl-content-row">{['primary', 'secondary'].map(role => <TokenHint key={role} c={c} role={'content/' + role}><button className="cap-pl-sample-action" style={{ color: css(c.content[role]) }} onClick={() => onPick(c, 'content/' + role)}><ContentSample/><span>Content / {role}</span></button></TokenHint>)}</div>
        <div className="cap-pl-nested"><p>На нейтральных слоях</p>{['tertiary', 'secondary'].map(role => <div key={role} className="cap-pl-backing" style={{ background: css(c.neutral[role + '/normal']) }}><span>{role}</span><div>{['tertiary/normal', 'tertiary/active', 'secondary/normal', 'secondary/active'].map(r => <Swatch key={r} c={onLayer(c,role+'/normal')} role={r} onPick={onPick} onBase={composite(c.neutral[role + '/normal'], base)} baseLabel={`neutral ${role}`} small/>)}</div></div>)}</div>
        <div className="cap-pl-example"><div><span className="cap-pl-tag" style={{ background: css(c.fills['secondary/normal']), color: css(c.content.primary) }}>В работе</span><strong>Новая коллекция</strong><span style={{ color: css(c.content.secondary) }}>Идеи и материалы</span></div><Button className="cap-pl-example-action" style={{ background: css(c.primary.normal), color: css(c.primary.foreground) }} size="md" onClick={() => onPick(c, 'primary/normal')} trailing={<Icon name="external" size={16}/>}>Открыть</Button></div>
        <footer><span><Icon name={c.issues.length ? 'warning' : 'check'} size={14}/>{c.issues.length ? 'Есть замечания' : 'Заливки и текст проверены'}</span><span>Текст ≥ {c.minimumText.toFixed(2)}:1</span></footer>
    </section>;
}
export function Matrix({ contexts, onPick }: { contexts: Context[]; onPick: Pick }) {
    return <div className="cap-pl-matrix">{contexts.map(c => <article data-theme={c.theme.toLowerCase()} key={c.theme + c.surface} className="cap-pl-matrix-card" style={{ background: surfaceBackground(c), color: readable(backing(c)) }} aria-label={`${c.theme} ${c.surface}`}>
        <header><strong>{c.surface}</strong><span className="cap-pl-matrix-meta">{c.theme}<ContextIssues c={c}/></span></header>
        <div className="cap-pl-matrix-samples">{['primary','secondary','tertiary'].map(role=><div key={role}><span>{role}</span><AccentSample c={c} role={role} onPick={onPick}/></div>)}</div>
        <footer><code>{toHex(c.bg)}</code><span>{c.minimumText.toFixed(2)}:1</span></footer>
    </article>)}</div>;
}
export function Palettes({ contexts, onPick }: { contexts: Context[]; onPick: Pick }) {
    return <div className="cap-pl-ramps">{contexts.map(c => {
        const base = backing(c), bases = [{ label: 'Surface / bg', value: base,context:c }, ...['tertiary', 'secondary'].map(role => ({ label: `Neutral / ${role}`, value: composite(c.neutral[role + '/normal'], base),context:onLayer(c,role+'/normal') }))];
        return <section data-theme={c.theme.toLowerCase()} className="cap-pl-ramp cap-pl-composite-ramp" key={c.theme + c.surface} aria-label={`Роли ${c.theme} ${c.surface}`}><header><h2>{c.surface}</h2><span>{c.theme}</span><ContextIssues c={c}/></header><div className="cap-pl-composite-head"><span>Роль</span>{bases.map(item => <span key={item.label}>{item.label}<code>{toHex(item.value)}</code></span>)}</div><div className="cap-pl-ramp-rows">{roles.map(role => <div className="cap-pl-ramp-row cap-pl-composite-row" key={role}><span className="cap-pl-composite-label">{roleLabel(role)}</span>{bases.map(item => {
            const paint = composite(valueOf(item.context, role), item.value);
            return <TokenHint key={item.label} c={item.context} role={role} onBase={item.value} baseLabel={item.label}><button className="cap-pl-composite-cell cap-pl-color-cell" style={{ background: css(paint), color: readable(paint) }} onClick={() => onPick(item.context, role)} aria-label={`${c.theme} ${c.surface} ${role} на ${item.label}`}><code>{toHex(paint)}</code></button></TokenHint>;
        })}</div>)}</div></section>;
    })}</div>;
}
export function Ramps({ scales, contexts, onCopy }: { scales: PaletteScale[]; contexts: Context[]; onCopy: (value: string) => void }) {
    return <div className="cap-pl-base-ramps">{scales.map(scale => <section key={scale.id} className="cap-pl-base-ramp" aria-label="Единая палитра">
        <header><Tooltip variant="inverse" content={paletteDescription}><h2 className="cap-pl-help-label" tabIndex={0}>Единая растяжка</h2></Tooltip><span>{scale.steps.length} ступеней</span></header>
        <div className="cap-pl-ramp-rows">{scale.steps.map(step => <PaletteStepHint key={step.name} scale={scale} step={step} contexts={contexts}>
          <button className="cap-pl-base-step cap-pl-color-cell" aria-label={`${step.name} ${toHex(step.value)}`} style={{ background: css(step.value), color: readable(step.value) }} onClick={() => onCopy(toHex(step.value))}><b>{String(step.index).padStart(2, '0')}</b><code>{toHex(step.value)}</code>{step.authored&&<Icon name={Pencil} size={12}/>}</button>
        </PaletteStepHint>)}</div>
    </section>)}</div>;
}
