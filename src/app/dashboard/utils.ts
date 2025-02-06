export const TRUNCATE_LENGTH = 240;

export function truncateText(text: string | null | undefined) {
  if (!text) return '';
  if (text.length <= TRUNCATE_LENGTH) return text;
  return text.slice(0, TRUNCATE_LENGTH).trim() + '...';
} 