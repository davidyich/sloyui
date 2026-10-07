import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileCard, inferFileKind } from '../src/components/file-card';
import { LocaleProvider } from '../src/components/locale';

describe('FileCard', () => {
  it('infers common formats and respects MIME type and explicit kind', () => {
    expect(inferFileKind('PHOTO.PNG')).toBe('image');
    expect(inferFileKind('report.xlsx')).toBe('spreadsheet');
    expect(inferFileKind('untitled','application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('presentation');
    expect(inferFileKind('unknown')).toBe('unknown');
    expect(inferFileKind('pdf')).toBe('unknown');
    render(<FileCard name="report.pdf" kind="document" />);
    expect(screen.getByText('W')).toBeInTheDocument();
  });
  it('keeps open, download and remove independent without nested interactive elements', () => {
    const open = vi.fn(), download = vi.fn(), remove = vi.fn();
    const {container} = render(<LocaleProvider locale="en"><FileCard name="contract.docx" sizeLabel="86 KB" onOpen={open} onDownload={download} onRemove={remove} /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button',{name:'contract.docx'}));
    fireEvent.click(screen.getByRole('button',{name:'Download contract.docx'}));
    fireEvent.click(screen.getByRole('button',{name:'Remove contract.docx'}));
    expect(open).toHaveBeenCalledOnce(); expect(download).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();
    expect(container.querySelector('button button, a button, button a')).toBeNull();
  });
  it('uses native links and disables every action while loading', () => {
    const {rerender} = render(<FileCard name="report.pdf" href="/report.pdf" downloadHref="/report.pdf" />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    rerender(<FileCard name="report.pdf" href="/report.pdf" downloadHref="/report.pdf" onRemove={()=>{}} loading />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
  });
  it('falls back on thumbnail error and retries a changed source', () => {
    const {rerender} = render(<FileCard name="cover.png" thumbnail="/broken.png" thumbnailAlt="Lake cover" />);
    fireEvent.error(screen.getByRole('img',{name:'Lake cover'}));
    expect(screen.getByText('IMG')).toBeInTheDocument();
    rerender(<FileCard name="cover.png" thumbnail="/new.png" thumbnailAlt="Lake cover" />);
    expect(screen.getByRole('img')).toHaveAttribute('src','/new.png');
  });
});
