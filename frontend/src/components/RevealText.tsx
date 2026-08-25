"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function RevealText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = text.split(" ");
    el.innerHTML = "";
    const inners: HTMLSpanElement[] = [];
    words.forEach((word) => {
      const wrapper = document.createElement("span");
      wrapper.className = "inline-flex overflow-hidden pb-1 -mb-1 mr-[0.25em] align-top";
      const inner = document.createElement("span");
      inner.className = "reveal-word inline-block";
      inner.style.transform = "translateY(110%)";
      inner.style.opacity = "0";
      inner.innerText = word;
      wrapper.appendChild(inner);
      el.appendChild(wrapper);
      inners.push(inner);
    });

    const ctx = gsap.context(() => {
      gsap.to(inners, {
        y: "0%",
        opacity: 1,
        duration: 1.2,
        stagger: 0.04,
        ease: "power4.out",
        delay: 0.2,
        scrollTrigger: {
          trigger: el,
          start: "top 95%",
        },
      });
      ScrollTrigger.refresh();
    }, el);

    return () => ctx.revert();
  }, [text]);

  return (
    <h1 ref={ref} className={`reveal-text ${className}`}>
      {text}
    </h1>
  );
}
