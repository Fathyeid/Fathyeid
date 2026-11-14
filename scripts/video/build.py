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


def mux(out):
    tl = json.load(open(os.path.join(out, 'timeline.json')))
    scenes = tl['scenes']
    t0 = scenes[0]['start'] - 0.3
    end = scenes[-1]['start'] + scenes[-1]['dur'] + 0.5
    inputs = ['-ss', f'{t0:.2f}', '-t', f'{end - t0:.2f}', '-i', tl['video']]
    filt = []
    for i, s in enumerate(scenes, 1):
        inputs += ['-i', os.path.join(out, f"{s['id']}.mp3")]
        ms = int((s['start'] - t0 + 0.35) * 1000)
        filt.append(f'[{i}:a]adelay={ms}|{ms}[a{i}]')
    mix = ''.join(f'[a{i}]' for i in range(1, len(scenes) + 1)) + f'amix=inputs={len(scenes)}:normalize=0,apad[aout]'
    fc = ';'.join(filt + [mix])
    dst = os.path.join(out, 'athar-video.mp4')
    subprocess.check_call(['ffmpeg', '-y', *inputs, '-filter_complex', fc, '-map', '0:v', '-map', '[aout]',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '30',
                           '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', dst])
    print('video', dst, round(dur(dst), 1), 's', os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    {'tts': tts, 'mux': mux}[sys.argv[1]](sys.argv[2])
