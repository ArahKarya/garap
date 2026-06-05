import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * useReveal — toggles a boolean once the observed element scrolls into view.
 * Reveals only once (disconnects after first intersection). When IntersectionObserver
 * is unavailable, or when the user prefers reduced motion, it returns `true` immediately
 * so content is shown without animation.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(rootMargin = '-10% 0px') {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, visible };
}

interface RevealProps {
  children: ReactNode;
  /** Stagger order — multiplied by 80ms for a cascading reveal. */
  index?: number;
  className?: string;
}

/**
 * Reveal — wraps content in a fade + slide-up that triggers on scroll into view.
 * Uses the `.reveal` / `.is-visible` utility pair from index.css.
 */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {children}
    </div>
  );
}
