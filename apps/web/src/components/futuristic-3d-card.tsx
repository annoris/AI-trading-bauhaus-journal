"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Futuristic3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  depth?: number;
}

export function Futuristic3DCard({
  children,
  className,
  glowColor = "rgba(53, 208, 116, 0.2)",
  depth = 20,
  ...props
}: Futuristic3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.6,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      style={{ perspective: "1000px" }}
      className="inline-block w-full transition-transform duration-200"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${depth}px)`,
          transition: "transform 0.15s ease-out, box-shadow 0.2s ease",
        }}
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10 bg-[#0e1312]/90 backdrop-blur-md transition-all hover:border-brand/40 hover:shadow-[0_15px_35px_-10px_rgba(53,208,116,0.25)]",
          className,
        )}
        {...props}
      >
        {/* Holographic light sheen glare */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 180px at ${glarePos.x}% ${glarePos.y}%, ${glowColor}, transparent 70%)`,
            opacity: glarePos.opacity,
          }}
        />
        {/* Subtle cyber grid overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-20">{children}</div>
      </div>
    </div>
  );
}
