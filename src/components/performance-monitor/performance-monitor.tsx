'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function PerformanceMonitor() {
  const theme = useTheme();
  const [memory, setMemory] = useState<{ used: number; total: number; limit: number } | null>(null);
  const [fps, setFps] = useState(0);
  const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'warn' | 'error'; time: string }[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  
  const frames = useRef(0);
  const prevTime = useRef(performance.now());

  const addLog = useCallback((msg: any, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Defer state update to avoid "Cannot update a component while rendering another component"
    setTimeout(() => {
      setLogs((prev) => [{ msg: String(msg), type, time }, ...prev].slice(0, 5));
    }, 0);
  }, []);

  useEffect(() => {
    // 1. Memory Monitoring
    const memoryInterval = setInterval(() => {
      // @ts-ignore
      if (performance.memory) {
        // @ts-ignore
        const mem = performance.memory;
        const used = Math.round(mem.usedJSHeapSize / 1048576);
        const total = Math.round(mem.totalJSHeapSize / 1048576);
        const limit = Math.round(mem.jsHeapSizeLimit / 1048576);
        
        setMemory({ used, total, limit });

        if (used > limit * 0.9) {
          addLog(`CRITICAL: Memory usage at ${used}MB (Limit: ${limit}MB)`, 'error');
        } else if (used > limit * 0.7) {
          addLog(`WARNING: High memory usage: ${used}MB`, 'warn');
        }
      }
    }, 2000);

    // 2. FPS Monitoring
    const requestFps = (time: number) => {
      frames.current++;
      if (time > prevTime.current + 1000) {
        const currentFps = Math.round((frames.current * 1000) / (time - prevTime.current));
        setFps(currentFps);
        
        if (currentFps < 20) {
           addLog(`LAG: Frame rate dropped to ${currentFps} FPS`, 'warn');
        }

        prevTime.current = time;
        frames.current = 0;
      }
      requestAnimationFrame(requestFps);
    };
    const fpsId = requestAnimationFrame(requestFps);

    // 3. Long Task & Core Web Vitals Monitoring
    let observers: PerformanceObserver[] = [];
    try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 100) {
              addLog(`Slow Task: ${entry.duration.toFixed(0)}ms`, 'warn');
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        observers.push(longTaskObserver);

        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          addLog(`LCP: ${lastEntry.startTime.toFixed(0)}ms`, 'info');
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        observers.push(lcpObserver);

        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          if (clsValue > 0.1) {
            addLog(`Layout Shift: ${clsValue.toFixed(3)}`, 'warn');
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        observers.push(clsObserver);

        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.duration > 1000) {
              addLog(`Slow Resource: ${entry.name.split('/').pop()} (${(entry.duration / 1000).toFixed(1)}s)`, 'warn');
            }
          });
        });
        resourceObserver.observe({ type: 'resource', buffered: true });
        observers.push(resourceObserver);

    } catch (e) {
        console.warn('Advanced Performance Monitoring not fully supported');
    }

    // 4. Global Error Catching
    const handleError = (event: ErrorEvent) => {
      addLog(`Error: ${event.message}`, 'error');
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog(`Promise Error: ${event.reason}`, 'error');
    };

    // 5. Console Interception
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args) => {
      addLog(`Warn: ${args[0]}`, 'warn');
      originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      addLog(`Error: ${args[0]}`, 'error');
      originalError.apply(console, args);
    };

    // 6. Fetch Interception
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        if (duration > 1500) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
          addLog(`Slow Fetch: ${url.split('/').pop()} (${(duration / 1000).toFixed(1)}s)`, 'warn');
        }
        return response;
      } catch (error) {
        addLog(`Fetch Failed: ${String(error)}`, 'error');
        throw error;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      clearInterval(memoryInterval);
      cancelAnimationFrame(fpsId);
      observers.forEach(o => o.disconnect());
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.warn = originalWarn;
      console.error = originalError;
      window.fetch = originalFetch;
    };
  }, [addLog]);

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        onClick={() => setIsVisible(false)}
        sx={{
          px: 1.5,
          py: 0.5,
          mt: 0.5,
          borderRadius: '20px',
          bgcolor: alpha(theme.palette.background.neutral, 0.9),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          // @ts-ignore
          boxShadow: theme.customShadows?.z20 || theme.shadows[10],
          pointerEvents: 'auto',
          alignItems: 'center',
          cursor: 'pointer',
          transition: theme.transitions.create(['opacity', 'transform']),
          '&:hover': {
            opacity: 0.8,
            transform: 'scale(0.98)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 2s infinite' }} />
          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
            LIVE
          </Typography>
        </Box>

        {memory && (
          <Typography variant="caption" sx={{ 
            color: memory.used > memory.limit * 0.8 ? 'error.main' : 'text.primary', 
            fontWeight: 'bold',
            fontSize: '0.7rem' 
          }}>
            MEM: {memory.used}MB
          </Typography>
        )}
        
        <Typography variant="caption" sx={{ 
          color: fps < 30 ? 'error.main' : fps < 50 ? 'warning.main' : 'success.main', 
          fontWeight: 'bold',
          fontSize: '0.7rem' 
        }}>
          FPS: {fps}
        </Typography>

        {logs.length > 0 && (
          <Box sx={{ borderLeft: `1px solid ${theme.palette.divider}`, pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
            {logs.slice(0, 3).map((log, index) => (
              <Typography 
                key={index}
                variant="caption" 
                sx={{ 
                  color: log.type === 'error' ? 'error.main' : log.type === 'warn' ? 'warning.main' : 'text.secondary',
                  fontSize: index === 0 ? '0.65rem' : '0.55rem',
                  opacity: index === 0 ? 1 : 0.6,
                  maxWidth: 250,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2
                }}
              >
                {log.msg}
              </Typography>
            ))}
          </Box>
        )}

        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.7; }
          }
        `}</style>
      </Stack>
    </Box>
  );
}
