"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type HorizontalTabsNoArrowsProps = {
  children: ReactNode;
  className?: string;
};

export default function HorizontalTabsNoArrows({
  children,
  className = "",
}: HorizontalTabsNoArrowsProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      {showLeft ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-lg bg-gradient-to-r from-[#fffdf9] to-transparent dark:from-[#141918] md:hidden" />
      ) : null}
      {showRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-[#fffdf9] to-transparent dark:from-[#141918] md:hidden" />
      ) : null}
      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  );
}
