import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        icon?: string;
        rotate?: string | number;
        flip?: string;
        mode?: string;
        inline?: boolean;
        noObserver?: boolean;
        class?: string;
        style?: React.CSSProperties;
      };
    }
  }
}
