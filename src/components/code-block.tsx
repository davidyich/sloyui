import { useEffect, useState, type ReactNode } from 'react';
import { IconButton, cx, type Color } from './primitives.js';
import { Select } from './forms.js';
import { Menu, type MenuItem } from './overlays.js';

export type CodeLanguage = 'text' | 'js' | 'ts' | 'tsx' | 'json' | 'css' | 'bash';
export interface CodeBlockProps {
  children: string;
  label?: string;
  /** Controlled language selection. */
  language?: CodeLanguage;
  /** Initial language when `language` is uncontrolled; otherwise inferred from `label` or `text`. */
  defaultLanguage?: CodeLanguage;
  onLanguageChange?: (language: CodeLanguage) => void;
  /** Set false to hide the language chooser while keeping syntax highlighting. */
  showLanguageSelector?: boolean;
  color?: Color | 'inherit';
  copyable?: boolean;
  /** Additional, independently labelled controls in the right side of the header. */
  actions?: ReactNode;
  /** Wrap long lines visually; copying always preserves the original source. */
  wrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  /** Context menu beside copy; built-in line wrapping precedes consumer actions. */
  showActionsMenu?: boolean;
  contextActions?: MenuItem[];
  /** Editable code slot. Children remain the exact source used by copy. */
  editor?: ReactNode;
  variant?: 'auto' | 'surface' | 'outline' | 'filled-outline';
  className?: string;
}
type TokenKind = 'comment' | 'string' | 'number' | 'keyword' | 'tag' | 'property' | 'variable' | 'punctuation' | 'operator' | 'selector' | 'command' | 'boolean';
interface CodeToken { text: string; kind?: TokenKind }

const keywords: Record<Exclude<CodeLanguage, 'text' | 'json' | 'css' | 'bash'>, Set<string>> = {
  js: new Set('as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while yield true false null undefined'.split(' ')),
  ts: new Set('as asserts abstract any async await bigint boolean break case catch class const constructor continue debugger declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface keyof let module namespace never new null number object of package private protected public readonly require return set static string super switch symbol this throw try type typeof undefined unique unknown var void while with yield'.split(' ')),
  tsx: new Set('as asserts abstract any async await bigint boolean break case catch class const constructor continue debugger declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface keyof let module namespace never new null number object of package private protected public readonly require return set static string super switch symbol this throw try type typeof undefined unique unknown var void while with yield'.split(' ')),
};
const languageOptions: { value: CodeLanguage; label: string }[] = [
  { value: 'text', label: 'Plain text' }, { value: 'js', label: 'JavaScript' }, { value: 'ts', label: 'TypeScript' },
  { value: 'tsx', label: 'TSX' }, { value: 'json', label: 'JSON' }, { value: 'css', label: 'CSS' }, { value: 'bash', label: 'Bash' },
];

function inferLanguage(label?: string): CodeLanguage {
  const extension = label?.split('.').at(-1)?.toLowerCase();
  return ['js', 'ts', 'tsx', 'json', 'css', 'bash'].includes(extension ?? '') ? extension as CodeLanguage : 'text';
}

function tokenPattern(language: Exclude<CodeLanguage, 'text'>): RegExp {
  if (language === 'json') return /"(?:\\.|[^"\\])*"|-?\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|[{}\[\],:]/g;
  if (language === 'css') return /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--[\w-]+|#[0-9a-fA-F]{3,8}\b|\.[A-Za-z_][\w-]*|#[A-Za-z_][\w-]*|@[A-Za-z_-][\w-]*|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:px|rem|em|%|s|ms|deg)?\b|[A-Za-z_-][\w-]*|[{}()[\],;:.!%*/+-]/g;
  if (language === 'bash') return /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\.|[^\x60\\])*\x60|\$\{[^}]*\}|\$[A-Za-z_][\w]*|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w-]*|[{}()[\];|&<>!=+-]/g;

  const jsxTag = language === 'tsx' ? String.raw`<\/?[A-Za-z][\w.-]*|` : '';
  return new RegExp(String.raw`\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\.|[^\x60\\])*\x60|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|[A-Za-z_$][\w$]*|${jsxTag}=>|===?|!==?|<=?|>=?|&&|\|\||\?\?|\+\+|--|\*\*|[{}()[\];,.=<>:+*/%&|!?~^-]`, 'g');
}

function matchKind(token: string, language: CodeLanguage, rest: string): TokenKind | undefined {
  if (language === 'json') {
    if (/^["']/.test(token)) return /^\s*:/.test(rest) ? 'property' : 'string';
    if (/^(?:true|false|null)$/.test(token)) return 'boolean';
    if (/^-?\d/.test(token)) return 'number';
    if (/^[{}\[\],:]$/.test(token)) return 'punctuation';
    return undefined;
  }
  if (language === 'css') {
    if (token.startsWith('/*')) return 'comment';
    if (/^["']/.test(token)) return 'string';
    if (/^--[\w-]+/.test(token)) return 'variable';
    if (/^#[0-9a-f]{3,8}$/i.test(token) || /^\d/.test(token)) return 'number';
    if (/^@[\w-]+/.test(token)) return 'keyword';
    if (/^[.#][A-Za-z_][\w-]*$/.test(token)) return 'selector';
    if (/^[A-Za-z_-][\w-]*$/.test(token) && /^\s*:/.test(rest)) return 'property';
    if (/^[{}()[\],;:.]$/.test(token)) return 'punctuation';
    if (/^[!%*/+-]$/.test(token)) return 'operator';
    return undefined;
  }
  if (language === 'bash') {
    if (token.startsWith('#')) return 'comment';
    if (/^["'`]/.test(token)) return 'string';
    if (/^\$/.test(token)) return 'variable';
    if (/^\d/.test(token)) return 'number';
    if (/^(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|in|select|time|until)$/.test(token)) return 'keyword';
    if (/^[A-Za-z_][\w-]*$/.test(token)) return 'command';
    if (/^[{}()[\];]$/.test(token)) return 'punctuation';
    if (/^[|&<>!=+-]$/.test(token)) return 'operator';
    return undefined;
  }
  if (/^\/\//.test(token) || /^\/\*/.test(token)) return 'comment';
  if (/^["'`]/.test(token)) return 'string';
  if (language === 'tsx' && /^<\/?[A-Za-z]/.test(token)) return 'tag';
  if (/^\d/.test(token)) return 'number';
  if (/^[{}()[\];,.]$/.test(token)) return 'punctuation';
  if (/^(?:=>|===?|!==?|<=?|>=?|&&|\|\||\?\?|\+\+|--|\*\*|[=<>:+*/%&|!?~^-])$/.test(token)) return 'operator';
  if (keywords[language as 'js' | 'ts' | 'tsx'].has(token)) return 'keyword';
  if (/^[A-Za-z_$][\w$]*$/.test(token) && /^\s*\(/.test(rest)) return 'command';
  return undefined;
}

function tokenize(source: string, language: CodeLanguage): CodeToken[] {
  if (language === 'text' || !source) return [{ text: source }];
  const pattern = tokenPattern(language);
  const tokens: CodeToken[] = [];
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ text: source.slice(cursor, index) });
    const text = match[0];
    tokens.push({ text, kind: matchKind(text, language, source.slice(index + text.length)) });
    cursor = index + text.length;
  }
  if (cursor < source.length) tokens.push({ text: source.slice(cursor) });
  return tokens;
}

/** Renders escaped syntax tokens as spans; source is never interpreted as HTML. */
export function highlightCode(source: string, language: CodeLanguage) {
  return tokenize(source, language).map((token, index) => token.kind
    ? <span key={index} className={`cap-code-${token.kind}`} data-token={token.kind}>{token.text}</span>
    : token.text);
}

/** A small, dependency-free code surface with safe syntax tokens and optional copy/language controls. */
export function CodeBlock({ children, label, language: controlledLanguage, defaultLanguage, onLanguageChange, showLanguageSelector = true, color, copyable = true, actions, wrap: controlledWrap, onWrapChange, showActionsMenu = copyable, contextActions = [], editor, variant = 'auto', className }: CodeBlockProps) {
  const [internalLanguage, setInternalLanguage] = useState<CodeLanguage>(defaultLanguage ?? inferLanguage(label));
  const [status, setStatus] = useState('');
  const [internalWrap, setInternalWrap] = useState(false);
  const wrap = controlledWrap ?? internalWrap;
  const toggleWrap = () => { const next = !wrap; if (controlledWrap === undefined) setInternalWrap(next); onWrapChange?.(next); };
  useEffect(() => { setStatus(''); }, [children]);
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 4000);
    return () => clearTimeout(timer);
  }, [status]);
  const language = controlledLanguage ?? internalLanguage;
  const changeLanguage = (value: string) => {
    const next = value as CodeLanguage;
    if (controlledLanguage === undefined) setInternalLanguage(next);
    onLanguageChange?.(next);
  };
  return <figure className={cx('cap-code', className)} data-variant={variant} data-wrap={wrap || undefined} data-color={color ?? 'neutral'} data-accent={color === 'inherit' ? undefined : color ?? 'neutral'}>
    {(showLanguageSelector || label || copyable || actions || showActionsMenu) && <figcaption>
      <span className="cap-code-heading">
        {showLanguageSelector && <Select aria-label="Язык кода" className="cap-code-language-select" popupClassName="cap-code-language-popup" size="xs" variant="ghost" value={language} onValueChange={changeLanguage} options={languageOptions}/>}
        {label && <span className="cap-code-label" title={label}>{label}</span>}
      </span>
      <span className="cap-code-actions">
        {copyable && <IconButton className="cap-code-copy" size="sm" variant="ghost" icon={status === 'Скопировано' ? 'check' : 'copy'} label="Копировать код" onClick={async () => { try { await navigator.clipboard.writeText(children); setStatus('Скопировано'); } catch { setStatus('Не удалось скопировать. Выделите код вручную.'); } }}/>}
        {showActionsMenu && <Menu label="Действия с кодом" size="sm" items={[{ id: 'wrap', label: wrap ? 'Отключить перенос строк' : 'Переносить строки', icon: 'code', onSelect: toggleWrap }, ...contextActions]}/>}
        {actions}
      </span>
    </figcaption>}
    {editor ? <div className="cap-code-editor">{editor}</div> : <pre tabIndex={0} aria-label={label ?? `${language} code`}><code className={`language-${language}`}>{highlightCode(children, language)}</code></pre>}
    <span role="status" className="cap-sr-only">{status}</span>
  </figure>;
}
