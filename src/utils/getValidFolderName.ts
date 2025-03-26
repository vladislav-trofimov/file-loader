export function getValidFolderName(ip: string): string {
  if (!ip) return 'client-unknown';

  const cleaned = ip.replace(/[^a-zA-Z0-9]/g, '-');

  const normalized = cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');

  return `client-${normalized || 'unknown'}`;
}
