import {
  getValidWorkplaceImages,
  normalizeExternalUrl,
  stripCompanyHtml,
} from './company-detail.component';

describe('CompanyDetail helpers', () => {
  it('normalizes safe company website URLs', () => {
    expect(normalizeExternalUrl('example.com')).toBe('https://example.com/');
    expect(normalizeExternalUrl('https://example.com/careers')).toBe('https://example.com/careers');
    expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull();
  });

  it('filters duplicate and unsafe workplace images', () => {
    expect(
      getValidWorkplaceImages([
        'https://cdn.example.com/office.jpg',
        'https://cdn.example.com/office.jpg',
        'javascript:alert(1)',
      ]),
    ).toEqual(['https://cdn.example.com/office.jpg']);
  });

  it('creates a plain-text job summary without leaking backend HTML', () => {
    expect(stripCompanyHtml('<p>Xây dựng <strong>sản phẩm</strong> chất lượng.</p>'))
      .toBe('Xây dựng sản phẩm chất lượng.');
  });
});
