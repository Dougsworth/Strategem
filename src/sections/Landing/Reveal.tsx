import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll-reveal: fades + lifts children into place the first time they enter the
// viewport. Honors prefers-reduced-motion (shows instantly). One-shot per element.
export const Reveal = ({
  children,
  delay = 0,
  y = 24,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — ref type varies with the polymorphic tag, harmless here
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${className}`}
      style={{
        transitionDelay: shown ? `${delay}ms` : "0ms",
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
      }}
    >
      {children}
    </Tag>
  );
};
