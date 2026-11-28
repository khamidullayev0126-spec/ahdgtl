# Reels 18 tovush effektlari — hammasi kodda sintez qilinadi (tayyor/litsenziyali fayl ishlatilmagan).
# Natija: ref/sfx.wav (48 kHz, stereo). Vaqtlar plan/beats.json dan olinadi — vizual hodisalar bilan bir xil.
import json, wave, numpy as np
SR = 48000
T = json.load(open("plan/beats.json"))["t"]
N = int((T["end"] + 0.5) * SR)
out = np.zeros(N)
rng = np.random.default_rng(18)

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def put(t0, x, gain=1.0):
    i = int(t0 * SR)
    if i >= N: return
    x = x[: N - i]
    out[i:i + len(x)] += x * gain

def lp(x, k):  # oddiy past chastotali filtr
    y = np.copy(x)
    for i in range(1, len(y)): y[i] = y[i - 1] + k * (y[i] - y[i - 1])
    return y

def pop(f=900):
    n = int(0.12 * SR); t = np.arange(n) / SR
    fr = f * (1 + 1.5 * np.exp(-t / 0.015))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.001, 0.035)

def thump():
    n = int(0.5 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-t / 0.04)) / SR) * env(n, 0.001, 0.16)
    click = rng.standard_normal(n) * env(n, 0.0005, 0.01)
    return body * 1.2 + click * 0.4

def rip(d=0.55):
    n = int(d * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    crackle = (rng.random(n) < 0.004) * rng.standard_normal(n) * 3
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return (nz - lp(nz, 0.25) + crackle) * shape * 0.35

def whoosh(d=0.35):
    n = int(d * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    k = 0.02 + 0.25 * (t / d)
    y = np.zeros(n); acc = 0
    for i in range(n): acc += k[i] * (nz[i] - acc); y[i] = acc
    return y * np.sin(np.pi * t / d) ** 2 * 0.9

def click():
    n = int(0.03 * SR)
    return rng.standard_normal(n) * env(n, 0.0003, 0.004) * 0.5

def tick():
    n = int(0.15 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1600 * t) + 0.5 * np.sin(2 * np.pi * 2400 * t)) * env(n, 0.0005, 0.03)

def ding():
    n = int(1.2 * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for f, a, d in [(1046.5, 1, .6), (1318.5, .7, .5), (1568, .6, .45), (2093, .3, .3)]:
        y += a * np.sin(2 * np.pi * f * t) * env(n, 0.002, d)
    return y * 0.35

def scribble(d=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n); hp = nz - lp(nz, 0.4)
    return hp * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) * np.sin(np.pi * t / d) * 0.25

put(0.27, thump(), 1.0)
put(0.36, rip(), 0.9)
for a in [T["oxirgisi"] - 2.4, T["tip3"], T["tip2"], T["tip1"], T["save"], T["loop"]]: put(a - 0.05, whoosh(), 0.8)
for a in [T["tip3"] + 0.15, T["tip2"] + 0.15, T["tip1"] + 0.15]: put(a, whoosh(0.3), 0.5)
pops = [0.72, 1.86, T["oxirgisi"] - 2.4, T["oxirgisi"] - 2.05, T["oxirgisi"] - 1.83, T["oxirgisi"] - 1.61, T["oxirgisi"],
        T["tip3"], T["ai3"], T["pizza"], T["pizza"] + 0.45, T["tip2"], T["type2b"] + 0.25, T["quiz"],
        T["tip1"], T["strong"], T["notfix"], T["save"], T["share"]]
for i, a in enumerate(pops): put(a, pop(700 + 120 * (i % 4)), 0.55)
for a, b in [(T["type3a"], T["type3b"]), (T["type2a"], T["type2b"])]:
    t = a
    while t < b: put(t, click(), 0.6); t += 0.06 + 0.04 * rng.random()
for a in [T["n3"], T["n2"], T["n1"]]: put(a, tick(), 0.7)
for k in range(3): put(T["marks"] + k * 0.35, pop(1300), 0.35)
for k in range(3): put(T["fix"] + k * 0.42, scribble(), 0.8)
put(T["answer"], ding(), 0.9)
put(T["fix"] + 1.35, ding(), 0.7)

out = out / max(1e-9, np.max(np.abs(out))) * 0.7
st = np.stack([out, out], axis=1)
with wave.open("ref/sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("ref/sfx.wav", round(N / SR, 2), "s")
