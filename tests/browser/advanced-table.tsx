import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvancedTableExample } from '../../demo/AdvancedTableExample';
import { Button } from '../../src/components/primitives';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import './advanced-table.css';
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
function Fixture() {
  const [report, setReport] = useState('Run geometry checks after toggling row pins.');
  async function check() {
    const viewport = document.querySelector<HTMLDivElement>('.cap-data-table-scroll')!;
    viewport.scrollTo(0, 0); await frame();
    const left = viewport.querySelector<HTMLElement>('tbody [data-pin-active="left"][data-pin-active-edge]')!, right = viewport.querySelector<HTMLElement>('tbody [data-pin-active="right"]'), header = viewport.querySelector<HTMLElement>('thead th')!, footer = viewport.querySelector<HTMLElement>('tfoot td')!;
    const before = { left: left.getBoundingClientRect().left, right: right?.getBoundingClientRect().right, header: header.getBoundingClientRect().top, footer: footer.getBoundingClientRect().bottom };
    viewport.scrollTo(340, 280); await frame();
    const close = (a: number, b: number) => Math.abs(a - b) < 2;
    const bounds = viewport.getBoundingClientRect();
    const pins = [...viewport.querySelectorAll<HTMLElement>('tbody tr[data-row-pin]')].map(row => ({ id: row.dataset.rowId, pin: row.dataset.rowPin, rect: row.children[0].getBoundingClientRect() }));
    const headerBottom = header.getBoundingClientRect().bottom, footerTop = footer.getBoundingClientRect().top;
    const topPins = pins.filter(pin => pin.pin === 'top'), bottomPins = pins.filter(pin => pin.pin === 'bottom');
    const rowPinsDoNotOverlap = (items: typeof pins) => items.every((pin, index) => index === 0 || pin.rect.top >= items[index - 1].rect.bottom - 1);
    const activeHeaderPins = [...viewport.querySelectorAll<HTMLElement>('thead [data-pin-active]')];
    const pinnedWidth = activeHeaderPins.reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0);
    const result = { horizontalScroll: viewport.scrollLeft > 0, verticalScroll: viewport.scrollTop > 0, leftPin: close(before.left, left.getBoundingClientRect().left), rightPin: right && before.right !== undefined ? close(before.right, right.getBoundingClientRect().right) : 'responsive-unpinned', header: close(before.header, header.getBoundingClientRect().top), footer: close(before.footer, footer.getBoundingClientRect().bottom), noDocumentOverflow: document.documentElement.scrollWidth <= innerWidth, rowPinsVisible: pins.every(pin => pin.rect.top >= bounds.top && pin.rect.bottom <= bounds.bottom), rowPinsTested: pins.length, multiplePinsTested: topPins.length >= 2 && bottomPins.length >= 2, rowPinsBelowHeader: topPins.every(pin => pin.rect.top >= headerBottom - 1), rowPinsAboveFooter: bottomPins.every(pin => pin.rect.bottom <= footerTop + 1), rowPinsDoNotOverlap: rowPinsDoNotOverlap(topPins) && rowPinsDoNotOverlap(bottomPins), scrollingLaneWidth: viewport.clientWidth - pinnedWidth, scrollingLaneUsable: viewport.clientWidth - pinnedWidth >= Math.min(240, Math.max(160, viewport.clientWidth * .35)) - 1, pinnedHeaderAboveRows: activeHeaderPins.every(cell => Number(getComputedStyle(cell).zIndex) > 4), gridVisibleWithBordersOff: getComputedStyle(left).borderRightStyle !== 'none' && getComputedStyle(left).borderRightColor !== 'rgba(0, 0, 0, 0)' };
    setReport(JSON.stringify(result, null, 2));
  }
  return <main><h1>Advanced DataTable</h1><AdvancedTableExample/><Button onClick={check}>Run geometry checks</Button><output data-testid="geometry-report">{report}</output></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
