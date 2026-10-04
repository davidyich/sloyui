import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
// jsdom has no top-layer implementation. Focus trapping is verified in Chrome.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); (this.querySelector('[autofocus],input,button') as HTMLElement)?.focus(); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
