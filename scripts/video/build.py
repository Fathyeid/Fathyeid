#!/usr/bin/env python3
"""مراحل إنتاج فيديو التعريف بالتطبيق:
  tts   : يولّد التعليق الصوتي لكل مشهد (edge-tts) ويحسب المدد → durations.json
  mux   : يدمج تسجيل الشاشة مع التعليق الصوتي في ملف MP4 واحد
الاستخدام: python3 build.py tts <out>  |  python3 build.py mux <out>
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get('VOICE', 'ar-EG-ShakirNeural')


def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode().strip())


def tts(out):
    scenes = json.load(open(os.path.join(HERE, 'scenes.json'), encoding='utf-8'))
    D = {}
    for s in scenes:
        mp3 = os.path.join(out, f"{s['id']}.mp3")
        subprocess.check_call(['edge-tts', '--voice', VOICE, '--rate=-4%', '--text', s['say'], '--write-media', mp3])
        D[s['id']] = round(dur(mp3), 2)
        print(s['id'], D[s['id']])
    json.dump(D, open(os.path.join(out, 'durations.json'), 'w'), indent=1)


def marks(video, n):
    """يكتشف بداية كل مشهد في التسجيل الفعلي من العلامة اللونية في الركن (بنفسجي/سماوي بالتناوب)."""
    fps = 20
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'crop=12:12:1:1,scale=1:1:flags=area,fps={fps}',
                                   '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    starts = []
    want = 'm'  # المشهد الأول بنفسجي
    for i in range(0, len(raw) - 2, 3):
        r, g, b = raw[i], raw[i + 1], raw[i + 2]
        c = 'm' if (r > 170 and b > 170 and g < 110) else 'c' if (g > 170 and b > 170 and r < 110) else None
        if c == want:
            starts.append(i // 3 / fps)
            want = 'c' if want == 'm' else 'm'
            if len(starts) == n:
                break
    return starts


def mux(out):
    tl = json.load(open(os.path.join(out, 'timeline.json')))
    scenes = tl['scenes']
    D = json.load(open(os.path.join(out, 'durations.json')))
    vid = tl['video']
    total = dur(vid)
    st = marks(vid, len(scenes))
    print('marks found', len(st), 'of', len(scenes))
    if len(st) != len(scenes):
        raise SystemExit('لم تُكتشف بدايات كل المشاهد في التسجيل')
    # كل مشهد = مقطعه الفعلي من التسجيل، ويُمدّ آخر إطار إذا كان أقصر من التعليق الصوتي
    segs = []
    for i, s in enumerate(scenes):
        a = st[i] - 0.25
        b = (st[i + 1] - 0.25) if i + 1 < len(scenes) else min(total, st[i] + D[s['id']] + 1.2)
        need = D[s['id']] + 0.9
        segs.append((max(0, a), b, max(0.0, need - (b - a))))
    # (١) مقطع لكل مشهد على حدة (ذاكرة قليلة)، مع مدّ آخر إطار عند الحاجة وتغطية العلامة اللونية
    seg_files, t, delays = [], 0.0, []
    for i, (a, b, pad) in enumerate(segs):
        f = os.path.join(out, f'seg{i:03d}.mp4')
        vf = 'drawbox=x=0:y=0:w=20:h=20:color=0x0b1610@1:t=fill' + (f',tpad=stop_mode=clone:stop_duration={pad:.3f}' if pad > 0 else '') + ',fps=30'
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', vid, '-vf', vf, '-an',
                               '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', f])
        seg_files.append(f)
        delays.append(t + 0.6)
        t += dur(f)
    lst = os.path.join(out, 'segs.txt')
    open(lst, 'w').write(''.join(f"file '{os.path.basename(f)}'\n" for f in seg_files))
    joined = os.path.join(out, 'joined.mp4')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined])
    # (٢) الصوت: تعليق كل مشهد يبدأ مع بداية مقطعه الفعلي
    inputs, filt = ['-i', joined], []
    for i, s in enumerate(scenes):
        inputs += ['-i', os.path.join(out, f"{s['id']}.mp3")]
        ms = int(delays[i] * 1000)
        filt.append(f'[{i + 1}:a]adelay={ms}|{ms}[a{i}]')
    filt.append(''.join(f'[a{i}]' for i in range(len(scenes))) + f'amix=inputs={len(scenes)}:normalize=0,apad[aout]')
    dst = os.path.join(out, 'athar-video.mp4')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[aout]',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', dst])
    print('video', dst, round(dur(dst), 1), 's (expected', round(t, 1), ')', os.path.getsize(dst) // 1024, 'KB')
    lite = os.path.join(out, 'athar-video-720.mp4')
    subprocess.check_call(['ffmpeg', '-y', '-i', dst, '-vf', 'scale=720:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
                           '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', lite])
    print('lite', lite, os.path.getsize(lite) // 1024, 'KB')


if __name__ == '__main__':
    {'tts': tts, 'mux': mux}[sys.argv[1]](sys.argv[2])
