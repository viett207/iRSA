import { getContactPhoneError, normalizeContactPhone } from './job-detail.component';

describe('JobDetail contact phone helpers', () => {
  it('accepts common Vietnamese mobile phone formats', () => {
    expect(getContactPhoneError('0912 345 678')).toBeNull();
    expect(getContactPhoneError('+84 912 345 678')).toBeNull();
  });

  it('rejects missing or invalid phone numbers with a friendly message', () => {
    expect(getContactPhoneError('')).toContain('Vui lòng nhập');
    expect(getContactPhoneError('12345')).toContain('chưa hợp lệ');
  });

  it('normalizes separators before submission', () => {
    expect(normalizeContactPhone('(0912) 345-678')).toBe('0912345678');
  });
});
