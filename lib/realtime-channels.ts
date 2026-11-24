export function loyaltyChannel(qrToken: string) {
  return `signal:loyalty:${qrToken}`;
}

export function loyaltyStoreChannel(storeId: string) {
  return `signal:store:${storeId}:loyalty`;
}
