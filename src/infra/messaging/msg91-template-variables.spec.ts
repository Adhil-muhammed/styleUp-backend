import { toMsg91Components } from './msg91-template-variables';

describe('toMsg91Components', () => {
  it('maps numeric keys to body_N components', () => {
    expect(toMsg91Components({ '1': 'Alex', '2': '10 AM' })).toEqual({
      body_1: { type: 'text', value: 'Alex' },
      body_2: { type: 'text', value: '10 AM' },
    });
  });

  it('maps named keys to positional body_N components', () => {
    expect(toMsg91Components({ customer_name: 'Alex', time: '10 AM' })).toEqual({
      body_1: { type: 'text', value: 'Alex' },
      body_2: { type: 'text', value: '10 AM' },
    });
  });

  it('preserves body_N keys as-is', () => {
    expect(toMsg91Components({ body_1: 'x' })).toEqual({
      body_1: { type: 'text', value: 'x' },
    });
  });
});
