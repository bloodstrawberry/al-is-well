'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { getFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';
import { getIsMobile } from 'src/utils/is-mobile';
import { useOpicSpeech } from '../hooks/use-opic-speech';
import { OpicHeader, OpicScriptItem, OpicQuestionSection } from '../opic';

// ----------------------------------------------------------------------

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onEdit: () => void;
};

export function OpicLiveView({ fileId, fileName, onBack, onEdit }: Props) {
  const theme = useTheme();

  const isMobile = getIsMobile();

  const [scriptData, setScriptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revealedLines, setRevealedLines] = useState<Record<string, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [showKoQuestion, setShowKoQuestion] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const {
    userAnswers,
    setUserAnswers,
    recordedAudios,
    setRecordedAudios,
    isListening,
    isPreparing,
    playingIndex,
    speakingIndex,
    inputRefs,
    startListening,
    stopListening,
    playRecordedAudio,
    toggleSpeak,
  } = useOpicSpeech();

  const [testResults, setTestResults] = useState<Record<number, { uWord: string; cWord: string; isCorrect: boolean; masked: string }[]>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // Pre-load voices for mobile support
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);



  useEffect(() => {
    const loadScript = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId);
        if (data && !data.questions && (data.questionEn || data.question)) {
          data.questions = [{
            en: data.questionEn || data.question || '',
            ko: data.questionKo || ''
          }];
        }
        if (data) {
          setScriptData(data);
          setAudioReady(false);
        }
      } catch (error) {
        console.error('Failed to load script', error);
      } finally {
        setLoading(false);
      }
    };
    loadScript();
  }, [fileId]);

  const toggleLine = useCallback((index: number) => {
    setRevealedLines((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const toggleAll = () => {
    const newState = !allRevealed;
    setAllRevealed(newState);
    setShowKoQuestion(newState);
    const newRevealed: Record<string, boolean> = {};
    if (scriptData?.lines) {
      scriptData.lines.forEach((_: any, index: number) => {
        newRevealed[index.toString()] = newState;
      });
    }
    if (scriptData?.questions) {
      scriptData.questions.forEach((_: any, index: number) => {
        newRevealed[`q-en-${index}`] = newState;
        newRevealed[`q-ko-${index}`] = newState;
      });
    }
    setRevealedLines(newRevealed);
  };

  const userAnswersRef = useRef(userAnswers);
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  const handleCheckAnswer = useCallback((index: number, text?: string) => {
    const currentAnswers = userAnswersRef.current;
    const userAnswer = (text !== undefined ? text : (currentAnswers[index] || '')).trim();
    const correctAnswer = (scriptData.lines[index].en || '').trim();

    if (!userAnswer) return;

    const uWords = userAnswer.split(/\s+/);
    const cWords = correctAnswer.split(/\s+/);

    const clean = (str: string) => str?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") || "";

    // LCS-based Alignment
    const uClean = uWords.map(clean);
    const cClean = cWords.map(clean);

    const dp = Array(uClean.length + 1).fill(0).map(() => Array(cClean.length + 1).fill(0));
    for (let i = 1; i <= uClean.length; i++) {
      for (let j = 1; j <= cClean.length; j++) {
        if (uClean[i - 1] === cClean[j - 1] && uClean[i - 1] !== "") {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const results: { uWord: string; cWord: string; isCorrect: boolean; masked: string }[] = [];
    let i = uClean.length;
    let j = cClean.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && uClean[i - 1] === cClean[j - 1] && uClean[i - 1] !== "") {
        results.unshift({
          uWord: uWords[i - 1],
          cWord: cWords[j - 1],
          isCorrect: true,
          masked: cWords[j - 1]
        });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        // Missing in user's answer (Gap in User)
        results.unshift({
          uWord: "",
          cWord: cWords[j - 1],
          isCorrect: false,
          masked: cWords[j - 1].replace(/[a-zA-Z0-9]/g, "*")
        });
        j--;
      } else {
        // Extra in user's answer (Gap in Correct)
        results.unshift({
          uWord: uWords[i - 1],
          cWord: "",
          isCorrect: false,
          masked: ""
        });
        i--;
      }
    }

    setTestResults(prev => ({
      ...prev,
      [index]: results
    }));

    // Auto-reveal if all words are correct
    const isAllCorrect = results.every(r => r.isCorrect);
    if (isAllCorrect) {
      setRevealedAnswers(prev => ({ ...prev, [index]: true }));
    }
  }, [scriptData?.lines]);

  const handleChangeAnswer = useCallback((index: number, value: string) => {
    setUserAnswers((prev) => (prev[index] === value ? prev : { ...prev, [index]: value }));
  }, [setUserAnswers]);

  const handleToggleAnswerReveal = useCallback((index: number) => {
    setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const setInputRef = useCallback((index: number, el: any) => {
    inputRefs.current[index] = el;
  }, [inputRefs]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading script...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 5 }, px: { xs: 1.5, md: 8 } }}>
      <OpicHeader
        fileName={fileName}
        currentIndex={0}
        totalFiles={1}
        currentFileName={fileName}
        autoPlay={false}
        isAudioPlaying={false}
        isContentSequence={false}
        allRevealed={allRevealed}
        category={scriptData?.category}
        subCategory={scriptData?.subCategory}
        comboPositions={scriptData?.comboPositions}
        testMode={testMode}
        onBack={onBack}
        onToggleAllRevealed={toggleAll}
        onEdit={onEdit}
        onToggleTestMode={() => {
          setTestMode(!testMode);
          if (!testMode) {
            setAllRevealed(false);
            setUserAnswers({});
            setTestResults({});
            setRevealedAnswers({});
          }
        }}
      />

      <Stack spacing={4}>
        <OpicQuestionSection
          questions={scriptData?.questions}
          speakingIndex={speakingIndex}
          sequence="idle"
          autoPlay={false}
          testMode={testMode}
          revealedLines={revealedLines}
          onToggleSpeak={toggleSpeak}
          onToggleReveal={toggleLine}
          audioUrl={scriptData?.audioUrl}
          audioReady={audioReady}
          onAudioCanPlay={() => setAudioReady(true)}
          onAudioError={() => setAudioReady(false)}
        />

        {/* Script Lines */}
        <Stack spacing={2.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Script</Typography>
            <Typography variant="caption" sx={{ color: testMode ? 'info.main' : 'text.disabled', fontWeight: 'bold' }}>
              {testMode ? 'TEST MODE' : '* Click to reveal English'}
            </Typography>
          </Stack>

          {scriptData?.lines?.map((line: any, index: number) => (
            <OpicScriptItem
              key={index}
              index={index}
              line={line}
              testMode={testMode}
              isRevealed={revealedLines[index] ?? allRevealed}
              userAnswer={userAnswers[index]}
              result={testResults[index]}
              isAnswerRevealed={revealedAnswers[index] || allRevealed}
              isListening={isListening === index}
              isPreparing={isPreparing}
              playingIndex={playingIndex === index}
              speakingIndex={speakingIndex === `line-${index}`}
              isMobile={isMobile}
              recordedAudio={recordedAudios[index]}
              setInputRef={setInputRef}
              onToggleLine={toggleLine}
              onToggleSpeak={toggleSpeak}
              onChangeAnswer={handleChangeAnswer}
              onCheckAnswer={handleCheckAnswer}
              onStartListening={startListening}
              onStopListening={stopListening}
              onPlayRecordedAudio={playRecordedAudio}
              onToggleAnswerReveal={handleToggleAnswerReveal}
            />
          )) || (
              <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.neutral', borderRadius: 2 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  No script lines available.
                </Typography>
              </Box>
            )}
        </Stack>
      </Stack>
    </Container>
  );
}
