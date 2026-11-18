export {};
declare global {
  interface Window { hasDriveMarkdownReader?: boolean }
  const marked: typeof import('marked').marked;
  const DOMPurify: typeof import('dompurify').default;
  // Only the API used from the existing vendored Mermaid bundle is declared here.
  const mermaid: {
    initialize(config: { startOnLoad: boolean; theme: 'dark' | 'default'; securityLevel: 'strict' }): void;
    run(config: { nodes: NodeListOf<HTMLElement> }): Promise<void>;
  };
}
