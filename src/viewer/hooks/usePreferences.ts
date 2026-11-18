import { useLayoutEffect, useState } from 'react';

function normalizeZoom(value: number) {
  return Math.round(Math.min(Math.max(value, 0.5), 2.5) * 10) / 10;
}

export function usePreferences() {
  const [dark, setDark] = useState(() => localStorage.getItem('drive-md-dark-mode') !== 'false');
  const [source, setSource] = useState(() => localStorage.getItem('drive-md-mermaid-source') === 'true');
  const [zoom, setZoom] = useState(() => {
    const value = Number.parseFloat(localStorage.getItem('drive-md-zoom') || '1');
    return normalizeZoom(Number.isFinite(value) ? value : 1);
  });
  useLayoutEffect(() => {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('drive-md-dark-mode', String(dark));
    return () => document.body.classList.remove('dark-mode');
  }, [dark]);
  useLayoutEffect(() => {
    document.body.classList.toggle('show-mermaid-source', source);
    localStorage.setItem('drive-md-mermaid-source', String(source));
    return () => document.body.classList.remove('show-mermaid-source');
  }, [source]);
  useLayoutEffect(() => { localStorage.setItem('drive-md-zoom', String(zoom)); }, [zoom]);
  return {
    dark, source, zoom,
    toggleDark: () => setDark(value => !value),
    toggleSource: () => setSource(value => !value),
    zoomIn: () => setZoom(value => normalizeZoom(value + 0.1)),
    zoomOut: () => setZoom(value => normalizeZoom(value - 0.1)),
    resetZoom: () => setZoom(1)
  };
}
