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
  const data = await axe.run(document.querySelector('[role="dialog"][aria-modal="true"]:not([aria-hidden="true"])') ?? document.body);
  result.textContent = JSON.stringify({ url: location.hash, theme: document.documentElement.dataset.theme, borders: document.documentElement.dataset.borders, surface: document.querySelector('.catalog-preview')?.getAttribute('data-surface'), viewport: {width: innerWidth, height: innerHeight}, documentWidth: document.documentElement.scrollWidth, main: (() => { const main = document.querySelector('.catalog-main'); return main ? {width: main.clientWidth, scrollWidth: main.scrollWidth} : null; })(), violations: data.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  result.dataset.state = 'done';
};

button.onclick = runAudit;
window.addEventListener("keydown", event => { if (event.ctrlKey && event.altKey && event.code === "KeyA") { event.preventDefault(); void runAudit(); } });
