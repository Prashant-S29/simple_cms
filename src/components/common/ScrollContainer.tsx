"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollContainer({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  const updateShadows = () => {
    const el = scrollRef.current;
    if (!el) return;

    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    setShowTop(!atTop);
    setShowBottom(!atBottom);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateShadows(); // check on mount
    el.addEventListener("scroll", updateShadows, { passive: true });

    // Also watch for content size changes
    const ro = new ResizeObserver(updateShadows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateShadows);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="bg-secondary relative h-full w-full overflow-hidden rounded-2xl">
      {/* Top shadow */}
      <div
        className={`from-secondary to-secondary/0 pointer-events-none absolute top-0 left-0 z-40 h-20 w-full bg-linear-to-b transition-opacity duration-300 ${
          showTop ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Scrollable content */}
      <div ref={scrollRef} className="h-full w-full overflow-y-scroll">
        {children}
      </div>

      {/* Bottom shadow */}
      <div
        className={`from-secondary to-secondary/0 pointer-events-none absolute bottom-0 left-0 z-40 h-20 w-full bg-linear-to-t transition-opacity duration-300 ${
          showBottom ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
