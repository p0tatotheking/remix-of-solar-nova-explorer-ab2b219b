/**
 * Holy Unblocker Proxy Configuration
 * 
 * When deploying on AWS, Holy Unblocker runs on the same server.
 * Nginx proxies /holy/ to Holy Unblocker's port.
 * 
 * Change HOLY_UNBLOCKER_BASE if your setup differs.
 */

// Base path where Holy Unblocker is accessible (relative to same domain)
export const HOLY_UNBLOCKER_BASE = '/holy/';

// Get the full URL for Holy Unblocker
export function getHolyUnblockerUrl(): string {
  const saved = localStorage.getItem('holy-unblocker-url');
  if (saved) return saved;
  return HOLY_UNBLOCKER_BASE;
}

export function setHolyUnblockerUrl(url: string): void {
  localStorage.setItem('holy-unblocker-url', url);
}
