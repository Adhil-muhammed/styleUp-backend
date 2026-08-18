import { sanitizePhoneForMsg91 } from './sanitize-phone-for-msg91';

describe('sanitizePhoneForMsg91', () => {
  it('strips leading plus sign', () => {
    expect(sanitizePhoneForMsg91('+919876543210')).toBe('919876543210');
  });

  it('trims whitespace before stripping plus', () => {
    expect(sanitizePhoneForMsg91('  +919876543210  ')).toBe('919876543210');
  });

  it('leaves bare digits unchanged', () => {
    expect(sanitizePhoneForMsg91('919876543210')).toBe('919876543210');
  });
});
