export const SHOP_LOOKUP = Symbol('SHOP_LOOKUP');

export interface ShopLookupPort {
  existsById(shopId: string): Promise<boolean>;
}
