// sample 8 frames of a capture into one contact sheet
import { execFileSync } from 'node:child_process';
const app = process.argv[2];
const frames = (process.argv[3] || '30,100,170,230,300,370,430,480').split(',').map(Number);
const inputs = frames.flatMap((f) => ['-i', `frames/${app}/f${String(f).padStart(5, '0')}.jpg`]);
const n = frames.length;
const filter = frames.map((_, i) => `[${i}]scale=800:-1[s${i}]`).join(';') + ';' + frames.map((_, i) => `[s${i}]`).join('') + `xstack=inputs=${n}:layout=` + frames.map((_, i) => `${(i % 2) * 800}_${Math.floor(i / 2) * 450}`).join('|');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, `survey/${app}-sheet.jpg`]);
