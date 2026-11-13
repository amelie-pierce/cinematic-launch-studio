import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { APP_FRAMES, FPS, H, TOTAL_FRAMES, W } from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="BlueprintLaunch" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ bgm: true }} />
    <Composition id="AppPreview" component={Main} durationInFrames={APP_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ bgm: false, only: 'ADC' }} />
  </>
);
