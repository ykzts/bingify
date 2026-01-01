import { useCallback, useEffect, useRef, useState } from "react";

interface UseDrumRollOptions {
  /**
   * Duration of the animation in milliseconds
   * @default 1800
   */
  duration?: number;
  /**
   * Minimum number in the range
   * @default 1
   */
  min?: number;
  /**
   * Maximum number in the range
   * @default 75
   */
  max?: number;
}

interface UseDrumRollReturn {
  /**
   * Current number being displayed during animation
   */
  currentNumber: number | null;
  /**
   * Whether the drum roll animation is currently playing
   */
  isAnimating: boolean;
  /**
   * Start the drum roll animation
   * @param finalNumber - The final number to display after animation completes
   * @returns Promise that resolves when animation completes
   */
  startDrumRoll: (finalNumber: number) => Promise<void>;
}

/**
 * Hook to create a drum roll animation effect for number display.
 * Shows random numbers with decreasing speed (easing) before showing the final number.
 */
export function useDrumRoll(options?: UseDrumRollOptions): UseDrumRollReturn {
  const { duration = 1800, min = 1, max = 75 } = options || {};
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startDrumRoll = useCallback(
    (finalNumber: number): Promise<void> => {
      return new Promise((resolve) => {
        setIsAnimating(true);
        startTimeRef.current = performance.now();
        let lastUpdate = 0;

        const animate = (timestamp: number) => {
          const elapsed = timestamp - startTimeRef.current;
          const progress = Math.min(elapsed / duration, 1);

          if (progress < 1) {
            // Easing function: starts fast, slows down exponentially
            const easedProgress = 1 - (1 - progress) ** 3;

            // Calculate interval based on eased progress
            // Start with ~16ms (60fps), end with ~200ms
            const minInterval = 16;
            const maxInterval = 200;
            const currentInterval =
              minInterval + (maxInterval - minInterval) * easedProgress;

            // Only update number if enough time has passed
            if (timestamp - lastUpdate >= currentInterval) {
              // Show random number
              const randomNum =
                Math.floor(Math.random() * (max - min + 1)) + min;
              setCurrentNumber(randomNum);
              lastUpdate = timestamp;
            }

            animationRef.current = requestAnimationFrame(animate);
          } else {
            // Animation complete - show final number
            setCurrentNumber(finalNumber);
            setIsAnimating(false);
            animationRef.current = null;
            resolve();
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      });
    },
    [duration, min, max]
  );

  return {
    currentNumber,
    isAnimating,
    startDrumRoll,
  };
}
