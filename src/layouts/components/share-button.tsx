'use client';

import { useState, useCallback } from 'react';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';

import { Iconify } from 'src/components/iconify';
import { getLatestLottoNumber } from 'src/api/lottolibrary';
import { getIsMobile } from 'src/utils/is-mobile';

// ----------------------------------------------------------------------

export function ShareButton() {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const generateShareText = useCallback(() => {
    const latest = getLatestLottoNumber();
    if (!latest) return '';

    const numbers = latest.numbers.join(', ');
    const totSellamnt = new Intl.NumberFormat('ko-KR').format(latest.totSellamnt);
    const firstWinamnt = new Intl.NumberFormat('ko-KR').format(latest.firstWinamnt);

    const [year, month, day] = latest.drwNoDate.split('-');
    const formattedDate = `${year}년 ${month}월 ${day}일`;

    const LOTTO_URL = 'https://lotto-viewer.vercel.app/';

    return `${latest.drwNo}회 (${formattedDate} 추첨)

번호 : ${numbers}
보너스 번호 : ${latest.bonus}

총 판매금액 : ${totSellamnt}원
1등 당첨금액 : ${firstWinamnt}원
1등 당첨자 : ${latest.firstPrzwnerCo}명

${LOTTO_URL}`;
  }, []);



const handleShare = async () => {
  const shareText = generateShareText();

  if (!shareText) {
    setSnackbarMessage('데이터를 불러올 수 없습니다.');
    setOpenSnackbar(true);
    return;
  }

  const isMobile = getIsMobile();

  /**
   * ✅ 모바일에서만 Web Share API 사용
   */
  if (isMobile && navigator.share) {
    try {
      await navigator.share({
        title: '로또 당첨 결과',
        text: shareText,
      });
      return;
    } catch (error) {
      // 사용자가 취소한 경우 → 정상
      console.warn('Share cancelled or failed:', error);
    }
  }

  /**
   * ✅ 웹 환경 → 무조건 복사
   */
  try {
    await navigator.clipboard.writeText(shareText);
    setSnackbarMessage('최신 로또 1등 정보가 복사되었습니다!');
    setOpenSnackbar(true);
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    setSnackbarMessage('복사에 실패했습니다.');
    setOpenSnackbar(true);
  }
};


  return (
    <>
      <Tooltip title="공유하기">
        <IconButton
          onClick={handleShare}
          sx={{ width: 40, height: 40 }}
        >
          <Iconify icon="mdi:share-variant" width={24} />
        </IconButton>
      </Tooltip>

      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={openSnackbar}
        onClose={() => setOpenSnackbar(false)}
        autoHideDuration={2000}
        message={snackbarMessage}
        ContentProps={{
          sx: {
            justifyContent: 'center',
            textAlign: 'center',
            fontWeight: 'bold',
          },
        }}
      />
    </>
  );
}