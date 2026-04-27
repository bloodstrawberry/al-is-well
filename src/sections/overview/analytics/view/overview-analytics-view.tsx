'use client';

import { useState, useMemo, useCallback } from 'react';

import Card from '@mui/material/Card';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

import { DashboardContent } from 'src/layouts/dashboard';
import { getAllLottoNumbers } from 'src/api/lottolibrary';

import { AnalyticsAppearance } from '../analytics-appearance';
import { AnalyticsMissing } from '../analytics-missing';
import { AnalyticsRollover } from '../analytics-rollover';
import { AnalyticsCarryOver } from '../analytics-carry-over';
import { AnalyticsChemistry } from '../analytics-chemistry';

// ----------------------------------------------------------------------

type PeriodType = '5weeks' | '10weeks' | '6months' | '1year' | 'all';

export function OverviewAnalyticsView() {
  const allLotto = useMemo(() => getAllLottoNumbers(), []);
  const latestRound = allLotto.length > 0 ? allLotto[allLotto.length - 1].drwNo : 0;
  const latestDate = allLotto.length > 0 ? new Date(allLotto[allLotto.length - 1].drwNoDate) : new Date();

  const [startRound, setStartRound] = useState(1);
  const [endRound, setEndRound] = useState(latestRound);
  const [includeBonus, setIncludeBonus] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('all');

  // 기간에 따른 시작 회차 계산
  const getStartRoundByPeriod = useCallback((period: PeriodType): number => {
    if (period === 'all') return 1;

    const targetDate = new Date(latestDate);

    switch (period) {
      case '5weeks':
        targetDate.setDate(targetDate.getDate() - 4 * 7);
        break;
      case '10weeks':
        targetDate.setDate(targetDate.getDate() - 9 * 7);
        break;
      case '6months':
        targetDate.setMonth(targetDate.getMonth() - 6);
        break;
      case '1year':
        targetDate.setFullYear(targetDate.getFullYear() - 1);
        break;
      default:
        return 1;
    }

    // targetDate 이후의 첫 번째 회차 찾기
    const foundRound = allLotto.find((r) => new Date(r.drwNoDate) >= targetDate);
    return foundRound ? foundRound.drwNo : 1;
  }, [allLotto, latestDate]);

  // 기간 버튼 클릭 핸들러
  const handlePeriodChange = useCallback((
    _event: React.MouseEvent<HTMLElement>,
    newPeriod: PeriodType | null
  ) => {
    if (newPeriod !== null) {
      setSelectedPeriod(newPeriod);
      const newStartRound = getStartRoundByPeriod(newPeriod);
      setStartRound(newStartRound);
      setEndRound(latestRound);
    }
  }, [getStartRoundByPeriod, latestRound]);

  // 수동으로 회차 입력 시 기간 선택 해제
  const handleStartRoundChange = useCallback((value: number) => {
    setStartRound(Math.max(1, value));
    setSelectedPeriod('all'); // 수동 입력 시 전체로 변경 (또는 선택 해제)
  }, []);

  const handleEndRoundChange = useCallback((value: number) => {
    setEndRound(Math.min(latestRound, value));
  }, [latestRound]);

  const filteredRounds = useMemo(() => {
    return allLotto.filter((r) => r.drwNo >= startRound && r.drwNo <= endRound);
  }, [allLotto, startRound, endRound]);

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4">통계분석</Typography>
      </Stack>

      <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary', fontWeight: 'bold', textAlign: 'center' }}>
        분석 범위: {startRound}회 ~ {endRound}회 ({filteredRounds.length}회)
      </Typography>

      <Card sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="시작 회차"
              type="number"
              size="small"
              value={startRound}
              onChange={(e) => handleStartRoundChange(Number(e.target.value))}
              inputProps={{ min: 1, max: endRound, style: { textAlign: 'center' } }}
              sx={{ width: 110 }}
            />
            <Typography sx={{ color: 'text.disabled' }}>~</Typography>
            <TextField
              label="최신 회차"
              type="number"
              size="small"
              value={endRound}
              onChange={(e) => handleEndRoundChange(Number(e.target.value))}
              inputProps={{ min: startRound, max: latestRound, style: { textAlign: 'center' } }}
              sx={{ width: 110 }}
            />
          </Stack>

          <ToggleButtonGroup
            value={selectedPeriod}
            exclusive
            onChange={handlePeriodChange}
            size="small"
            sx={{
              ml: { md: 2 },
              '& .MuiToggleButton-root': {
                px: 2,
                py: 0.5,
                fontSize: '0.875rem',
                fontWeight: 600,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="5weeks">5주</ToggleButton>
            <ToggleButton value="10weeks">10주</ToggleButton>
            <ToggleButton value="6months">6개월</ToggleButton>
            <ToggleButton value="1year">1년</ToggleButton>
            <ToggleButton value="all">전체</ToggleButton>
          </ToggleButtonGroup>


          <ToggleButtonGroup
            size="small"
            value={includeBonus ? ['showBonus'] : []}
            onChange={(event, newValues) => {
              setIncludeBonus(newValues.includes('showBonus'));
            }}
            aria-label="bonus settings"
            sx={{ ml: { md: 2 } }}
          >
            <Tooltip title="보너스 번호 포함">
              <ToggleButton
                value="showBonus"
                aria-label="show bonus"
                sx={{
                  width: 36,
                  height: 36,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                <Iconify icon="mdi:star-circle-outline" width={20} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>
      </Card>

      <Tabs
        value={currentTab}
        onChange={(e, newValue) => setCurrentTab(newValue)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            fontSize: '1rem',
            fontWeight: 700,
            px: 3,
          },
        }}
      >
        <Tab label="출현 순위" />
        <Tab label="미출현 번호" />
        <Tab label="이월수" />
        <Tab label="이월 순위" />
        <Tab label="궁합수 순위" />
      </Tabs>

      {currentTab === 0 && (
        <AnalyticsAppearance rounds={filteredRounds} includeBonus={includeBonus} />
      )}

      {currentTab === 1 && (
        <AnalyticsMissing
          allLotto={allLotto}
          endRound={endRound}
          includeBonus={includeBonus}
        />
      )}

      {currentTab === 2 && (
        <AnalyticsRollover rounds={filteredRounds} includeBonus={includeBonus} />
      )}

      {currentTab === 3 && (
        <AnalyticsCarryOver
          allLotto={allLotto}
          startRound={startRound}
          endRound={endRound}
          includeBonus={includeBonus}
        />
      )}

      {currentTab === 4 && (
        <AnalyticsChemistry rounds={filteredRounds} includeBonus={includeBonus} />
      )}
    </DashboardContent>
  );
}
