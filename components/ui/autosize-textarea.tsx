"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef } from "react";

type AutosizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maximumHeight?: number;
};

export const AutosizeTextarea = forwardRef<HTMLTextAreaElement, AutosizeTextareaProps>(
  function AutosizeTextarea({ maximumHeight = 420, value, ...props }, forwardedRef) {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const setRef = useCallback((node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    useLayoutEffect(() => {
      const textarea = internalRef.current;
      if (!textarea) return;
      const minimumHeight = Number.parseFloat(window.getComputedStyle(textarea).minHeight) || 0;
      textarea.style.height = "0px";
      const naturalHeight = Math.max(minimumHeight, textarea.scrollHeight);
      textarea.style.height = `${Math.min(naturalHeight, maximumHeight)}px`;
      textarea.style.overflowY = naturalHeight > maximumHeight ? "auto" : "hidden";
    }, [maximumHeight, value]);

    return <textarea {...props} ref={setRef} value={value} />;
  },
);
