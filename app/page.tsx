'use client';

import React, { useState } from 'react';
import { SingleMode } from '@/components/modes/SingleMode';
import { MultiMode } from '@/components/modes/MultiMode';
import { ModeToggle } from '@/components/ui/ModeToggle';

export default function Home() {
  const [mode, setMode] = useState<'single' | 'multi'>('single');

  return (
    <>
      {/* Mode Toggle - Always visible at the top */}
      <ModeToggle mode={mode} onModeChange={setMode} />
      
      {/* Render appropriate mode */}
      {mode === 'single' ? <SingleMode /> : <MultiMode />}
    </>
  );
}