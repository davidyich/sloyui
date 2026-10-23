/** Resolve neutral surface/control targets to the shared opaque neutral ramp.
 * Selection is constrained: choose states together so rounding cannot collapse
 * them. No color is generated here. Accent roles are selected once, afterwards,
 * by Palette Lab against these actual neutral backings.
 */
export function selectPaletteColors({ contexts, rawColors, source }) {
  const linear = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
  const luminance = c => .2126 * linear(c.r) + .7152 * linear(c.g) + .0722 * linear(c.b);
  const contrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  const distance = (a, b) => Math.log((a + .05) / (b + .05)) ** 2;
  const assert = (value, message) => { if (!value) throw new Error('Palette selection: ' + message); };
  const original = [...rawColors].filter(([path, value]) => /^Palette\/(?:[a-z]+\/\d+|black|white)$/.test(path) && value.a === 1).map(([path, value]) => ({ path, value, y: luminance(value) }));
  assert(original.length === source.paletteSelection.opaqueCount, 'expected the complete shared palette');
  const gray = original.filter(c => c.path.startsWith('Palette/gray/'));
  const nearest = (candidates, target, predicate = () => true) => candidates.filter(predicate).reduce((best, candidate) => !best || distance(candidate.y, target) < distance(best.y, target) ? candidate : best, null);
  const states = ['normal', 'hover', 'pressed'];
  const minimumState = source.secondary.minimumStateContrast;
  const minimumSurface = source.secondary.minimumSurfaceContrast ?? 1.025;
  const report = { opaquePaletteCount: original.length, secondary: [], primary: [], surfaces: [], focus: [], neutralContent: [], aaaFallbacks: [] };
  const output = structuredClone(contexts);

  // Shell < Workspace < Content in Light. A nearest-only mapping would merge
  // Workspace and Content into white; jointly pick three ordered ramp entries.
  const lightTargets = ['Shell', 'Workspace', 'Content'].map(surface => luminance(contexts[surface].Light['surface/bg']));
  let lightSurfaces;
  for (const a of gray) for (const b of gray) for (const c of gray) {
    if (!(a.y < b.y && b.y < c.y)) continue;
    const values = [a, b, c], cost = values.reduce((sum, value, i) => sum + distance(value.y, lightTargets[i]), 0);
    if (!lightSurfaces || cost < lightSurfaces.cost) lightSurfaces = { cost, values };
  }
  assert(lightSurfaces, 'cannot preserve ordered light surface regions');
  const lightSurfaceMap = Object.fromEntries(['Shell', 'Workspace', 'Content'].map((surface, i) => [surface, lightSurfaces.values[i]]));

  function triple(candidates, target, direction, predicate, inkCandidates, inkTarget, inkThreshold, fixedFirst = null) {
    let best;
    for (const a of candidates) {
      if (fixedFirst && a.path !== fixedFirst.path) continue;
      for (const b of candidates) {
        if (direction * (b.y - a.y) <= 0 || contrast(a.y, b.y) < minimumState) continue;
        for (const c of candidates) {
          if (direction * (c.y - b.y) <= 0 || contrast(b.y, c.y) < minimumState) continue;
          const values = [a, b, c];
          if (!values.every(predicate)) continue;
          const ink = nearest(inkCandidates, inkTarget, x => values.every(fill => contrast(fill.y, x.y) >= inkThreshold));
          if (!ink) continue;
          const cost = values.reduce((sum, value, i) => sum + distance(value.y, target[i]), 0) + .4 * distance(ink.y, inkTarget);
          if (!best || cost < best.cost) best = { cost, values, ink };
        }
      }
    }
    return best;
  }

  for (const [surface, themeContexts] of Object.entries(contexts)) for (const [theme, target] of Object.entries(themeContexts)) {
    const dark = theme === 'Dark', roles = output[surface][theme];
    const overlayContrast = dark && surface === 'Overlay' ? source.secondary.darkOverlay : null;
    const bg = !dark && lightSurfaceMap[surface] ? lightSurfaceMap[surface] : nearest(gray, luminance(target['surface/bg']));
    const block = nearest(gray, luminance(target['surface/block']), c => dark ? c.y > bg.y : c.y < bg.y);
    assert(bg && block, 'missing surface pair: ' + surface + '/' + theme);
    roles['surface/bg'] = bg.value; roles['surface/block'] = block.value;
    report.surfaces.push({ surface, theme, bg: bg.path, block: block.path });
    const localBackgrounds = [bg, block];

    {
      const hue = 'neutral', ramp = gray;
      const targetYs = states.map(state => luminance(target[`secondary/${hue}-${state}`]));
      const targetInk = luminance(target[`secondary/${hue}-content`]);
      const baselineInk = nearest(ramp, .72);
      const possibleInks = ramp.filter(c => !dark || c.y >= Math.max(.85, baselineInk.y));
      let selected, selectedThreshold;
      for (const threshold of [7, 4.5]) {
        const inks = possibleInks.filter(c => [bg, block].every(fill => contrast(fill.y, c.y) >= threshold));
        selected = triple(ramp, targetYs, dark ? 1 : -1,
          c => (dark ? c.y > bg.y : c.y < bg.y) && contrast(c.y, bg.y) >= (overlayContrast?.minimumBgContrast ?? minimumSurface) &&
            (!overlayContrast || c.y > block.y && contrast(c.y, block.y) >= overlayContrast.minimumBlockContrast),
          inks, targetInk, threshold, !overlayContrast ? block : null);
        if (selected) { selectedThreshold = threshold; break; }
      }
      assert(selected, 'no accessible secondary state triple: ' + [surface, theme, hue].join('/'));
      roles[`secondary/${hue}-content`] = selected.ink.value;
      const minimumContrast = Math.min(...[bg, block, ...selected.values].map(fill => contrast(fill.y, selected.ink.y)));
      const record = { surface, theme, hue, paths: selected.values.map(c => c.path), content: selected.ink.path,
        minimumContrast, minimumStateContrast: Math.min(...selected.values.slice(1).map((c, i) => contrast(c.y, selected.values[i].y))),
        contentLuminance: selected.ink.y, baselineContentLuminance: baselineInk.y };
      report.secondary.push(record);
      if (selectedThreshold < 7) report.aaaFallbacks.push(record);
      let previousBorder;
      for (const [i, state] of states.entries()) {
        const fill = selected.values[i];
        roles[`secondary/${hue}-${state}`] = fill.value;
        const border = nearest(ramp, luminance(target[`secondary/${hue}-border-${state}`]), c =>
          (dark ? c.y > fill.y : c.y < fill.y) && contrast(c.y, fill.y) >= 1.1 &&
          (!previousBorder || (dark ? c.y >= previousBorder.y : c.y <= previousBorder.y)));
        assert(border, 'missing secondary border: ' + [surface, theme, hue, state].join('/'));
        roles[`secondary/${hue}-border-${state}`] = border.value; previousBorder = border;
      }
      localBackgrounds.push(...selected.values);

      const primaryInk = nearest(gray, luminance(target[`primary/${hue}-content`]));
      const primaryTargets = states.map(state => luminance(target[`primary/${hue}-${state}`]));
      const primary = triple(ramp, primaryTargets, primaryTargets[2] > primaryTargets[0] ? 1 : -1, () => true, [primaryInk], primaryInk.y, 4.5);
      assert(primary, 'no primary state triple: ' + [surface, theme, hue].join('/'));
      roles[`primary/${hue}-content`] = primaryInk.value;
      for (const [i, state] of states.entries()) roles[`primary/${hue}-${state}`] = primary.values[i].value;
      report.primary.push({ surface, theme, hue, paths: primary.values.map(c => c.path), content: primaryInk.path, minimumContrast: Math.min(...primary.values.map(c => contrast(c.y, primaryInk.y))) });
    }
    // Fit the whole neutral hierarchy together. Independent nearest choices
    // merge muted and caption when both hit the same AA boundary in Light.
    const contentNames = ['primary', 'secondary', 'tertiary', 'muted', 'caption'];
    const contentDirection = dark ? -1 : 1;
    const contentBackgrounds = localBackgrounds;
    const readableGray = gray.filter(c => contentBackgrounds.every(bg => contrast(c.y, bg.y) >= 4.5));
    let contentPaths = readableGray.map(candidate => ({ values: [candidate], cost: distance(candidate.y, luminance(target['content/primary'])) }));
    for (const name of contentNames.slice(1)) {
      const next = [];
      for (const candidate of readableGray) {
        let best;
        for (const previous of contentPaths) {
          const last = previous.values.at(-1);
          if (contentDirection * (candidate.y - last.y) <= 0) continue;
          const cost = previous.cost + distance(candidate.y, luminance(target['content/' + name]));
          if (!best || cost < best.cost) best = { values: [...previous.values, candidate], cost };
        }
        if (best) next.push(best);
      }
      contentPaths = next;
    }
    const contentHierarchy = contentPaths.reduce((best, value) => !best || value.cost < best.cost ? value : best, null);
    assert(contentHierarchy, 'cannot preserve five readable neutral text levels: ' + surface + '/' + theme);
    for (const [i, name] of contentNames.entries()) roles['content/' + name] = contentHierarchy.values[i].value;
    report.neutralContent.push({ surface, theme, paths: contentHierarchy.values.map(c => c.path),
      minimumContrast: Math.min(...contentHierarchy.values.flatMap(c => contentBackgrounds.map(bg => contrast(c.y, bg.y)))) });
    let previousBoundary;
    for (const name of ['subtle', 'default', 'strong']) {
      const selected = nearest(gray, luminance(target['border/' + name]), c =>
        (dark ? c.y > bg.y : c.y < bg.y) && (!previousBoundary || (dark ? c.y > previousBoundary.y : c.y < previousBoundary.y)));
      assert(selected, 'missing boundary: ' + [surface, theme, name].join('/'));
      roles['border/' + name] = selected.value; previousBoundary = selected;
    }
    const focus = nearest(gray, luminance(target['focus/ring']), c => localBackgrounds.every(bg => contrast(c.y, bg.y) >= 3.2));
    assert(focus, 'missing focus indicator: ' + surface + '/' + theme);
    roles['focus/ring'] = focus.value;
    report.focus.push({ surface, theme, path: focus.path, minimumContrast: Math.min(...localBackgrounds.map(bg => contrast(bg.y, focus.y))) });
    const disabledBg = nearest(gray, luminance(target['disabled/bg']));
    const disabledInk = nearest(gray, luminance(target['disabled/content']), c => contrast(c.y, disabledBg.y) >= 4.5);
    assert(disabledInk, 'unreadable disabled pair: ' + surface + '/' + theme);
    roles['disabled/bg'] = disabledBg.value; roles['disabled/content'] = disabledInk.value;
    // Preserve alpha for semantic composition with an opaque pigment and Opacity.
    roles['overlay/scrim'] = target['overlay/scrim'];
  }
  return { contexts: output, diagnostics: report };
}
