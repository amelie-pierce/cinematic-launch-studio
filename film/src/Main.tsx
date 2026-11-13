import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { APPS, APP_FRAMES, ENDING_FRAMES, FLASH_FRAMES, EXIT_FRAMES, GROUND, MAIN_FRAMES } from './timeline';
import { Flashback, MainShots } from './AppScene';
import { Ending } from './Ending';
import { Grain } from './Finish';

loadFont('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

export const Main: React.FC<{ bgm: boolean; only?: string }> = ({ bgm, only }) => {
  const apps = only ? APPS.filter((a) => a.id === only) : APPS;
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      {apps.map((a, i) => {
        const idx = APPS.indexOf(a);
        const at = i * APP_FRAMES;
        return (
          <React.Fragment key={a.id}>
            <Sequence from={at} durationInFrames={MAIN_FRAMES} name={`${a.id} main`}>
              <MainShots app={a} />
              <Grain seed={idx} />
            </Sequence>
            <Sequence from={at + MAIN_FRAMES} durationInFrames={FLASH_FRAMES + EXIT_FRAMES} name={`${a.id} flashback`}>
              <Flashback app={a} index={idx} />
            </Sequence>
          </React.Fragment>
        );
      })}
      {!only && (
        <Sequence from={APPS.length * APP_FRAMES} durationInFrames={ENDING_FRAMES} name="ending">
          <Ending />
        </Sequence>
      )}
      {!only && <Html5Audio src={staticFile(bgm ? 'audio/mix.wav' : 'audio/sfx-only.wav')} />}
    </AbsoluteFill>
  );
};
