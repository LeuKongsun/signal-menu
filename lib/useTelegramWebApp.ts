"use client";

import { useEffect, useState } from "react";

type BottomButton = {
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }): void;
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string };
  };
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  openLink(url: string): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  MainButton: BottomButton;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SCRIPT_SRC = "https://telegram.org/js/telegram-web-app.js";

function launchedFromTelegram() {
  return (
    window.location.hash.includes("tgWebApp") ||
    window.sessionStorage.getItem("__telegram__initParams") !== null
  );
}

/**
 * Returns Telegram's Mini App API when the page was opened inside Telegram,
 * otherwise null. Telegram's script is only downloaded for Telegram launches.
 */
export function useTelegramWebApp(): TelegramWebApp | null {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    if (!launchedFromTelegram()) return;

    const init = () => {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) return;
      tg.ready();
      tg.expand();
      if (tg.isVersionAtLeast("6.9")) {
        tg.setHeaderColor("#FAF7F2");
        tg.setBackgroundColor("#FAF8F5");
      }
      setWebApp(tg);
    };

    if (window.Telegram?.WebApp) {
      Promise.resolve().then(init);
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", init);
    return () => script?.removeEventListener("load", init);
  }, []);

  return webApp;
}
