// Development-only audit surface. Never included in production builds.
import axe from 'axe-core';
const button = document.createElement('button');
button.textContent = 'Run accessibility audit';
button.dataset.testid = 'run-audit';
button.style.cssText = 'position:fixed;bottom:0;left:0;z-index:1000;font:12px system-ui;background:#fff;color:#000;padding:4px;border:1px solid #000';
document.body.append(button);
const result = document.createElement('pre'); result.id = 'audit-result'; result.hidden = true; document.body.append(result);
const runAudit = async () => {
  result.textContent = ''; result.dataset.state = 'running';
  // Check settled colors, not an intermediate opacity frame of an opening popup.
  await Promise.all(document.getAnimations().filter(animation=>animation.playState==='running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished.catch(()=>undefined)));
  const data = await axe.run(document.querySelector('[role="dialog"][aria-modal="true"]:not([aria-hidden="true"])') ?? document.body);
  const main = document.querySelector<HTMLElement>('.catalog-main');
  const api = document.querySelector<HTMLDetailsElement>('.catalog-api'), code = api?.open ? api.querySelector<HTMLElement>('.cap-code') : null;
  const apiBounds = api?.getBoundingClientRect(), codeBounds = code?.getBoundingClientRect();
  const apiInsets = apiBounds && codeBounds ? {left:codeBounds.left-apiBounds.left,right:apiBounds.right-codeBounds.right,bottom:apiBounds.bottom-codeBounds.bottom} : null;
  const summary = api?.querySelector<HTMLElement>('summary'), summaryBounds = summary?.getBoundingClientRect();
  const apiSummary = apiBounds && summaryBounds && summary ? {left:summaryBounds.left-apiBounds.left,top:summaryBounds.top-apiBounds.top,right:apiBounds.right-summaryBounds.right,bottom:api?.open ? null : apiBounds.bottom-summaryBounds.bottom,paddingInline:parseFloat(getComputedStyle(summary).paddingInlineStart)} : null;
  const layoutFailures: string[] = [];
  if (apiSummary && (Math.min(apiSummary.left,apiSummary.top,apiSummary.right) < 6 || Math.max(apiSummary.left,apiSummary.top,apiSummary.right)-Math.min(apiSummary.left,apiSummary.top,apiSummary.right)>1 || apiSummary.paddingInline < 8)) layoutFailures.push('API disclosure requires equally inset hover/focus bounds and padded text');
  if (apiSummary?.bottom != null && Math.abs(apiSummary.bottom-apiSummary.top)>1) layoutFailures.push('Closed API disclosure requires the same bottom and top inset');
  if (document.documentElement.scrollHeight > innerHeight + 1) layoutFailures.push('Document must not become a second vertical scroll container');
  if (document.documentElement.scrollWidth > innerWidth + 1 || (main && main.scrollWidth > main.clientWidth + 1)) layoutFailures.push('Unexpected horizontal page overflow');
  if (apiInsets && (Math.min(apiInsets.left,apiInsets.right,apiInsets.bottom) < 12 || Math.max(apiInsets.left,apiInsets.right,apiInsets.bottom)-Math.min(apiInsets.left,apiInsets.right,apiInsets.bottom)>1)) layoutFailures.push('API CodeBlock requires equal visible side and bottom insets');
  result.textContent = JSON.stringify({ url: location.hash, theme: document.documentElement.dataset.theme, borders: document.documentElement.dataset.borders, surface: document.querySelector('.catalog-preview')?.getAttribute('data-surface'), viewport: {width: innerWidth, height: innerHeight}, documentWidth: document.documentElement.scrollWidth, documentHeight:document.documentElement.scrollHeight, main: main ? {width:main.clientWidth,scrollWidth:main.scrollWidth,height:main.clientHeight,scrollHeight:main.scrollHeight,scrollTop:main.scrollTop} : null, apiInsets, apiSummary, radius:document.documentElement.dataset.radius, layoutFailures, violations: data.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  result.dataset.state = 'done';
};

button.onclick = runAudit;
window.addEventListener("keydown", event => { if (event.ctrlKey && event.altKey && event.code === "KeyA") { event.preventDefault(); void runAudit(); } });
