"""Blueprint launch score: an original 120 BPM melodic house cue, built to the film grid.

One beat = 0.5 s = 15 frames. Each app owns 10 bars: 8 bars of groove under the shots,
then a 2-bar breakdown under the flashback with a riser into the next app's downbeat.
The ending is 6 bars that resolve to D major under the closing line.
SFX (UI clicks, key ticks, cut swishes, flashback rewind, impacts) are synthesised and
placed from the capture metadata so they land on the exact frames.
"""
import json, re, sys
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
FPS = 30
APPS = ["ADC", "HCS", "ACE", "ADM", "AGPD", "FD", "HS", "PBS", "PFD", "RWS"]
APP_BARS, MAIN_BARS, END_BARS = 10, 8, 6
TOTAL_BARS = len(APPS) * APP_BARS + END_BARS
DUR = TOTAL_BARS * BAR + 3.0
N = int(DUR * SR)
rng = np.random.default_rng(7)

root = Path(__file__).resolve().parents[1]
meta_src = (root / "src/meta.ts").read_text()
META = json.loads(meta_src[meta_src.index("= ") + 2 : meta_src.rstrip().rindex(";")])


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def nm(s):
    m = re.match(r"([A-G]#?)(-?\d)", s)
    return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)]


def stereo(n=N):
    return np.zeros((n, 2), dtype=np.float64)


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf):
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], axis=1)
    j = min(len(buf), i + len(x))
    if i < 0:
        x = x[-i:]
        i = 0
    buf[i:j] += x[: j - i] * gain


# ---------- oscillators ----------
_tables = {}


def saw_table(nh):
    if nh not in _tables:
        ph = np.linspace(0, 1, 4096, endpoint=False)
        t = np.zeros_like(ph)
        for k in range(1, nh + 1):
            t += np.sin(2 * np.pi * k * ph) / k * (1 - 0.3 * k / nh)
        _tables[nh] = t / np.max(np.abs(t))
    return _tables[nh]


def osc_saw(f, n, phase0=0.0):
    nh = max(1, min(48, int(16000 / f)))
    tab = saw_table(nh)
    ph = (phase0 + f * np.arange(n) / SR) % 1.0
    return tab[(ph * 4096).astype(int)]


def adsr(n, a, d, s, r, sus_len=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sus_len = n - a - d - r if sus_len is None else int(sus_len * SR)
    sus_len = max(0, sus_len)
    env = np.concatenate([
        np.linspace(0, 1, max(1, a), endpoint=False),
        np.linspace(1, s, max(1, d), endpoint=False),
        np.full(sus_len, s),
        np.linspace(s, 0, max(1, r)),
    ])
    return np.pad(env, (0, max(0, n - len(env))))[:n]


def lp(x, fc, q=0.707, order=2):
    fc = min(fc, SR * 0.45)
    sos = signal.butter(order, fc, "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def sweep_lp(x, cutoff_fn, block=1024):
    """time-varying 2-pole lowpass, cutoff_fn(t_seconds) -> Hz"""
    y = np.zeros_like(x)
    zi = None
    for s in range(0, len(x), block):
        fc = float(np.clip(cutoff_fn((s + block / 2) / SR), 60, SR * 0.45))
        b, a = signal.butter(2, fc, "low", fs=SR)
        if zi is None:
            zi = np.zeros((max(len(a), len(b)) - 1, x.shape[1]))
        y[s : s + block], zi = signal.lfilter(b, a, x[s : s + block], axis=0, zi=zi)
    return y


# ---------- harmony ----------
# vi - IV - I - V in D major: Bm9, Gmaj9, Dmaj9, A(sus2 -> maj)
CHORDS = [
    {"bass": "B1", "pad": ["B3", "D4", "F#4", "A4", "C#5"], "arp": ["B3", "D4", "F#4", "A4", "B4", "D5", "F#5", "A5"]},
    {"bass": "G1", "pad": ["G3", "B3", "D4", "F#4", "A4"], "arp": ["G3", "B3", "D4", "F#4", "G4", "B4", "D5", "F#5"]},
    {"bass": "D2", "pad": ["D4", "F#4", "A4", "C#5", "E5"], "arp": ["D4", "F#4", "A4", "C#5", "D5", "E5", "F#5", "A5"]},
    {"bass": "A1", "pad": ["A3", "C#4", "E4", "B4", "E5"], "arp": ["A3", "C#4", "E4", "B4", "A4", "C#5", "E5", "B5"]},
]
END_CHORDS = [1, 3, 2, 2, 2, 2]  # G, A, then resolve to D

# 8-bar hook, (bar, step16, note, len16)
HOOK = [
    (0, 0, "F#5", 4), (0, 4, "E5", 2), (0, 6, "D5", 2), (0, 8, "E5", 4), (0, 12, "F#5", 4),
    (1, 0, "D5", 6), (1, 6, "B4", 2), (1, 8, "D5", 4), (1, 12, "A5", 4),
    (2, 0, "A5", 6), (2, 6, "F#5", 2), (2, 8, "E5", 4), (2, 12, "D5", 4),
    (3, 0, "E5", 8), (3, 8, "C#5", 4), (3, 12, "E5", 2), (3, 14, "F#5", 2),
    (4, 0, "F#5", 4), (4, 4, "A5", 4), (4, 8, "B5", 6), (4, 14, "A5", 2),
    (5, 0, "F#5", 4), (5, 4, "D5", 4), (5, 8, "B4", 4), (5, 12, "D5", 4),
    (6, 0, "E5", 4), (6, 4, "F#5", 2), (6, 6, "E5", 2), (6, 8, "D5", 8),
    (7, 0, "C#5", 6), (7, 6, "A4", 2), (7, 8, "B4", 4), (7, 12, "C#5", 4),
]
END_MELODY = [(0, 0, "D5", 4), (0, 4, "E5", 4), (0, 8, "F#5", 8), (1, 0, "E5", 6), (1, 6, "C#5", 2), (1, 8, "E5", 8), (2, 0, "F#5", 16), (3, 0, "A5", 32)]

ARP_PAT = [0, 2, 4, 6, 7, 5, 3, 1, 0, 2, 4, 6, 7, 6, 4, 2]


def bar_t(b):
    return b * BAR


def chord_at(bar):
    app, local = divmod(bar, APP_BARS)
    if app >= len(APPS):
        return CHORDS[END_CHORDS[min(bar - len(APPS) * APP_BARS, 5)]]
    return CHORDS[local % 4]


# ---------- instruments ----------
def pad_note(f, dur):
    n = int((dur + 1.2) * SR)
    x = np.zeros(n)
    for det in (-0.11, -0.04, 0.0, 0.05, 0.12):
        x += osc_saw(f * 2 ** (det / 12), n, rng.random())
    x /= 5
    env = adsr(n, 0.35, 0.4, 0.8, 1.0, sus_len=dur - 0.75)
    return x * env


def pluck(f, vel=1.0):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    x = osc_saw(f, n) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
    env = np.exp(-t * 9) * (1 - np.exp(-t * 800))
    # brighter at the attack
    x = lp(x * env, 2600 + 2400 * vel)
    return x * vel


def bell(f, dur):
    n = int((dur + 1.6) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) * 2, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    x = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph) + 0.05 * np.sin(4.01 * ph)
    x += 0.15 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 14)  # glassy tine
    env = adsr(n, 0.012, 0.25, 0.55, 0.9, sus_len=max(0.0, dur - 0.26)) * np.exp(-t * 0.35)
    return x * env * 0.5


def bass_note(f, dur):
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * 0.85 + lp(osc_saw(f, n), 380) * 0.45
    env = adsr(n, 0.006, 0.12, 0.75, 0.06, sus_len=max(0.0, dur - 0.13))
    return np.tanh(x * env * 1.4) * 0.8


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 32)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n) * np.exp(-t * 350), 2000) * 0.12
    return np.tanh((x + click) * 1.6) * 0.9


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    env = np.zeros(n)
    for k, off in enumerate((0, 0.011, 0.022)):
        i = int(off * SR)
        env[i:] += np.exp(-(t[: n - i]) * (60 if k < 2 else 18)) * (0.7 if k < 2 else 1.0)
    x = bp(noise * env, 900, 3200) * 1.3
    return x + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40) * 0.25


def hat(open_=False):
    n = int((0.32 if open_ else 0.07) * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7000) * np.exp(-t * (11 if open_ else 70))
    return x * (0.5 if open_ else 0.42)


def shaker():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 5000, 11000) * np.exp(-t * 55) * (1 - np.exp(-t * 300)) * 0.25


def crash():
    n = int(2.8 * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 4500) * np.exp(-t * 1.6)
    x = np.stack([x, np.roll(x, 37)], axis=1)
    return x * 0.32


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = rng.standard_normal((n, 2))
    x = sweep_lp(noise, lambda s: 300 * (40 ** (s / dur)))
    x = hp(x, 250)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (p * 2)) / SR) * 0.08
    return (x * (p ** 2.2)[:, None] * 0.35 + np.stack([tone, tone], axis=1) * (p ** 3)[:, None]) * 0.9


def reverse_swell(dur, f=midi(nm("F#5"))):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for fr in (f, f * 1.5, f * 2):
        x += np.sin(2 * np.pi * fr * t)
    x += hp(rng.standard_normal(n), 3000) * 0.4
    env = (t / dur) ** 3
    return lp(x * env, 6000) * 0.12


# ---------- SFX ----------
def ui_click(vel=1.0):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 260) * 0.5 + bp(rng.standard_normal(n), 2500, 9000) * np.exp(-t * 500) * 0.6
    body = np.sin(2 * np.pi * 520 * t) * np.exp(-t * 120) * 0.35
    return (x + body) * vel * 0.32


def key_tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 3000, 10000) * np.exp(-t * 600) * 0.16


def swish(dur=0.32, up=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal((n, 2))
    x = sweep_lp(noise, (lambda s: 600 + 7000 * (s / dur)) if up else (lambda s: 7600 - 7000 * (s / dur)))
    env = np.sin(np.pi * t / dur) ** 2
    return hp(x, 300) * env[:, None] * 0.14


def rewind(dur=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 1800 * np.exp(-t * 4.0) + 140
    ph = 2 * np.pi * np.cumsum(f) / SR
    chirp = np.sin(ph * 3) * 0.15 + np.sign(np.sin(ph)) * 0.05
    flutter = 1 + 0.5 * np.sin(2 * np.pi * 26 * t)
    x = lp(chirp * flutter, 4500) * np.sin(np.pi * t / dur) ** 1.5
    x += hp(rng.standard_normal(n), 2500) * np.exp(-t * 6) * 0.05
    return x * 0.8


def impact():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    x += lp(rng.standard_normal(n), 900) * np.exp(-t * 6) * 0.25
    return np.tanh(x * 1.3) * 0.75


# ---------- arrangement ----------
music = {k: stereo() for k in ("pad", "arp", "lead", "bass", "drums", "fx")}
sfx = stereo()
kicks = []

for bar in range(TOTAL_BARS):
    app, local = divmod(bar, APP_BARS)
    ending = app >= len(APPS)
    lb = bar - len(APPS) * APP_BARS if ending else local
    t0 = bar_t(bar)
    ch = chord_at(bar)
    breakdown = (not ending) and local >= MAIN_BARS
    intro = app == 0 and local < 4

    # pad: whole bar, voiced wide
    pad_gain = 0.16 if not breakdown else 0.2
    if ending and lb >= 2:
        if lb == 2:
            for k, n_ in enumerate(ch["pad"] + ["A5"]):
                place(music["pad"], pad_note(midi(nm(n_)), 4 * BAR - 0.5), t0, 0.2, pan=(k - 2.5) * 0.22)
    else:
        for k, n_ in enumerate(ch["pad"]):
            place(music["pad"], pad_note(midi(nm(n_)), BAR), t0, pad_gain, pan=(k - 2) * 0.25)

    # arp: 16ths through the chord
    if not (ending and lb >= 3):
        for s in range(16):
            if breakdown and local == APP_BARS - 1 and s >= 12:
                break
            if ending and lb == 2 and s >= 8:
                break
            note = ch["arp"][ARP_PAT[s]]
            vel = (1.0 if s % 4 == 0 else 0.72 if s % 2 == 0 else 0.55)
            if intro:
                vel *= 0.55 + 0.45 * (local * 16 + s) / 64
            place(music["arp"], pluck(midi(nm(note)), vel), t0 + s * STEP, 0.13, pan=0.35 * np.sin(s * 0.9))

    # bass + drums only in the groove
    groove = (not breakdown) and (not ending) and not intro
    if groove:
        for e in range(8):
            if e % 2 == 1:
                f = midi(nm(ch["bass"]) + (12 if e in (3, 7) else 0))
                place(music["bass"], bass_note(f, STEP * 1.6), t0 + e * BEAT / 2, 0.34)
        for b in range(4):
            place(music["drums"], kick(), t0 + b * BEAT, 0.5)
            kicks.append(t0 + b * BEAT)
            place(music["drums"], hat(open_=True), t0 + b * BEAT + BEAT / 2, 0.26, pan=0.2)
            if b in (1, 3):
                place(music["drums"], clap(), t0 + b * BEAT, 0.3, pan=-0.05)
        for s in range(16):
            v = 0.9 if s % 2 else 0.55
            place(music["drums"], shaker(), t0 + s * STEP + (0.012 if s % 2 else 0), 0.55 * v, pan=-0.3)
        if local == 0 or (app == 0 and local == 4):
            place(music["drums"], crash(), t0, 0.55)
    if intro and local == 3:
        place(music["fx"], riser(BAR), t0, 0.7)

    # lead hook from the second app onward; octave doubling in the second half of the film
    if (not breakdown) and (not ending) and app >= 1:
        for (hb, st, n_, ln) in HOOK:
            if hb != local:
                continue
            f = midi(nm(n_))
            place(music["lead"], bell(f, ln * STEP), t0 + st * STEP, 0.27, pan=0.05)
            if app >= 5:
                place(music["lead"], bell(f / 2, ln * STEP), t0 + st * STEP, 0.09, pan=-0.2)
    if ending:
        for (hb, st, n_, ln) in END_MELODY:
            if hb == lb:
                place(music["lead"], bell(midi(nm(n_)), ln * STEP), t0 + st * STEP, 0.22)

    # breakdown: filtered space, swell and riser into the next downbeat
    if breakdown and local == MAIN_BARS:
        place(music["fx"], riser(2 * BAR), t0, 0.55)
    if breakdown and local == APP_BARS - 1:
        place(music["fx"], reverse_swell(BAR), t0, 0.9)

# ending hits
end_t = len(APPS) * APP_BARS * BAR
place(music["drums"], crash(), end_t, 0.6)
place(music["drums"], kick(), end_t, 0.7)
place(sfx, impact(), end_t, 0.7)
place(sfx, impact(), end_t + 1.0, 0.45)  # "Blueprint" lands on beat 2

# breakdown filter: duck the arp/pad brightness under each flashback
def bright(t):
    bar = t / BAR
    app, local = divmod(bar, APP_BARS)
    if app >= len(APPS):
        return 7000
    if local < MAIN_BARS - 0.05:
        if app == 0 and local < 4:
            return 900 + 6000 * (local / 4) ** 2
        return 7000
    p = min(1.0, max(0.0, (local - MAIN_BARS) / 2))
    return 7000 * (1 - 0.82 * np.sin(np.pi * p) ** 0.6)


music["arp"] = sweep_lp(music["arp"], bright)
music["pad"] = sweep_lp(music["pad"], lambda t: bright(t) * 0.6)

# sidechain pump from the kick
sc = np.ones(N)
tt = np.arange(int(0.42 * SR)) / SR
pump = 1 - 0.55 * np.exp(-tt / 0.09) * (1 - np.exp(-tt / 0.004))
for k in kicks:
    i = int(k * SR)
    j = min(N, i + len(pump))
    sc[i:j] = np.minimum(sc[i:j], pump[: j - i])
for key in ("pad", "arp", "bass"):
    music[key] *= sc[:, None]

# delay on arp + lead (dotted eighth ping-pong)
def pingpong(x, d=0.375 * BEAT * 2, fb=0.38, taps=6, wet=0.32):
    y = x.copy()
    di = int(d * SR)
    for k in range(1, taps + 1):
        sh = np.zeros_like(x)
        sh[di * k :] = x[: -di * k] if di * k < len(x) else 0
        if k % 2:
            sh = sh[:, ::-1]
        y += lp(sh, 5000 - 500 * k) * (fb ** k) * wet / fb
    return y


music["arp"] = pingpong(music["arp"])
music["lead"] = pingpong(music["lead"], fb=0.32, wet=0.28)

# reverb (synthetic stereo hall IR)
def reverb(x, rt=2.6, wet=0.25, pre=0.02):
    n = int(rt * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / rt)[:, None]
    ir = lp(ir, 6500)
    ir[: int(pre * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2, axis=0))
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + y * wet


bus = music["pad"] + music["arp"] + music["lead"] * 1.0 + music["fx"]
bus = reverb(bus, wet=0.33)
mix_music = bus + music["bass"] + reverb(music["drums"], rt=1.2, wet=0.08)
mix_music = hp(mix_music, 28)

# ---------- SFX from capture metadata ----------
for i, app in enumerate(APPS):
    base = i * APP_BARS * BAR
    m = META[app]
    for f in m["presses"]:
        if f < MAIN_BARS * 4 * 15:
            place(sfx, ui_click(0.9), base + f / FPS, 1.0, pan=0.1)
    for f in m.get("keys", []):
        if f < MAIN_BARS * 4 * 15:
            place(sfx, key_tick(), base + f / FPS, 1.0, pan=-0.1)
    cuts = [6, 10, 14] if app not in ("ACE", "PFD") else [8, 14]
    for c in cuts:
        place(sfx, swish(0.3), base + c - 0.16, 1.0)
    fb = base + MAIN_BARS * BAR
    place(sfx, rewind(0.7), fb - 0.05, 0.9)
    place(sfx, swish(0.5, up=False), fb + 3.0, 0.9)  # flashback exits to black
    if i > 0:
        place(sfx, impact(), base, 0.35)


def master(x, target_peak=0.89):
    x = np.tanh(x * 1.15) / 1.15
    pk = np.max(np.abs(x))
    return x / pk * target_peak


fade = np.ones(N)
end_i = int((TOTAL_BARS * BAR - 0.8) * SR)
fade[end_i:] = np.linspace(1, 0, N - end_i) ** 2
full = master((mix_music * 0.9 + sfx * 0.85) * fade[:, None])
sfx_only = master(sfx * fade[:, None], 0.7)
music_only = master(mix_music * fade[:, None])

L = int(TOTAL_BARS * BAR * SR)
out = root / "public/audio"
out.mkdir(parents=True, exist_ok=True)
sf.write(out / "mix.wav", full[:L].astype(np.float32), SR, subtype="PCM_24")
sf.write(out / "sfx-only.wav", sfx_only[:L].astype(np.float32), SR, subtype="PCM_24")
sf.write(out / "music-only.wav", music_only[:L].astype(np.float32), SR, subtype="PCM_24")
print("wrote", out, f"{L / SR:.2f}s")
