"use client";

import { useState, useCallback } from "react";

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (value: boolean) => void;
  toggle: () => void;
}

/**
 * Generic modal hook
 */
export function useModal(initialState = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState<boolean>(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setOpen = useCallback((value: boolean) => {
    setIsOpen(value);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    setOpen,
    toggle,
  };
}
