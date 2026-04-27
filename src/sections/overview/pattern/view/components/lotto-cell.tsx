import React, { memo } from "react";

export type LottoCellProps = {
  num: number;
  bgColor: string;
  textColor: string;
  overlayColor?: string;
  content: string | number;
  onClick?: () => void;
  cursor?: string;
  consecutiveColors?: string[];
};

export const LottoCell = memo(({ 
  num, 
  bgColor, 
  textColor, 
  overlayColor, 
  content, 
  onClick, 
  cursor = "default",
  ...restProps 
}: LottoCellProps) => (
  <React.Fragment key={num}>
    <div
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        aspectRatio: "1/1",
        backgroundColor: bgColor,
        borderRadius: "20%",
        cursor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "clamp(0.1px, 1.8vw, 12px)",
        color: textColor,
        position: "relative",
        overflow: "hidden",
        transition: "background-color 0.5s ease, box-shadow 0.5s ease",
        boxShadow: restProps.consecutiveColors 
          ? (restProps.consecutiveColors.length === 1 
              ? `inset 0 0 0 5px ${restProps.consecutiveColors[0]}`
              : (() => {
                  const colors = restProps.consecutiveColors!;
                  const getC = (idx: number) => colors[idx % colors.length];
                  
                  const sTop = `inset 0 5px 0 0 ${getC(0)}`;
                  const sRight = `inset -5px 0 0 0 ${getC(1)}`;
                  const sBot = `inset 0 -5px 0 0 ${colors.length > 2 ? getC(2) : getC(1)}`;
                  const sLeft = `inset 5px 0 0 0 ${colors.length > 3 ? getC(3) : getC(0)}`;
                  
                  return `${sTop}, ${sRight}, ${sBot}, ${sLeft}`;
              })()
            )
          : "none",
      }}
    >
      <div style={{
          position: 'absolute',
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          backgroundColor: overlayColor || 'transparent',
          pointerEvents: 'none',
          transition: 'background-color 0.5s ease',
      }} />
      <span style={{ position: 'relative', zIndex: 1 }}>
        {content}
      </span>
    </div>
  </React.Fragment>
));
