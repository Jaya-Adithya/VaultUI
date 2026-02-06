"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WaterProgressProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  duration?: number;
}

export function WaterProgress({
  className,
  size = 24,
  strokeWidth = 2,
  duration = 2000,
}: WaterProgressProps) {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progressPercent = Math.min((elapsed / duration) * 100, 100);

      setProgress(progressPercent);

      if (progressPercent < 100) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [duration]);

  // Reset progress when component mounts
  useEffect(() => {
    setProgress(0);
  }, []);

  const fillHeight = (progress / 100) * size;
  const waterLevel = size - fillHeight;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))" }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="opacity-20"
        />
        {/* Progress circle stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
          style={{
            filter: "drop-shadow(0 0 4px currentColor)",
          }}
        />
      </svg>

      {/* Water fill effect - goes both sides */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
        style={{
          clipPath: `circle(${radius}px at ${size / 2}px ${size / 2}px)`,
        }}
      >
        <div
          className="absolute left-0 right-0 w-full"
          style={{
            bottom: `${waterLevel}px`,
            height: `${fillHeight}px`,
            background: `linear-gradient(to top, 
              currentColor 0%, 
              currentColor 35%, 
              rgba(255, 255, 255, 0.4) 50%, 
              currentColor 65%, 
              currentColor 100%)`,
            opacity: progress > 0 ? 0.75 : 0,
            transition: "opacity 0.3s ease-out, height 0.3s ease-out",
          }}
        >
          {/* Wave animation overlay - horizontal (left to right) */}
          <div
            className="absolute inset-0 w-full water-wave-horizontal"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 3px,
                rgba(255, 255, 255, 0.2) 3px,
                rgba(255, 255, 255, 0.2) 6px
              )`,
              opacity: 0.6,
            }}
          />
          {/* Wave animation overlay - vertical (up and down) */}
          <div
            className="absolute inset-0 w-full water-wave-vertical"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 4px,
                rgba(255, 255, 255, 0.2) 4px,
                rgba(255, 255, 255, 0.2) 8px
              )`,
              opacity: 0.5,
            }}
          />
          {/* Additional shimmer effect */}
          <div
            className="absolute inset-0 w-full"
            style={{
              background: `linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.1) 25%,
                rgba(255, 255, 255, 0.2) 50%,
                rgba(255, 255, 255, 0.1) 75%,
                transparent 100%
              )`,
              animation: "water-wave-horizontal 2s linear infinite",
              opacity: 0.7,
            }}
          />
        </div>
      </div>

      {/* Percentage text in center */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <span
          className="text-[10px] font-medium tabular-nums"
          style={{ fontSize: `${size * 0.35}px` }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

