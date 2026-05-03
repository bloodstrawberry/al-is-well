'use client';

import { LazyMotion, domMax } from 'framer-motion';

// ----------------------------------------------------------------------

export type MotionLazyProps = {
  children: React.ReactNode;
};

export function MotionLazy({ children }: MotionLazyProps) {
  return (
    <LazyMotion strict features={domMax}>
      {children}
    </LazyMotion>
  );
}
