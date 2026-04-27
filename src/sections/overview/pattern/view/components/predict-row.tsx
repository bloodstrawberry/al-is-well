import React, { memo } from "react";
import Box from "@mui/material/Box";
import { ThemeType, getPredictCellColor } from "src/api/lottolibrary";
import { LottoCell } from "./lotto-cell";
import { getConsecutiveColors } from "../utils";

const LOTTO_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

type PredictRowProps = {
  selectedNumbers: number[];
  handleNumberClick: (num: number) => void;
  showNumbers: boolean;
  theme: ThemeType;
  showConsecutive: boolean;
  consecutiveCandidates: Record<number, Set<number>>;
};

export const PredictRow = memo(function PredictRow({
  selectedNumbers,
  handleNumberClick,
  showNumbers,
  theme,
  showConsecutive,
  consecutiveCandidates,
}: PredictRowProps) {

  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:"2px" }}>
      <Box
        sx={{
          width:"40px",
          flexShrink:0,
          fontSize:"10px",
          textAlign:"right",
          marginRight:"6px",
          color:"#999",
          fontFamily:"monospace",
          display:{ xs:"none", sm:"block" },
        }}
      >
        예측
      </Box>

      <div style={{ flex:1, display:"flex", gap:"1px" }}>
        {LOTTO_NUMBERS.map((num)=>{
          const isSelected = selectedNumbers.includes(num);
          const shouldShowNumber = showNumbers || isSelected; // Simplified logic
          const bgColor = getPredictCellColor(theme, num, isSelected);
          const textColor = (isSelected || theme !== 'default') ? '#fff' : '#555';
          
          let consecutiveColors;
          if (showConsecutive) {
              consecutiveColors = getConsecutiveColors(consecutiveCandidates[num]);
          }

          return (
            <LottoCell
              key={num}
              num={num}
              bgColor={bgColor}
              textColor={shouldShowNumber ? textColor : "transparent"}
              content={shouldShowNumber ? num : ""}
              onClick={() => handleNumberClick(num)}
              cursor="pointer"
              consecutiveColors={consecutiveColors}
            />
          );
        })}
      </div>
    </div>
  );
});
