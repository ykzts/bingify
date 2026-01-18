"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  threshold?: number;
}

/**
 * Client component that triggers CSS animations when element enters viewport
 * Uses Intersection Observer API for viewport detection
 *
 * @example
 * ```tsx
 * <AnimateOnScroll className="animate-fade-in-up">
 *   <h1>Visible when scrolled into view</h1>
 * </AnimateOnScroll>
 * ```
 */
export function AnimateOnScroll({
  children,
  className = "",
  style,
  threshold = 0.1,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Trigger animation via React state
          setIsVisible(true);
          // Only trigger once (like motion's viewport={{ once: true }})
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div
      className={cn(
        isVisible ? "animation-running" : "animation-paused",
        "motion-reduce:transform-none! fill-mode-[both] opacity-0 motion-reduce:animate-none! motion-reduce:opacity-100!",
        className
      )}
      ref={ref}
      style={style}
    >
      {children}
    </div>
  );
}
