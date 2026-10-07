import { useId, useState, type HTMLAttributes } from 'react';
import { Icon, IconButton, type Color } from './primitives.js';
import { useTranslate } from './locale.js';

export type FileKind = 'image' | 'pdf' | 'presentation' | 'document' | 'spreadsheet' | 'archive' | 'audio' | 'video' | 'code' | 'unknown';
export interface FileCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'children'> {
  /** Full filename, retained in the accessible name when visually truncated. */
  name: string;
  /** Display-ready size or other file metadata; no bytes are guessed. */
  sizeLabel?: string;
  /** Recognized MIME type takes precedence over the filename extension. */
  mimeType?: string;
  /** Overrides automatic format inference. */
  kind?: FileKind;
  /** Optional image URL; a failed image falls back to the format tile. */
  thumbnail?: string;
  /** Keep empty when the thumbnail repeats the filename. */
  thumbnailAlt?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Main file link; takes precedence over onOpen. */
  href?: string;
  onOpen?: () => void;
  /** Separate download link; takes precedence over onDownload. */
  downloadHref?: string;
  onDownload?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  loading?: boolean;
}
const extensions: Record<FileKind, string[]> = {
  image: ['png','jpg','jpeg','gif','webp','avif','svg','heic','bmp','tiff'], pdf: ['pdf'],
  presentation: ['ppt','pptx','key','odp'], document: ['doc','docx','odt','rtf','txt','pages'],
  spreadsheet: ['xls','xlsx','csv','ods','numbers'], archive: ['zip','rar','7z','tar','gz','bz2'],
  audio: ['mp3','wav','ogg','flac','m4a','aac'], video: ['mp4','mov','webm','mkv','avi'],
  code: ['js','jsx','ts','tsx','json','html','css','py','sh','sql','xml','yaml','yml','md'], unknown: [],
};
export function inferFileKind(name: string, mimeType?: string): FileKind {
  const mime = mimeType?.toLowerCase();
  if (mime?.startsWith('image/')) return 'image';
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.includes('pdf')) return 'pdf';
  if (mime && /presentation|powerpoint|opendocument.presentation/.test(mime)) return 'presentation';
  if (mime && /spreadsheet|excel|csv/.test(mime)) return 'spreadsheet';
  if (mime && /word|opendocument.text|rtf/.test(mime)) return 'document';
  if (mime && /zip|compressed|tar/.test(mime)) return 'archive';
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';
  return (Object.keys(extensions) as FileKind[]).find(kind => extensions[kind].includes(extension)) ?? 'unknown';
}
const formats: Record<FileKind, { label: string; color: Color }> = {
  image: { label: 'IMG', color: 'purple' }, pdf: { label: 'PDF', color: 'red' },
  presentation: { label: 'P', color: 'orange' }, document: { label: 'W', color: 'blue' },
  spreadsheet: { label: 'X', color: 'green' }, archive: { label: 'ZIP', color: 'amber' },
  audio: { label: 'AUD', color: 'purple' }, video: { label: 'VID', color: 'pink' },
  code: { label: '</>', color: 'blue' }, unknown: { label: 'FILE', color: 'neutral' },
};

export function FileCard({ name, sizeLabel, mimeType, kind: explicitKind, thumbnail, thumbnailAlt = '', size = 'md', href, onOpen, downloadHref, onDownload, onRemove, disabled = false, loading = false, className = '', ...props }: FileCardProps) {
  const t = useTranslate(), id = useId();
  const [failedThumbnail, setFailedThumbnail] = useState<string>();
  const kind = explicitKind ?? inferFileKind(name, mimeType), format = formats[kind];
  const blocked = disabled || loading;
  const content = <><span className="cap-file-card-preview" aria-hidden={thumbnailAlt ? undefined : true}>
    {thumbnail && failedThumbnail !== thumbnail ? <img src={thumbnail} alt={thumbnailAlt} onError={() => setFailedThumbnail(thumbnail)} /> : <span className="cap-file-card-format" data-accent={format.color} aria-hidden="true">{format.label}</span>}
  </span><span className="cap-file-card-copy"><span className="cap-file-card-name" id={id}>{name}</span>{(sizeLabel || loading) && <span className="cap-file-card-meta">{loading ? t('Загрузка…','Loading…') : sizeLabel}</span>}</span></>;
  return <div {...props} className={`cap-file-card cap-surface-boundary ${className}`} data-surface="raised" data-size={size} data-kind={kind} data-disabled={disabled || undefined} aria-busy={loading || undefined}>
    {href && !blocked ? <a className="cap-file-card-main" href={href} aria-labelledby={id}>{content}</a> : onOpen ? <button className="cap-file-card-main" type="button" onClick={onOpen} disabled={blocked} aria-labelledby={id}>{content}</button> : <div className="cap-file-card-main">{content}</div>}
    {(downloadHref || onDownload || onRemove) && <div className="cap-file-card-actions">
      {downloadHref && !blocked ? <a className="cap-file-card-download" href={downloadHref} download={name} aria-label={`${t('Скачать','Download')} ${name}`}><Icon name="down" /></a> : (downloadHref || onDownload) ? <IconButton label={`${t('Скачать','Download')} ${name}`} icon="down" variant="ghost" size="sm" disabled={blocked} onClick={onDownload} /> : null}
      {onRemove && <IconButton label={`${t('Удалить','Remove')} ${name}`} icon="close" variant="ghost" size="sm" disabled={blocked} onClick={onRemove} />}
    </div>}
  </div>;
}
