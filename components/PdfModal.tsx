"use client";

import React, { useEffect } from "react";
import { X, Download, ExternalLink, FileText } from "lucide-react";

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PdfModal({ isOpen, onClose }: PdfModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-[#FAF7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8E583C]/10 text-[#8E583C] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base leading-tight">
                Original Menu Document
              </h3>
              <p className="text-xs text-stone-500 font-khmer">
                ម៉ឺនុយដើមរបស់ SIGNAL Cafe
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/Signal%20Menu.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open PDF</span>
            </a>
            <a
              href="/Signal%20Menu.pdf"
              download="Signal-Menu.pdf"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#8E583C] text-white hover:bg-[#73432B] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF / Image Content */}
        <div className="flex-1 overflow-auto p-4 bg-stone-100 flex items-center justify-center">
          <div className="relative rounded-xl overflow-hidden shadow-md max-w-full bg-white">
            <img
              src="/menu-preview-hd.png"
              alt="SIGNAL Cafe Menu PDF Preview"
              className="w-full h-auto object-contain max-h-[70vh]"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-[#FAF7F2] border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Signal Menu.pdf • 1.9 MB</span>
          <span className="font-khmer">ភេសជ្ជៈកាហ្វេ និងតែស្រស់ៗប្រចាំហាង SIGNAL</span>
        </div>
      </div>
    </div>
  );
}
