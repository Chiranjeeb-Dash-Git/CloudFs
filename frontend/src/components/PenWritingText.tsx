"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface PenWritingTextProps {
  text: string;
  className?: string;
}

export function PenWritingText({ text, className = "" }: PenWritingTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Split text into individual characters
    const chars = text.split("");
    el.innerHTML = "";
    
    // Add characters inside spans
    const charElements = chars.map((char) => {
      const span = document.createElement("span");
      // Preserve spaces
      span.innerText = char === " " ? "\u00A0" : char;
      span.style.opacity = "0";
      span.style.display = "inline-block";
      el.appendChild(span);
      return span;
    });

    // Add a pen-tip cursor span
    const cursor = document.createElement("span");
    cursor.className = "inline-block w-[2px] h-[1.1em] bg-white/80 ml-[1px]";
    cursor.style.verticalAlign = "middle";
    el.appendChild(cursor);

    // Animate character opacity sequentially to simulate typing/writing
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        delay: 0.6,
      });

      tl.to(charElements, {
        opacity: 1,
        duration: 0.015,
        stagger: 0.02,
        ease: "none",
        onUpdate: function () {
          // Move the cursor after the latest visible character
          el.appendChild(cursor);
        },
        onComplete: () => {
          // Fade out the cursor beautifully after writing completes
          gsap.to(cursor, {
            opacity: 0,
            duration: 0.8,
            delay: 1.5,
            repeat: -1,
            yoyo: true,
          });
        },
      });
    }, el);

    return () => ctx.revert();
  }, [text]);

  return <p ref={containerRef} className={className} style={{ display: "inline-block" }} />;
}

export default PenWritingText;
