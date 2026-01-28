"use client";

import { useTheme } from "next-themes";
import DarkVeil from "./dark-veil";
import { useEffect, useState } from "react";

export function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isVeilTheme = mounted && theme === "veil";

  return (
    <div className="relative min-h-screen w-full">
      {isVeilTheme && (
        <div className="fixed inset-0 z-0">
          <DarkVeil
            hueShift={0}
            noiseIntensity={0.02}
            scanlineIntensity={0.1}
            speed={0.5}
            scanlineFrequency={2}
            warpAmount={0.3}
            resolutionScale={1}
          />
        </div>
      )}
      <div className={isVeilTheme ? "relative z-10" : ""}>{children}</div>
    </div>
  );
}

