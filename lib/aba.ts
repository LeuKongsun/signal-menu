/** ABA KHQR checkout is off unless NEXT_PUBLIC_ABA_PAYMENT_ENABLED=true; cash on pickup is always offered. */
export const ABA_PAYMENT_ENABLED = process.env.NEXT_PUBLIC_ABA_PAYMENT_ENABLED === "true";

export const ABA_ACCOUNT_NAME = process.env.NEXT_PUBLIC_ABA_ACCOUNT_NAME || "SIGNAL CAFE";
export const ABA_ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_ABA_ACCOUNT_NUMBER || "000 123 456";
export const ABA_PAY_LINK =
  process.env.NEXT_PUBLIC_ABA_PAY_LINK || "https://pay.ababank.com/oRF8/ct9mjwy8";
