// Merchant payment config. Admin: change MERCHANT_VPA to your actual UPI ID.
export const MERCHANT_VPA = "neelpatelnp.2502@oksbi";
export const MERCHANT_NAME = "Aadhar Supermarket";

export const MIN_ORDER = 200;
export const HANDLING_CHARGE = 10;
export const DELIVERY_CHARGE = 30;
export const FREE_DELIVERY_OVER = 500;

export function computeBill(itemTotal: number) {
  const delivery = itemTotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_CHARGE;
  const handling = HANDLING_CHARGE;
  const grandTotal = itemTotal + delivery + handling;
  const savings = itemTotal >= FREE_DELIVERY_OVER ? DELIVERY_CHARGE : 0;
  return { itemTotal, delivery, handling, grandTotal, savings };
}
