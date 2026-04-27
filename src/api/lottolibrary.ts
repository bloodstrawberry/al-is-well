import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import lottoNumber from 'json/lottoNumber.json';

export type LottoRound = {
  totSellamnt: number;
  returnValue: string;
  drwNoDate: string;
  firstWinamnt: number;
  drwtNo6: number;
  drwtNo4: number;
  drwtNo5: number;
  bnusNo: number;
  firstAccumamnt: number;
  drwNo: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo1: number;
  firstPrzwnerCo: number;
};

export const Ball = styled(Box)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '2rem',
  boxShadow: theme.shadows[10],
  position: 'relative',
  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
  border: '2px solid rgba(255,255,255,0.2)',
  [theme.breakpoints.down('md')]: {
    width: 60,
    height: 60,
    fontSize: '1.5rem',
  },
  [theme.breakpoints.down('sm')]: {
    width: 36,
    height: 36,
    fontSize: '0.875rem',
  },
}));

// Theme types
export type ThemeType = 'default' | 'range';

export const THEME_NAMES: Record<ThemeType, string> = {
  default: '기본',
  range: '범위별',
};

// Ball color for home display (original function)
export const getBallColor = (num: number) => {
  if (num <= 10) return '#fbc400';
  if (num <= 20) return '#69c8f2';
  if (num <= 30) return '#ff7272';
  if (num <= 40) return '#aaaaaa';
  return '#b0d840';
};

// Theme-based cell colors for pattern view
export const getCellColorByTheme = (theme: ThemeType, num: number, isWinning: boolean, isBonus: boolean, isClicked: boolean): string => {
  // Bonus always has priority
  if (isBonus) return '#d54dffff';
  
  // Clicked state
  if (isClicked) return '#000000ff';
  
  // Non-winning cells
  if (!isWinning) return '#F1F3F4';
  
  // Winning cells - apply theme
  if (theme === 'range') {
    // Range-based colors (same as getBallColor)
    if (num <= 10) return '#fbc400';
    if (num <= 20) return '#69c8f2';
    if (num <= 30) return '#ff7272';
    if (num <= 40) return '#aaaaaa';
    return '#b0d840';
  }
  
  // Default theme
  return '#658effff';
};

// Get predict cell color (for user selection row)
export const getPredictCellColor = (theme: ThemeType, num: number, isSelected: boolean): string => {
  if (isSelected) return '#000000ff';
  
  // Non-selected cells show theme preview
  if (theme === 'range') {
    // Show range colors even when not selected
    if (num <= 10) return '#fbc400';
    if (num <= 20) return '#69c8f2';
    if (num <= 30) return '#ff7272';
    if (num <= 40) return '#aaaaaa';
    return '#b0d840';
  }
  
  // Default theme
  return '#E8EAED';
};

export const getLength = () => {
    return lottoNumber.length;
}

export const getLatestLottoNumber = () => {
  if (!lottoNumber || lottoNumber.length === 0) {
    return null;
  }

  const latest = lottoNumber[lottoNumber.length - 1];

  return {
    ...latest,
    numbers: [latest.drwtNo1, latest.drwtNo2, latest.drwtNo3, latest.drwtNo4, latest.drwtNo5, latest.drwtNo6],
    bonus: latest.bnusNo
  };
};

export const getLottoByIndex = (index: number) => {
  if (!lottoNumber || lottoNumber.length === 0 || index < 0 || index >= lottoNumber.length) {
    return null;
  }

  const target = lottoNumber[index];

  return {
    ...target,
    numbers: [target.drwtNo1, target.drwtNo2, target.drwtNo3, target.drwtNo4, target.drwtNo5, target.drwtNo6],
    bonus: target.bnusNo
  };
};

export const getAllLottoNumbers = () => {
  return lottoNumber.map((item) => ({
    ...item,
    numbers: [item.drwtNo1, item.drwtNo2, item.drwtNo3, item.drwtNo4, item.drwtNo5, item.drwtNo6],
    bonus: item.bnusNo,
  }));
};