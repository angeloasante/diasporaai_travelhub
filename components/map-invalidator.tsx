"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface MapInvalidatorProps {
  dependencies?: unknown[];
}

export function MapInvalidator({ dependencies = [] }: MapInvalidatorProps) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Always invalidate on mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    // Skip the first render since we handle it above
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // When dependencies change (panels collapse/expand), invalidate after animation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 350); // Match the animation duration

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ...dependencies]);

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => map.invalidateSize(), 100);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
}
