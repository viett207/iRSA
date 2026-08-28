import { normalizeProfileUrl } from './profile-info.component';

describe('ProfileInfoComponent helpers', () => {
  it('adds HTTPS to a professional link without a protocol', () => {
    expect(normalizeProfileUrl(' github.com/ung-vien ')).toBe('https://github.com/ung-vien');
  });

  it('keeps a complete HTTPS link and clears blank input', () => {
    expect(normalizeProfileUrl('https://example.com/portfolio')).toBe('https://example.com/portfolio');
    expect(normalizeProfileUrl('  ')).toBeNull();
  });
});
