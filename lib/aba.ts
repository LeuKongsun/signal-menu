/** Set NEXT_PUBLIC_ABA_PAYMENT_ENABLED=false to hide ABA KHQR checkout; cash on pickup is always offered. */
export const ABA_PAYMENT_ENABLED = process.env.NEXT_PUBLIC_ABA_PAYMENT_ENABLED !== "false";

export const ABA_ACCOUNT_NAME = process.env.NEXT_PUBLIC_ABA_ACCOUNT_NAME || "SOLIKAH MAKARA";
export const ABA_PAY_LINK =
  process.env.NEXT_PUBLIC_ABA_PAY_LINK || "https://pay.ababank.com/oRF8/lyyuerfa";
