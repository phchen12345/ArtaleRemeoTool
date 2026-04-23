"use client";

import { useEffect, useRef } from "react";

type Params = {
  onShow: (message: string) => void;
  onClear: () => void;
  duration?: number;
};

export function useToastMessage({ onShow, onClear, duration = 1800 }: Params) {
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(message: string) {
    onShow(message);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      onClear();
      toastTimerRef.current = null;
    }, duration);
  }

  return { showToast };
}
