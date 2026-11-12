(() => {
  const FFMPEG_VERSION = '0.12.10';
  const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm`;
  const LIB_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm/index.js`;
  const MAX_FILE_BYTES = 250 * 1024 * 1024;
  const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', m4a: 'audio/mp4' };
  const $ = (root, selector) => root.querySelector(selector);
  let ffmpegPromise = null;
  let ffmpeg = null;
  let activeBlobUrls = [];

  function bytesLabel(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB']; let value = bytes / 1024; let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
    return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
  }
  function safeBaseName(name) {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    return base.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'audio-file';
  }
  function extOf(name) { const match = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/); return match ? match[1] : 'audio'; }
  function humanError(error) {
    const message = String(error?.message || error || 'Unknown error');
    if (/out of memory|allocation failed/i.test(message)) return 'This file is too large for available browser memory. Try a shorter file or a desktop browser.';
    if (/no such file|invalid data|could not find codec|unknown format/i.test(message)) return 'The file format could not be read. Try another audio file or check that the file is not damaged.';
    return 'Conversion could not finish. Please try a different file or output format.';
  }
  async function blobURL(url, mime) {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`Could not load conversion engine (${response.status}).`);
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: mime }));
  }
  async function getFFmpeg(onMessage) {
    if (!ffmpegPromise) {
      ffmpegPromise = (async () => {
        onMessage?.('Downloading the audio engine for this browser…');
        const { FFmpeg } = await import(LIB_URL);
        const instance = new FFmpeg();
        instance.on('log', ({ message }) => {
          if (/error|invalid|failed/i.test(message)) console.debug('[FFmpeg]', message);
        });
        const coreURL = await blobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await blobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm');
        activeBlobUrls.push(coreURL, wasmURL);
        const classWorkerURL = new URL('./assets/js/ffmpeg-worker.js', window.location.href).href;
        await instance.load({ classWorkerURL, coreURL, wasmURL });
        ffmpeg = instance;
        return instance;
      })().catch(error => { ffmpegPromise = null; throw error; });
    }
    return ffmpegPromise;
  }
  function argsFor(format, bitrate) {
    if (format === 'mp3') return ['-c:a', 'libmp3lame', '-b:a', bitrate];
    if (format === 'wav') return ['-c:a', 'pcm_s16le'];
    if (format === 'flac') return ['-c:a', 'flac'];
    if (format === 'ogg') return ['-c:a', 'libvorbis', '-q:a', '5'];
    if (format === 'm4a') return ['-c:a', 'aac', '-b:a', bitrate, '-f', 'ipod'];
    throw new Error('Unsupported output format.');
  }
  function addFileRow(list, file, remove) {
    const row = document.createElement('div'); row.className = 'file-row';
    const icon = document.createElement('div'); icon.className = 'file-icon'; icon.textContent = extOf(file.name).slice(0, 4).toUpperCase();
    const meta = document.createElement('div'); meta.className = 'file-meta';
    const name = document.createElement('div'); name.className = 'file-name'; name.textContent = file.name;
    const size = document.createElement('div'); size.className = 'file-size'; size.textContent = bytesLabel(file.size);
    meta.append(name, size);
    const removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.className = 'remove-file'; removeButton.setAttribute('aria-label', `Remove ${file.name}`); removeButton.textContent = '×'; removeButton.addEventListener('click', remove);
    row.append(icon, meta, removeButton); list.append(row);
  }
  function init(root) {
    const input = $(root, '.audio-file-input');
    const browse = $(root, '.browse-button');
    const dropzone = $(root, '.dropzone');
    const fileList = $(root, '.file-list');
    const formatSelect = $(root, '.format-select');
    const bitrateSelect = $(root, '.bitrate-select');
    const bitrateField = $(root, '.quality-field');
    const convertButton = $(root, '.convert-button');
    const clearButton = $(root, '.clear-button');
    const statusArea = $(root, '.status-area');
    const progressFill = $(root, '.progress-fill');
    const statusMessage = $(root, '.status-message');
    const statusPercent = $(root, '.status-percent');
    const results = $(root, '.results');
    const notice = $(root, '.notice');
    const selectedFiles = [];
    const fixedOutput = root.dataset.fixedOutput || '';
    const isCompressor = root.dataset.mode === 'compress';

    if (!input || !browse || !dropzone || !fileList || !formatSelect || !convertButton) return;
    if (fixedOutput) { formatSelect.value = fixedOutput; formatSelect.disabled = true; }
    if (isCompressor) formatSelect.value = 'mp3';
    bitrateField?.classList.toggle('is-hidden', !['mp3', 'm4a'].includes(formatSelect.value));
    const refresh = () => {
      fileList.replaceChildren();
      selectedFiles.forEach((file, index) => addFileRow(fileList, file, () => { selectedFiles.splice(index, 1); refresh(); }));
      convertButton.disabled = selectedFiles.length === 0;
      const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      if (selectedFiles.some(file => file.size > MAX_FILE_BYTES)) {
        notice.textContent = 'One or more files exceed the 250 MB per-file limit for this browser-based version. Remove those files to continue.';
        notice.classList.add('visible'); convertButton.disabled = true;
      } else if (total > 450 * 1024 * 1024) {
        notice.textContent = 'The total selection is very large. Convert fewer files at a time to avoid running out of browser memory.';
        notice.classList.add('visible');
      } else { notice.classList.remove('visible'); }
    };
    function addFiles(files) {
      const incoming = Array.from(files || []);
      const accepted = isCompressor ? incoming.filter(file => extOf(file.name) === 'wav') : incoming;
      const rejectedCount = incoming.length - accepted.length;
      const seen = new Set(selectedFiles.map(file => `${file.name}|${file.size}|${file.lastModified}`));
      accepted.forEach(file => {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (!seen.has(key)) { selectedFiles.push(file); seen.add(key); }
      });
      refresh();
      if (rejectedCount) {
        notice.textContent = isCompressor ? 'The WAV Compressor accepts .wav files. Other selected files were skipped.' : 'One or more files were skipped.';
        notice.classList.add('visible');
      }
    }
    browse.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragover'); }));
    dropzone.addEventListener('drop', event => addFiles(event.dataTransfer?.files));
    formatSelect.addEventListener('change', () => {
      bitrateField?.classList.toggle('is-hidden', !['mp3', 'm4a'].includes(formatSelect.value));
    });
    if (clearButton) clearButton.addEventListener('click', () => {
      selectedFiles.splice(0); results.replaceChildren(); statusArea.classList.remove('visible'); notice.classList.remove('visible'); refresh();
    });

    function setStatus(message, percent = 0) {
      statusArea.classList.add('visible'); statusMessage.textContent = message;
      const rounded = Math.max(0, Math.min(100, Math.round(percent)));
      progressFill.style.width = `${rounded}%`; statusPercent.textContent = `${rounded}%`;
    }
    function addResult(fileName, originalSize, data, format) {
      const blob = new Blob([data], { type: MIME[format] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob); activeBlobUrls.push(url);
      const card = document.createElement('div'); card.className = 'result-card';
      const icon = document.createElement('div'); icon.className = 'file-icon'; icon.textContent = '✓'; icon.style.background = '#ddf7ef'; icon.style.color = '#178f7e';
      const info = document.createElement('div'); info.className = 'result-info';
      const title = document.createElement('div'); title.className = 'result-title'; title.textContent = `${safeBaseName(fileName)}.${format}`;
      const sub = document.createElement('div'); sub.className = 'result-sub';
      const delta = originalSize ? ((1 - blob.size / originalSize) * 100) : 0;
      sub.textContent = `${bytesLabel(blob.size)} · ${delta > 0 ? `${delta.toFixed(1)}% smaller` : delta < 0 ? `${Math.abs(delta).toFixed(1)}% larger` : 'Ready to download'}`;
      info.append(title, sub);
      const link = document.createElement('a'); link.className = 'download-link'; link.href = url; link.download = `${safeBaseName(fileName)}.${format}`; link.textContent = 'Download';
      card.append(icon, info, link); results.append(card);
    }

    convertButton.addEventListener('click', async () => {
      if (!selectedFiles.length) return;
      const format = formatSelect.value;
      const bitrate = bitrateSelect?.value || '192k';
      const filesToConvert = [...selectedFiles];
      convertButton.disabled = true;
      browse.disabled = true;
      if (clearButton) clearButton.disabled = true;
      results.replaceChildren();
      const errors = [];
      try {
        const engine = await getFFmpeg(setStatus);
        for (let i = 0; i < filesToConvert.length; i++) {
          const file = filesToConvert[i];
          setStatus(`Converting ${i + 1} of ${filesToConvert.length}: ${file.name}`, (i / filesToConvert.length) * 100);
          const inputName = `input_${i}_${Date.now()}.${extOf(file.name)}`;
          const outputName = `output_${i}_${Date.now()}.${format}`;
          const progressHandler = ({ progress }) => {
            const overall = ((i + Math.max(0, Math.min(1, progress))) / filesToConvert.length) * 100;
            setStatus(`Converting ${i + 1} of ${filesToConvert.length}: ${file.name}`, overall);
          };
          engine.on('progress', progressHandler);
          try {
            await engine.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
            const args = ['-i', inputName, '-map', '0:a:0', '-vn', ...argsFor(format, bitrate), '-y', outputName];
            const exitCode = await engine.exec(args);
            if (exitCode !== 0) throw new Error('FFmpeg returned a non-zero exit code.');
            const data = await engine.readFile(outputName);
            addResult(file.name, file.size, data, format);
          } catch (error) {
            console.error(error); errors.push(`${file.name}: ${humanError(error)}`);
          } finally {
            try { await engine.deleteFile(inputName); } catch (_) {}
            try { await engine.deleteFile(outputName); } catch (_) {}
            if (engine.off) engine.off('progress', progressHandler);
          }
        }
        setStatus(errors.length ? `Finished with ${errors.length} file(s) that could not be converted.` : 'All files converted successfully.', 100);
        if (errors.length) {
          notice.textContent = errors.join(' '); notice.classList.add('visible');
        }
      } catch (error) {
        console.error(error);
        ffmpegPromise = null; ffmpeg = null;
        setStatus(humanError(error), 0);
        notice.textContent = 'The first conversion downloads the FFmpeg WebAssembly engine from jsDelivr. The worker bridge is served by this website. Check your connection or try again. The engine is not your audio file.';
        notice.classList.add('visible');
      } finally {
        convertButton.disabled = selectedFiles.length === 0;
        browse.disabled = false;
        if (clearButton) clearButton.disabled = false;
      }
    });
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-converter]').forEach(init));
  window.addEventListener('beforeunload', () => { activeBlobUrls.forEach(url => URL.revokeObjectURL(url)); if (ffmpeg) { try { ffmpeg.terminate(); } catch (_) {} } });
})();
