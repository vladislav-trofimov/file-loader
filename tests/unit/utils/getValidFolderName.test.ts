import { getValidFolderName } from '../../../src/utils/getValidFolderName'; // путь подкорректируй под свою структуру

describe('getValidFolderName', () => {
  it('returns "client-unknown" if ip is empty', () => {
    expect(getValidFolderName('')).toBe('client-unknown');
  });

  it('cleans up IP-like input', () => {
    expect(getValidFolderName('192.168.0.1')).toBe('client-192-168-0-1');
  });

  it('handles weird characters', () => {
    expect(getValidFolderName('user@host!#$')).toBe('client-user-host');
  });

  it('collapses multiple dashes', () => {
    expect(getValidFolderName('a---b___c')).toBe('client-a-b-c');
  });

  it('removes leading/trailing dashes', () => {
    expect(getValidFolderName('--hello--')).toBe('client-hello');
  });

  it('returns "client-unknown" if result is empty after cleanup', () => {
    expect(getValidFolderName('---$$$---')).toBe('client-unknown');
  });
});