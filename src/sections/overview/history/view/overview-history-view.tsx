'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from "src/layouts/dashboard";
import { getAllLottoNumbers, ThemeType, THEME_NAMES, getCellColorByTheme, getPredictCellColor } from "src/api/lottolibrary";

// ----------------------------------------------------------------------

const LOTTO_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

// 당첨 등수 계산 (보너스 번호 포함)
function calculatePrizeRank(selectedNumbers: number[], winningNumbers: number[], bonusNumber: number): { matchCount: number; rank: number | null; hasBonus: boolean } {
  const matchCount = selectedNumbers.filter(n => winningNumbers.includes(n)).length;
  const hasBonus = selectedNumbers.includes(bonusNumber);

  let rank: number | null = null;
  if (matchCount === 6) {
    rank = 1; // 1등: 6개 일치
  } else if (matchCount === 5 && hasBonus) {
    rank = 2; // 2등: 5개 + 보너스
  } else if (matchCount === 5) {
    rank = 3; // 3등: 5개 일치
  } else if (matchCount === 4) {
    rank = 4; // 4등: 4개 일치
  } else if (matchCount === 3) {
    rank = 5; // 5등: 3개 일치
  }

  return { matchCount, rank, hasBonus };
}

// 등수별 색상
function getRankColor(rank: number | null): string {
  switch (rank) {
    case 1: return '#FFD700'; // Gold
    case 2: return '#C0C0C0'; // Silver
    case 3: return '#CD7F32'; // Bronze
    case 4: return '#4CAF50'; // Green
    case 5: return '#2196F3'; // Blue
    default: return '#9E9E9E';
  }
}

// 등수 텍스트
function getRankText(rank: number | null): string {
  if (rank === null) return '낙첨';
  return `${rank}등`;
}

// LottoCell 컴포넌트 (간소화 버전)
const LottoCell = ({
  num,
  bgColor,
  textColor,
  content,
  onClick,
  cursor = "default",
  borderColor,
}: {
  num: number;
  bgColor: string;
  textColor: string;
  content: string | number;
  onClick?: () => void;
  cursor?: string;
  borderColor?: string;
}) => (
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
      boxShadow: borderColor ? `inset 0 0 0 3px ${borderColor}` : "none",
    }}
  >
    <span style={{ position: 'relative', zIndex: 1 }}>
      {content}
    </span>
  </div>
);

// 예측/선택 행 컴포넌트
function PredictRow({
  selectedNumbers,
  handleNumberClick,
  showNumbers,
  theme,
}: {
  selectedNumbers: number[];
  handleNumberClick: (num: number) => void;
  showNumbers: boolean;
  theme: ThemeType;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}>
      <Box
        sx={{
          width: "40px",
          flexShrink: 0,
          fontSize: "10px",
          textAlign: "right",
          marginRight: "6px",
          color: "#999",
          fontFamily: "monospace",
        }}
      >
        선택
      </Box>

      <div style={{ flex: 1, display: "flex", gap: "1px" }}>
        {LOTTO_NUMBERS.map((num) => {
          const isSelected = selectedNumbers.includes(num);
          const shouldShowNumber = showNumbers || isSelected;
          const bgColor = getPredictCellColor(theme, num, isSelected);
          const textColor = (isSelected || theme !== 'default') ? '#fff' : '#555';

          return (
            <LottoCell
              key={num}
              num={num}
              bgColor={bgColor}
              textColor={shouldShowNumber ? textColor : "transparent"}
              content={shouldShowNumber ? num : ""}
              onClick={() => handleNumberClick(num)}
              cursor="pointer"
            />
          );
        })}
      </div>

      {/* 결과 행의 등수 표시 영역과 동일한 너비의 빈 공간 */}
      <Box
        sx={{
          width: { xs: "40px", sm: "80px" },
          marginLeft: "6px",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// 결과 행 컴포넌트
function ResultRow({
  round,
  selectedNumbers,
  showNumbers,
  theme,
}: {
  round: any;
  selectedNumbers: number[];
  showNumbers: boolean;
  theme: ThemeType;
}) {
  let { matchCount, rank, hasBonus } = calculatePrizeRank(selectedNumbers, round.numbers, round.bonus);

  // 번호를 선택하지 않은 경우(초기 상태)에는 해당 회차의 당첨 번호 그 자체이므로 1등으로 표시
  if (selectedNumbers.length === 0) {
    rank = 1;
  }

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Box
        sx={{
          width: "40px",
          fontSize: "10px",
          textAlign: "right",
          marginRight: "6px",
          color: "#999",
          fontFamily: "monospace",
        }}
      >
        {round.drwNo}
      </Box>

      <div style={{ flex: 1, display: "flex", gap: "1px" }}>
        {LOTTO_NUMBERS.map((num) => {
          const isWinning = round.numbers.includes(num);
          const isBonus = round.bonus === num;
          const isSelected = selectedNumbers.includes(num);
          const isMatch = isSelected && isWinning;
          const isBonusMatch = isSelected && isBonus;

          let bgColor = getCellColorByTheme(theme, num, isWinning, isBonus, false);

          // 선택된 번호가 당첨 번호와 일치하면 강조
          if (isMatch || isBonusMatch) {
            bgColor = '#000000';
          }

          const shouldShowNumber = showNumbers || isMatch || isBonusMatch;

          return (
            <LottoCell
              key={num}
              num={num}
              bgColor={bgColor}
              textColor={shouldShowNumber ? "#fff" : "transparent"}
              content={shouldShowNumber ? num : ""}
              cursor="default"
              borderColor={isBonusMatch ? "#d54dff" : undefined}
            />
          );
        })}
      </div>

      {/* 결과 표시 */}
      <Box
        sx={{
          width: { xs: "40px", sm: "80px" },
          marginLeft: "6px",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <Chip
          label={getRankText(rank)}
          size="small"
          sx={{
            bgcolor: getRankColor(rank),
            color: '#fff',
            fontWeight: 'bold',
            fontSize: { xs: '8px', sm: '12px' },
            height: { xs: 14, sm: 22 },
            minWidth: { xs: 23, sm: 45 },
            '& .MuiChip-label': { px: 0.5 },
          }}
        />
        {hasBonus && rank === 2 && (
          <Iconify
            icon="mdi:star"
            width={14}
            sx={{
              color: '#FFD700',
              width: { xs: 10, sm: 14 },
              height: { xs: 10, sm: 14 }
            }}
          />
        )}
      </Box>
    </div>
  );
}

export function OverviewHistoryView() {
  const [data, setData] = useState<any[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [showNumbers, setShowNumbers] = useState(true);
  const [theme, setTheme] = useState<ThemeType>('range');
  const [visibleCount, setVisibleCount] = useState(50);
  const [sortByRank, setSortByRank] = useState(false);

  useEffect(() => {
    const allData = getAllLottoNumbers();
    const sortedDesc = [...allData].sort((a, b) => b.drwNo - a.drwNo);
    setData(sortedDesc);
  }, []);

  const handleNumberClick = useCallback((num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers((prev) => prev.filter((n) => n !== num));
    } else if (selectedNumbers.length < 6) {
      setSelectedNumbers((prev) => [...prev, num].sort((a, b) => a - b));
    }
  }, [selectedNumbers]);

  const handleClear = useCallback(() => {
    setSelectedNumbers([]);
    setVisibleCount(50);
  }, []);

  // 필터링된 결과 계산
  const filteredResults = useMemo(() => {
    if (selectedNumbers.length === 0) return data;
    // 1개 이상 선택 시 필터링 진행

    if (selectedNumbers.length === 6) {
      // 6개 선택 시: 5등 이상 당첨된 회차만 (3개 이상 일치)
      return data.filter((round) => {
        const matchCount = selectedNumbers.filter(n => round.numbers.includes(n)).length;
        return matchCount >= 3;
      });
    } else {
      // 1-5개 선택 시: 선택한 번호가 모두 포함된 회차만
      return data.filter((round) => {
        return selectedNumbers.every(n => round.numbers.includes(n) || round.bonus === n);
      });
    }
  }, [data, selectedNumbers]);

  const displayedResults = useMemo(() => {
    let results = [...filteredResults];

    if (sortByRank && selectedNumbers.length === 6) {
      // 등수별 정렬 (등수가 낮을수록 좋음, 같은 등수면 회차가 큰 것이 우선)
      results.sort((a, b) => {
        const rankA = calculatePrizeRank(selectedNumbers, a.numbers, a.bonus);
        const rankB = calculatePrizeRank(selectedNumbers, b.numbers, b.bonus);

        // rank가 null인 경우 (낙첨)는 가장 뒤로
        const rankValA = rankA.rank ?? 999;
        const rankValB = rankB.rank ?? 999;

        if (rankValA !== rankValB) {
          return rankValA - rankValB; // 낮은 등수가 우선
        }
        return b.drwNo - a.drwNo; // 같은 등수면 회차가 큰 것이 우선
      });
    }

    return results.slice(0, visibleCount);
  }, [filteredResults, visibleCount, sortByRank, selectedNumbers]);

  const selectionInfo = useMemo(() => {
    if (selectedNumbers.length === 0) {
      return `번호를 선택하여 당첨 내역을 확인하세요.`;
    }
    if (selectedNumbers.length === 6) {
      return `지금 뽑은 번호의 과거순위 (당첨 회차: ${filteredResults.length}개)`;
    }
    return `선택한 번호가 모두 포함된 회차: ${filteredResults.length}개`;
  }, [selectedNumbers, filteredResults]);

  return (
    <DashboardContent maxWidth="xl">
      <Card>
        <CardHeader
          title="과거순위"
          sx={{
            mb: 0,
            '& .MuiCardHeader-content': { display: { xs: 'none', sm: 'block' } },
            '& .MuiCardHeader-action': { m: 0, width: { xs: '100%', sm: 'auto' } },
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
              <Button
                variant="soft"
                color="error"
                size="small"
                onClick={handleClear}
                disabled={selectedNumbers.length === 0}
                sx={{ minWidth: 40, height: { xs: 22, sm: 26, md: 28 }, fontSize: { xs: 10, sm: 12 } }}
              >
                초기화
              </Button>

              {/* 테마 선택 버튼 그룹 */}
              <ToggleButtonGroup
                size="small"
                value={theme}
                exclusive
                onChange={(e, newTheme) => newTheme && setTheme(newTheme)}
                aria-label="theme selection"
              >
                {(Object.keys(THEME_NAMES) as ThemeType[]).map((themeKey) => (
                  <Tooltip key={themeKey} title={THEME_NAMES[themeKey]}>
                    <ToggleButton value={themeKey} aria-label={THEME_NAMES[themeKey]} sx={{ width: { xs: 18, sm: 22, md: 24 }, height: { xs: 18, sm: 22, md: 24 } }}>
                      <Iconify icon={themeKey === 'default' ? 'mdi:format-color-fill' : 'mdi:palette'} width={24} sx={{ width: { xs: 12, sm: 15, md: 16 } }} />
                    </ToggleButton>
                  </Tooltip>
                ))}
              </ToggleButtonGroup>

              <ToggleButtonGroup
                size="small"
                value={[
                  showNumbers && 'showNumbers',
                  sortByRank && 'sortByRank',
                ].filter(Boolean)}
                onChange={(event, newValues) => {
                  setShowNumbers(newValues.includes('showNumbers'));
                  setSortByRank(newValues.includes('sortByRank'));
                }}
                aria-label="view settings"
              >
                <Tooltip title="숫자 보기">
                  <ToggleButton value="showNumbers" aria-label="show numbers" sx={{ width: { xs: 18, sm: 22, md: 24 }, height: { xs: 18, sm: 22, md: 24 } }}>
                    <Iconify icon="mdi:numeric" width={24} sx={{ width: { xs: 12, sm: 15, md: 16 } }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="등수별 정렬">
                  <ToggleButton value="sortByRank" aria-label="sort by rank" sx={{ width: { xs: 18, sm: 22, md: 24 }, height: { xs: 18, sm: 22, md: 24 } }}>
                    <Iconify icon="mdi:sort-descending" width={24} sx={{ width: { xs: 12, sm: 15, md: 16 } }} />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>


            </Box>
          }
        />

        <Box sx={{ p: 2 }}>
          <Box sx={{ overflowX: "auto", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: "600px" }}>
              {/* 예측/선택 행 */}
              <PredictRow
                selectedNumbers={selectedNumbers}
                handleNumberClick={handleNumberClick}
                showNumbers={showNumbers}
                theme={theme}
              />

              {/* 선택 정보 표시 */}
              <Box sx={{
                py: { xs: 1, sm: 1.5 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1, sm: 1 },
              }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '11px', sm: '13px' },
                    textAlign: 'center',
                  }}
                >
                  {selectionInfo}
                </Typography>
                {selectedNumbers.length > 0 && (
                  <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 0.5 }, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {selectedNumbers.map((num) => (
                      <Chip
                        key={num}
                        label={num}
                        size="small"
                        onDelete={() => handleNumberClick(num)}
                        sx={{
                          height: { xs: 20, sm: 22 },
                          fontSize: { xs: 10, sm: 11 },
                          '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
                          '& .MuiChip-deleteIcon': { fontSize: { xs: 14, sm: 15 } }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* 필터링된 결과 */}
              {displayedResults.map((round) => (
                <ResultRow
                  key={round.drwNo}
                  round={round}
                  selectedNumbers={selectedNumbers}
                  showNumbers={showNumbers}
                  theme={theme}
                />
              ))}
            </div>
          </Box>

          {/* 더 보기 버튼 */}
          {visibleCount < filteredResults.length && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3, mb: 1 }}>
              <Button
                variant="soft"
                color="inherit"
                onClick={() => setVisibleCount((prev) => Math.min(prev + 50, filteredResults.length))}
                sx={{ minWidth: 100 }}
              >
                더 보기 ({filteredResults.length - visibleCount}개 남음)
              </Button>
            </Box>
          )}
        </Box>
      </Card>
    </DashboardContent>
  );
}
