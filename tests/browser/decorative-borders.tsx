import '../../src/styles/styles.css';

const root = document.getElementById('root')!;
root.style.cssText = 'padding:24px;font:14px Inter,sans-serif';
const heading = document.createElement('h1');
heading.textContent = 'Decorative border inheritance';
root.append(heading);
const receipt = document.createElement('pre');
receipt.id = 'decorative-border-report';
receipt.setAttribute('role', 'status');
receipt.textContent = 'Running computed paint checks…';
root.append(receipt);
const host = document.createElement('section');
host.dataset.borders = 'on';
host.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px';
root.append(host);
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const context = canvas.getContext('2d')!;
const alpha = (paint: string) => {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = paint;
  context.fillRect(0, 0, 1, 1);
  return context.getImageData(0, 0, 1, 1).data[3];
};
const results: { theme: string; surface: string; accent: string; borders: string; role: string; alpha: number; expected: number }[] = [];
for (const theme of ['light', 'dark']) for (const surface of ['shell', 'workspace', 'content', 'overlay', 'invert', 'glass']) for (const accent of ['blue', 'green', 'orange', 'yellow', 'red', 'pink', 'purple']) {
  const local = document.createElement('section');
  Object.assign(local.dataset, { theme, surface, accent });
  local.className = 'cap-surface';
  local.style.cssText = 'padding:12px;color:var(--cap-content-primary)';
  const label = document.createElement('strong');
  label.textContent = `${theme}/${surface}/${accent}`;
  local.append(label);
  host.append(local);
  for (const borders of ['inherit', 'off', 'nested-on']) {
    const scope = document.createElement('div');
    if (borders !== 'inherit') scope.dataset.borders = 'off';
    local.append(scope);
    const nested = document.createElement('div');
    if (borders === 'nested-on') nested.dataset.borders = 'on';
    nested.style.cssText = 'display:flex;gap:4px;margin-top:8px;align-items:center';
    nested.append(`${borders}: `);
    scope.append(nested);
    for (const [role, expected] of [['control-border', 140], ['accent-outline', 64], ['accent-outline-hover', 64], ['accent-outline-pressed', 64], ['focus-ring', 255], ['accent-border', 255]] as const) {
      const probe = document.createElement('span');
      probe.title = role;
      probe.style.cssText = `display:inline-block;width:16px;height:16px;border:2px solid var(--cap-${role})`;
      nested.append(probe);
      results.push({ theme, surface, accent, borders, role, alpha: alpha(getComputedStyle(probe).borderTopColor), expected: borders === 'off' && !['focus-ring', 'accent-border'].includes(role) ? 0 : expected });
    }
  }
}
const failures = results.filter(result => Math.abs(result.alpha - result.expected) > 1);
receipt.dataset.result = failures.length ? 'fail' : 'pass';
receipt.textContent = JSON.stringify({ result: failures.length ? 'FAIL' : 'PASS', checks: results.length, failures: failures.length, scope: 'Both themes, six surfaces, seven accents; inherited On, nested Off, nested On; focus and semantic pigments opaque.', examples: failures.slice(0, 8) }, null, 2);
