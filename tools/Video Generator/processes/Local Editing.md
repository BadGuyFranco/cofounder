# Local Video Editing

Edit videos locally using MoviePy without API calls.


## Prerequisites

Ensure MoviePy is installed:
```bash
pip3 install moviepy imageio-ffmpeg
```

FFmpeg is downloaded automatically on first use.


## Basic Usage

```bash
cd "pro accelerator/tools/Video Generator"
python3 scripts/local_video_edit.py input.mp4 output.mp4 [options]
```


## Operations

### Trim Video

Extract a portion of video by specifying start and end times (in seconds):

```bash
python3 scripts/local_video_edit.py input.mp4 output.mp4 --trim 5 15
```

This extracts from 5 seconds to 15 seconds (10 second clip).


### Resize Video

Change video dimensions:

```bash
python3 scripts/local_video_edit.py input.mp4 output.mp4 --resize 1280 720
```


### Change Speed

Speed up or slow down video:

```bash
# 2x speed
python3 scripts/local_video_edit.py input.mp4 output.mp4 --speed 2.0

# Half speed (slow motion)
python3 scripts/local_video_edit.py input.mp4 output.mp4 --speed 0.5
```


### Add Text Overlay

Add text to the video:

```bash
python3 scripts/local_video_edit.py input.mp4 output.mp4 --text "Hello World" --text-position center
```

Text positions: `top`, `center`, `bottom`


### Remove Audio

Strip audio from video:

```bash
python3 scripts/local_video_edit.py input.mp4 output.mp4 --remove-audio
```


### Concatenate Videos

Join multiple videos together:

```bash
python3 scripts/local_video_edit.py video1.mp4 video2.mp4 video3.mp4 --concat output.mp4
```


### Extract Frames

Export frames as images:

```bash
python3 scripts/local_video_edit.py input.mp4 --extract-frames ./frames/ --fps 1
```

This extracts 1 frame per second.


### Create GIF

Convert video to animated GIF:

```bash
python3 scripts/local_video_edit.py input.mp4 output.gif --gif --fps 10
```


## Parameters

| Parameter | Description |
|-----------|-------------|
| `input` | Input video file(s) |
| `output` | Output file path |
| `--trim START END` | Trim to time range (seconds) |
| `--resize W H` | Resize to width x height |
| `--speed FACTOR` | Speed multiplier (0.5 = slow, 2.0 = fast) |
| `--text TEXT` | Add text overlay |
| `--text-position POS` | Text position (top/center/bottom) |
| `--remove-audio` | Remove audio track |
| `--concat OUTPUT` | Concatenate multiple inputs |
| `--extract-frames DIR` | Extract frames to directory |
| `--gif` | Output as GIF instead of MP4 |
| `--fps N` | Frames per second (for extraction/GIF) |


## Combining Operations

Multiple operations can be combined:

```bash
python3 scripts/local_video_edit.py input.mp4 output.mp4 --trim 0 10 --resize 640 360 --speed 1.5
```


## Troubleshooting

**FFmpeg not found:** MoviePy auto-downloads FFmpeg via imageio-ffmpeg. If issues persist, ensure all dependencies from `requirements.txt` are installed.

**Memory errors with large videos:** Process in smaller chunks or reduce resolution first.

**Import error:** Install dependencies from `requirements.txt` in the Video Generator directory.


## Output

- Videos saved as MP4 (H.264 codec)
- GIFs saved with optimized palette
- Frames saved as PNG

