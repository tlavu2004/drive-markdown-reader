export type ViewerMessage =
  | { action: 'VIEWER_READY' }
  | { action: 'CLOSE_VIEWER' }
  | { action: 'NAVIGATE'; direction: -1 | 1 };
export type ContentMessage = { action: 'RENDER' | 'RENDER_ERROR'; content: string };
export type RenderResponse = { success: true } | { success: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
export function isViewerMessage(value: unknown): value is ViewerMessage {
  return isRecord(value) && (value.action === 'VIEWER_READY' || value.action === 'CLOSE_VIEWER' ||
    (value.action === 'NAVIGATE' && (value.direction === -1 || value.direction === 1)));
}
export function isContentMessage(value: unknown): value is ContentMessage {
  return isRecord(value) && (value.action === 'RENDER' || value.action === 'RENDER_ERROR') && typeof value.content === 'string';
}
export function isRenderRequest(value: unknown): value is { action: 'RENDER_NOW' } {
  return isRecord(value) && value.action === 'RENDER_NOW';
}
export function isRenderResponse(value: unknown): value is RenderResponse {
  return isRecord(value) && (value.success === true || (value.success === false && typeof value.reason === 'string'));
}
export function errorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return fallback;
}
