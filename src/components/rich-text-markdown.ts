import { createRichTextBlock, type RichTextBlock, type RichTextDocument, type RichTextRun } from './rich-text-editor.js';

/** Exact source is retained until its corresponding rich block is deliberately edited. */
export interface RichTextMarkdownSource {
  source: string;
  fingerprint: string;
  prefix: string;
  suffix: string;
  newline: string;
  language?: string;
  marker?: string;
}
const plain = (block: RichTextBlock) => (block.content ?? []).map(run => run.text).join('');
const fingerprint = (block: RichTextBlock) => JSON.stringify([block.type, block.content ?? [], block.data ?? null]);
const inlinePattern = /\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_/g;
function inline(text: string): RichTextRun[] | null {
  // Links, images, HTML, escapes and nested syntax remain explicit Markdown source.
  if (/[\\[\]<>]/.test(text)) return null;
  const runs: RichTextRun[] = []; let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const index = match.index ?? 0, token = match[0];
    const before = text.slice(cursor, index);
    if (/[*~`]/.test(before)) return null;
    if (before) runs.push({ text: before });
    const width = /^(\*\*|__|~~)/.test(token) ? 2 : 1;
    const mark = token[0] === '`' ? 'code' : token.startsWith('~~') ? 'strike' : width === 2 ? 'bold' : 'italic';
    const content = token.slice(width, -width);
    if (/[*~`]/.test(content)) return null;
    runs.push({ text: content, marks: [mark] }); cursor = index + token.length;
  }
  const tail = text.slice(cursor);
  if (/[*~`]/.test(tail)) return null;
  if (tail) runs.push({ text: tail });
  return runs;
}
const lineText = (line: string) => line.replace(/(?:\r\n|\n|\r)$/, '');
const special = (text: string) => /^(?: {0,3}(?:#{1,6}\s|(?:`{3,}|~{3,})|>|[-+*]\s|\d+[.)]\s)|\s*$)/.test(text);

/** Parses only a deliberately small editable subset; every other construct is an opaque source block. */
export function markdownToRichText(source: string, options: { extensions?: boolean } = {}): RichTextDocument {
  const lines = source.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g)?.filter(line => line !== '') ?? [];
  const blocks: RichTextBlock[] = [], newline = source.match(/\r\n|\n|\r/)?.[0] ?? '\n';
  let index = 0, prefix = '';
  while (index < lines.length) {
    const line = lineText(lines[index]);
    if (!line.trim()) { prefix += lines[index++]; continue; }
    const start = index, fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    let type: RichTextBlock['type'] = 'paragraph', text = line, language: string | undefined, marker: string | undefined;
    let tableRows: string[][] | undefined;
    let tableAlignment: string[] | undefined;
    const tableLine = (value: string) => value.replace(/^\s*\||\|\s*$/g, '').split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n'));
    if (options.extensions && line === '<details>' && lineText(lines[index + 1] ?? '') === '<summary>Toggle</summary>') {
      index += 2; const begin = index; while (index < lines.length && lineText(lines[index]) !== '</details>') index++;
      if (index < lines.length) {type = 'toggle'; text = lines.slice(begin, index).map(lineText).join('\n'); index++;} else {type = 'markdown-source';text = lines.slice(start, index).map(lineText).join('\n');}
    } else if (options.extensions && /^> \[!NOTE\]$/.test(line)) {
      type = 'callout'; index++; const content: string[] = []; while (index < lines.length && /^>/.test(lineText(lines[index]))) content.push(lineText(lines[index++]).replace(/^> ?/, '')); text = content.join('\n');
    } else if (options.extensions && line.includes('|') && index + 1 < lines.length && tableLine(lineText(lines[index + 1])).every(cell => /^:?-{3,}:?$/.test(cell))) {
      tableRows = [tableLine(line)]; tableAlignment = tableLine(lineText(lines[index + 1])); index += 2;
      while (index < lines.length && lineText(lines[index]).trim() && lineText(lines[index]).includes('|')) tableRows.push(tableLine(lineText(lines[index++])));
      type = 'table'; text = '';
    } else if (options.extensions && /^---\s*$/.test(line) && (index + 1 === lines.length || !lineText(lines[index + 1]).trim())) { type = 'divider'; text = ''; index++;
    } else if (fence) {
      marker = fence[1]; language = fence[2].trim(); index++;
      while (index < lines.length && !new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(lineText(lines[index]))) index++;
      if (index < lines.length) { type = 'code'; text = lines.slice(start + 1, index).join('').replace(/(?:\r\n|\n|\r)$/, ''); index++; }
      else { type = 'markdown-source'; text = lines.slice(start, index).join('').replace(/(?:\r\n|\n|\r)$/, ''); }
    } else {
      const heading = line.match(/^ {0,3}(#{1,3})\s+(.+?)\s*#*\s*$/), bullet = line.match(/^([-+*]) ([^ ].*)?$/), ordered = line.match(/^(\d+)\. ([^ ].*)?$/), quote = line.match(/^> ?(.*)$/);
      if (heading) { type = `heading${heading[1].length}`; text = heading[2]; index++; }
      else if (bullet && !/^[-+*] \[[ xX]\]/.test(line)) { type = 'bullet'; text = bullet[2] ?? ''; index++; }
      else if (ordered) { type = 'numbered'; text = ordered[2] ?? ''; index++; }
      else if (quote && !/^> ?(?:>|\[!)/.test(line)) { type = 'quote'; text = quote[1]; index++; }
      else {
        index++;
        while (index < lines.length && lineText(lines[index]).trim() && !special(lineText(lines[index]))) {
          if (options.extensions && lineText(lines[index]).includes('|') && index + 1 < lines.length && tableLine(lineText(lines[index + 1])).every(cell => /^:?-{3,}:?$/.test(cell))) break;
          index++;
        }
        text = lines.slice(start, index).map(lineText).join('\n');
        // Tables, indented code, horizontal rules, HTML, reference definitions, nested lists etc.
        if (/\|/.test(text) || / {2}(?:\n|$)/.test(text) || /^\s{2,}|^#{4,}|^[=\-_*]{3,}\s*$|^\||\n\s*\||^\[|^>|^[-+*] \[|^\d+[)] /m.test(text) || /\n[^\n]+\n[=-]+\s*$/.test(text) || / {2}$/.test(line)) type = 'markdown-source';
      }
    }
    let content = type === 'code' || type === 'markdown-source' ? [{ text }] : options.extensions ? inlineExtended(text) : inline(text);
    if (!content) { type = 'markdown-source'; text = lines.slice(start, index).map(lineText).join('\n'); content = [{ text }]; }
    const body = lines.slice(start, index).join(''), ending = body.match(/(?:\r\n|\n|\r)$/)?.[0] ?? '';
    const block = createRichTextBlock(type, content);
    if (tableRows) block.data = { rows: tableRows, alignment: tableAlignment ?? [] };
    if (type === 'code' && language) block.data = { codeLanguage: language };
    block.markdown = { source: prefix + body, prefix, suffix: ending, newline, language, marker, fingerprint: fingerprint(block) };
    blocks.push(block); prefix = '';
  }
  if (prefix && blocks.length) { const last = blocks.at(-1)!; last.markdown!.source += prefix; last.markdown!.suffix += prefix; }
  if (prefix && !blocks.length) { const block = createRichTextBlock('markdown-source', [{ text: prefix }]); block.markdown = { source: prefix, prefix: '', suffix: '', newline, fingerprint: fingerprint(block) }; blocks.push(block); }
  return { blocks };
}
function inlineExtended(text: string): RichTextRun[] | null {
  const opener = /<span data-cap-(color|highlight)="(red|teal|blue|orange|green|rose)">|<u>|\[([^\]\n]+)\]\(((?:https?:|mailto:|tel:|\/|#)[^\s)]*)\)|\*\*\*|\*\*|~~|\*|`/g;
  const runs: RichTextRun[] = []; let cursor = 0;
  while (cursor < text.length) {
    opener.lastIndex = cursor; const match = opener.exec(text);
    if (!match) { const tail = inline(text.slice(cursor)); if (!tail) return null; runs.push(...tail); break; }
    const before = inline(text.slice(cursor, match.index)); if (!before) return null; runs.push(...before);
    const token = match[0], start = match.index + token.length;
    let end: number, length: number;
    if (match[3] !== undefined) { const inside = inlineExtended(match[3]); if (!inside) return null; runs.push(...inside.map(run => ({...run, link: match[4]}))); cursor = start; continue; }
    if (token.startsWith('<span')) {
      const tags = /<span\b[^>]*>|<\/span>/g; tags.lastIndex = start; let depth = 1; let close: RegExpExecArray | null = null;
      while (depth && (close = tags.exec(text))) depth += close[0].startsWith('</') ? -1 : 1;
      if (depth || !close) return null; end = close.index; length = close[0].length;
    } else { const closing = token === '<u>' ? '</u>' : token; end = text.indexOf(closing, start); length = closing.length; if (end < 0) return null; }
    const inside = token === '`' ? [{text: text.slice(start, end)}] : inlineExtended(text.slice(start, end)); if (!inside) return null;
    const activeMarks = token === '<u>' ? ['underline'] : token === '***' ? ['bold', 'italic'] : token === '**' ? ['bold'] : token === '*' ? ['italic'] : token === '~~' ? ['strike'] : token === '`' ? ['code'] : [];
    runs.push(...inside.map(run => ({...run, ...(match[1] ? {[match[1]]: match[2]} : {marks: [...(run.marks ?? []), ...activeMarks] as RichTextRun['marks']})})));
    cursor = end + length;
  }
  return runs;
}
function serializeInline(runs: RichTextRun[]): string {
  return runs.map(run => {
    let text = run.text.replace(/[\\`*_~<>[\]]/g, '\\$&');
    if (run.marks?.includes('code')) { const size = Math.max(1, ...Array.from(run.text.matchAll(/`+/g), match => match[0].length + 1)); const delimiter = '`'.repeat(size); const pad = /^`|`$|^ .* $/.test(run.text) ? ' ' : ''; text = `${delimiter}${pad}${run.text}${pad}${delimiter}`; }
    if (run.marks?.includes('bold')) text = `**${text}**`;
    if (run.marks?.includes('italic')) text = `*${text}*`;
    if (run.marks?.includes('strike')) text = `~~${text}~~`;
    if (run.marks?.includes('underline')) text = `<u>${text}</u>`;
    if (run.link && /^(https?:|mailto:|tel:|\/|#)/i.test(run.link)) text = `[${text}](${run.link.replace(/[()\s]/g, char => encodeURIComponent(char))})`;
    if (run.color && /^(red|teal|blue|orange|green|rose)$/.test(run.color)) text = `<span data-cap-color="${run.color}">${text}</span>`;
    if (run.highlight && /^(red|teal|blue|orange|green|rose)$/.test(run.highlight)) text = `<span data-cap-highlight="${run.highlight}">${text}</span>`;
    return text;
  }).join('');
}
/** Serializes changed blocks while leaving every untouched byte, gap and unsupported construct intact. */
export function richTextToMarkdown(document: RichTextDocument): string {
  let result = '';
  document.blocks.forEach((block, index) => {
    const original = block.markdown;
    if (original && original.fingerprint === fingerprint(block)) { if (result && !/[\r\n]$/.test(result) && !/^[\r\n]/.test(original.source)) result += original.newline + original.newline; result += original.source; return; }
    const newline = original?.newline ?? '\n', prefix = original?.prefix ?? (index ? (/[\r\n]$/.test(result) ? newline : newline + newline) : ''), suffix = original?.suffix ?? newline;
    let body: string;
    if (block.type === 'table') {
      const table = block.data as { rows?: string[][]; alignment?: string[] } | undefined;
      const rows = table?.rows ?? [['']];
      const width = Math.max(1, ...rows.map(row => row.length));
      const line = (row: string[]) => `| ${Array.from({ length: width }, (_, i) => (row[i] ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')).join(' | ')} |`;
      body = [line(rows[0] ?? []), line(Array.from({ length: width }, (_, i) => table?.alignment?.[i] ?? '---')), ...rows.slice(1).map(line)].join(newline);
    } else if (block.type === 'divider') body = '---';
    else if (block.type === 'toggle') body = `<details>${newline}<summary>Toggle</summary>${newline}${serializeInline(block.content ?? [])}${newline}</details>`;
    else if (block.type === 'callout') body = `> [!NOTE]${newline}> ${serializeInline(block.content ?? []).replace(/\n/g, `${newline}> `)}`;
    else if (block.type === 'markdown-source') body = plain(block);
    else if (block.type === 'code') {
      const text = plain(block), fenceCharacter = original?.marker?.[0] === '~' ? '~' : '`';
      const longest = Math.max(0, ...Array.from(text.matchAll(new RegExp(`${fenceCharacter}+`, 'g')), match => match[0].length));
      const fence = fenceCharacter.repeat(Math.max(3, original?.marker?.length ?? 3, longest + 1));
      const data = block.data as { codeLanguage?: string } | undefined;
      body = `${fence}${data?.codeLanguage ?? original?.language ?? ''}${newline}${text}${text.endsWith('\n') || text.endsWith('\r') ? '' : newline}${fence}`;
    } else {
      const text = serializeInline(block.content ?? []);
      const marker = block.type === 'heading1' ? '# ' : block.type === 'heading2' ? '## ' : block.type === 'heading3' ? '### ' : block.type === 'bullet' ? '- ' : block.type === 'numbered' ? '1. ' : block.type === 'quote' ? '> ' : '';
      body = marker + text;
      if (block.type === 'paragraph') body = body.replace(/^( {0,3})([#>+\-])(?=\s|$)/gm, '$1\\$2').replace(/^( {0,3})(\d+)([.)])(?=\s)/gm, '$1$2\\$3');
      if (block.type === 'quote') body = body.replace(/\n/g, `${newline}> `);
    }
    if (result && !/[\r\n]$/.test(result) && !/^[\r\n]/.test(prefix)) result += newline;
    result += prefix + body + suffix;
  });
  return result;
}

/** Textareas normalize line endings. Keep exact untouched source around the user's edit. */
export function preserveMarkdownSourceEdit(previous: string, edited: string): string {
  const units = previous.match(/\r\n|\r|[^\r]/g) ?? [];
  const normalized = units.map(unit => unit === '\r\n' || unit === '\r' ? '\n' : unit).join('');
  const next = edited.replace(/\r\n|\r/g, '\n');
  let start = 0;
  while (start < normalized.length && start < next.length && normalized[start] === next[start]) start++;
  let end = 0;
  while (end < normalized.length - start && end < next.length - start && normalized[normalized.length - end - 1] === next[next.length - end - 1]) end++;
  const newline = previous.match(/\r\n|\n|\r/)?.[0] ?? '\n';
  return units.slice(0, start).join('') + next.slice(start, next.length - end).replace(/\n/g, newline) + (end ? units.slice(units.length - end).join('') : '');
}
