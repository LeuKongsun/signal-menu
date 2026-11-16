"use client";

import React, { useState } from "react";
import {
  X,
  QrCode,
  Banknote,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TrayItem } from "./OrderTray";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tray: TrayItem[];
  onOrderSuccess: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  tray,
  onOrderSuccess,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"aba" | "cash">("aba");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    isMock?: boolean;
    message?: string;
  } | null>(null);
  const [copiedAcc, setCopiedAcc] = useState(false);

  const abaAccName =
    process.env.NEXT_PUBLIC_ABA_ACCOUNT_NAME || "SIGNAL CAFE";
  const abaAccNumber =
    process.env.NEXT_PUBLIC_ABA_ACCOUNT_NUMBER || "000 123 456";

  const totalCount = tray.reduce((sum, i) => sum + i.quantity, 0);
  const totalUsd = tray.reduce((sum, i) => sum + i.price.usd * i.quantity, 0);
  const totalRiel = tray.reduce((sum, i) => sum + i.price.riel * i.quantity, 0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(abaAccNumber.replace(/\s+/g, ""));
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះរបស់អ្នក / Please enter your name");
      return;
    }

    if (paymentMethod === "aba" && !receiptFile) {
      setErrorMsg(
        "សូមភ្ជាប់រូបភាពវិក្កយបត្រ ABA / Please attach your ABA payment receipt"
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNotes: customerNotes.trim(),
        paymentMethod,
        totalRiel,
        totalUsd,
        items: tray.map((t) => ({
          nameKh: t.item.nameKh,
          nameEn: t.item.nameEn,
          size: t.item.prices.large
            ? t.size === "regular"
              ? "Regular"
              : "Large"
            : "",
          quantity: t.quantity,
          priceRiel: t.price.riel * t.quantity,
          priceUsd: t.price.usd * t.quantity,
        })),
      };

      const formData = new FormData();
      formData.append("orderData", JSON.stringify(orderPayload));
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      const res = await fetch("/api/order", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit order");
      }

      setCompletedOrder({
        orderNumber: data.orderNumber,
        isMock: data.isMock,
        message: data.message,
      });
      onOrderSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit order. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCompletedOrder(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8E583C]/10 text-[#8E583C] flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base leading-tight">
                {completedOrder ? "Order Confirmed" : "Confirm & Pay"}
              </h3>
              <p className="text-xs text-stone-500 font-khmer">
                {completedOrder
                  ? "ការបញ្ជាទិញបានជោគជ័យ"
                  : `សរុប ${totalCount} កែវ • ${totalRiel.toLocaleString()}៛`}
              </p>
            </div>
          </div>

          <button
            onClick={completedOrder ? handleResetAndClose : onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {completedOrder ? (
            // Success Screen
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-stone-100 text-[#8E583C] tracking-widest uppercase mb-1">
                  Order #{completedOrder.orderNumber}
                </span>
                <h3 className="text-xl font-black text-stone-900 font-khmer">
                  ការបញ្ជាទិញទទួលបានជោគជ័យ!
                </h3>
                <p className="text-sm text-stone-600 mt-1">
                  Thank you, <strong>{customerName}</strong>! Your order has
                  been sent to our barista.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-stone-900">
                  <span>Customer:</span>
                  <span>{customerName}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Drinks count:</span>
                  <span>{totalCount} items</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Total Amount:</span>
                  <span className="font-bold text-[#8E583C]">
                    {totalRiel.toLocaleString()} ៛ (${totalUsd.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Payment:</span>
                  <span className="font-semibold">
                    {paymentMethod === "aba" ? "ABA KHQR (Paid)" : "Cash on Pickup"}
                  </span>
                </div>
              </div>

              {completedOrder.isMock && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-left">
                  ℹ️ <strong>Test Mode Note:</strong> {completedOrder.message}
                </div>
              )}

              <p className="text-xs text-stone-500 font-khmer">
                បារីស្តានឹងហៅឈ្មោះរបស់អ្នកនៅពេលភេសជ្ជៈរួចរាល់!
              </p>

              <button
                onClick={handleResetAndClose}
                className="w-full py-3 rounded-2xl bg-[#8E583C] text-white font-bold text-sm hover:bg-[#73432B] transition-all shadow-md shadow-[#8E583C]/20"
              >
                Done / New Order
              </button>
            </div>
          ) : (
            // Checkout Form
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Customer Details */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  1. Customer Details (ព័ត៌មានអតិថិជន)
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 font-khmer">
                    ឈ្មោះរបស់អ្នក / Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Dara / Sokha"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E583C]/30 focus:border-[#8E583C]"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Barista will call this name when your drinks are ready.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 012 345 678"
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E583C]/30 focus:border-[#8E583C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Notes / Request (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="e.g. 50% sugar, extra ice"
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E583C]/30 focus:border-[#8E583C]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  2. Payment Method (វិធីសាស្ត្រទូទាត់)
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("aba")}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === "aba"
                        ? "border-[#8E583C] bg-amber-50/50 ring-1 ring-[#8E583C]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        paymentMethod === "aba"
                          ? "bg-[#8E583C] text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900 leading-tight">
                        ABA KHQR
                      </div>
                      <div className="text-[10px] text-stone-500">Scan & Upload</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === "cash"
                        ? "border-[#8E583C] bg-amber-50/50 ring-1 ring-[#8E583C]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        paymentMethod === "cash"
                          ? "bg-[#8E583C] text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900 leading-tight">
                        Cash on Pickup
                      </div>
                      <div className="text-[10px] text-stone-500">Pay at counter</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 3: Payment Details (QR & Upload) */}
              {paymentMethod === "aba" ? (
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200 space-y-4">
                  {/* Amount to pay */}
                  <div className="text-center pb-2 border-b border-stone-200">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      Total Amount to Transfer
                    </span>
                    <div className="font-black text-2xl text-[#8E583C]">
                      {totalRiel.toLocaleString()} ៛
                    </div>
                    <div className="text-xs font-bold text-stone-600">
                      ≈ ${totalUsd.toFixed(2)} USD
                    </div>
                  </div>

                  {/* ABA QR Code Card */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-52 sm:w-60 bg-white p-2 rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                      <img
                        src="/aba-qr.jpg"
                        alt="SIGNAL ABA KHQR"
                        className="w-full h-auto object-contain rounded-xl"
                      />
                    </div>

                    {/* Account manual copy */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-600 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                      <span>ABA: {abaAccNumber} ({abaAccName})</span>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="p-1 rounded text-stone-400 hover:text-stone-700"
                        title="Copy account number"
                      >
                        {copiedAcc ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Receipt Upload Box */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 font-khmer">
                      ភ្ជាប់រូបភាពវិក្កយបត្រ (Upload Payment Receipt){" "}
                      <span className="text-rose-500">*</span>
                    </label>

                    {receiptPreview ? (
                      <div className="relative rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={receiptPreview}
                            alt="Receipt Preview"
                            className="w-12 h-12 object-cover rounded-xl border border-emerald-200"
                          />
                          <div className="text-xs truncate">
                            <span className="font-bold text-emerald-800 block truncate">
                              {receiptFile?.name}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              Receipt ready to send
                            </span>
                          </div>
                        </div>

                        <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-white text-stone-700 text-xs font-bold border border-stone-200 hover:bg-stone-50 transition-colors shrink-0">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#8E583C] bg-white transition-colors group">
                        <Upload className="w-6 h-6 text-stone-400 group-hover:text-[#8E583C] mb-1 transition-colors" />
                        <span className="text-xs font-bold text-stone-700 group-hover:text-[#8E583C]">
                          Tap to Upload Payment Screenshot
                        </span>
                        <span className="text-[10px] text-stone-400">
                          Takes 2 seconds from your photo gallery
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                // Cash Note
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    <span>Pay Cash at Counter</span>
                  </div>
                  <p>
                    Please pay <strong>{totalRiel.toLocaleString()} ៛</strong> ($
                    {totalUsd.toFixed(2)}) directly to the barista when picking
                    up your order.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#8E583C] hover:bg-[#73432B] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#8E583C]/25 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Order to Telegram...</span>
                    </>
                  ) : (
                    <span>
                      {paymentMethod === "aba"
                        ? `Confirm & Send Receipt • ${totalRiel.toLocaleString()}៛`
                        : `Place Order • ${totalRiel.toLocaleString()}៛`}
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
