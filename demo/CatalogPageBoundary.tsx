import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../src/components/primitives';

/** A failed lazy page must leave catalogue navigation and appearance controls usable. */
export class CatalogPageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Catalogue page failed', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="catalog-page-error" role="alert"><h1>Не удалось открыть страницу</h1><p>Попробуйте снова или выберите другой раздел каталога.</p><Button onClick={() => location.reload()}>Обновить страницу</Button></div>;
  }
}
