"use client";

import { useState, useEffect } from "react";

const IMAGES = [
  "/images/banniere-1.jpg",
  "/images/banniere-2.jpg",
  "/images/banniere-3.jpg",
];

/**
 * Bandeau photo qui alterne automatiquement entre plusieurs images,
 * avec un fondu enchaine. "Dynamique" = change tout seul dans le temps,
 * pas besoin d'action de l'utilisateur.
 */
export default function BanniereCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        height: 260,
        overflow: "hidden",
        position: "relative",
        borderRadius: 16,
        background: "linear-gradient(135deg, #C75B39 0%, #26221C 100%)",
      }}
    >
      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: i === index ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
          }}
        />
      ))}

      {/* Indicateurs de position */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
        }}
      >
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Image ${i + 1}`}
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: i === index ? "white" : "rgba(255,255,255,0.5)",
              transition: "width 0.3s, background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
