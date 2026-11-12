# Third-party licensing notes

The site uses FFmpeg WebAssembly packages at runtime. The `@ffmpeg/core` 0.12.10 package identifies its license as GPL-2.0-or-later. The `@ffmpeg/ffmpeg` wrapper has a separate license. FFmpeg builds can include additional codec libraries with their own license terms.

Before commercial distribution or monetisation, review the exact upstream package notices, source availability requirements and included codec licenses. This note is not legal advice. The tool does not bundle a modified FFmpeg core binary; it fetches the specified package from jsDelivr at runtime.
