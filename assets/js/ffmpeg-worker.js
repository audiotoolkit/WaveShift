/*
 * Same-origin worker bridge for @ffmpeg/ffmpeg 0.12.10.
 * It mirrors the small message surface used by this site so the worker itself
 * can be served from this website instead of a cross-origin CDN.
 */
const TYPES = {
  LOAD: 'LOAD', EXEC: 'EXEC', WRITE_FILE: 'WRITE_FILE', READ_FILE: 'READ_FILE',
  DELETE_FILE: 'DELETE_FILE', ERROR: 'ERROR', PROGRESS: 'PROGRESS', LOG: 'LOG'
};
let core = null;

async function loadCore({ coreURL, wasmURL, workerURL }) {
  const module = await import(coreURL);
  const createFFmpegCore = module.default;
  if (typeof createFFmpegCore !== 'function') throw new Error('failed to import ffmpeg-core.js');
  const resolvedWasmURL = wasmURL || coreURL.replace(/\.js$/i, '.wasm');
  const resolvedWorkerURL = workerURL || coreURL.replace(/\.js$/i, '.worker.js');
  core = await createFFmpegCore({
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL: resolvedWasmURL, workerURL: resolvedWorkerURL }))}`
  });
  core.setLogger(data => self.postMessage({ type: TYPES.LOG, data }));
  core.setProgress(data => self.postMessage({ type: TYPES.PROGRESS, data }));
  return true;
}

self.onmessage = async ({ data: message }) => {
  const { id, type, data } = message || {};
  try {
    let result;
    if (type === TYPES.LOAD) {
      if (!core) result = await loadCore(data || {});
      else result = false;
    } else {
      if (!core) throw new Error('ffmpeg is not loaded, call await ffmpeg.load() first');
      switch (type) {
        case TYPES.EXEC:
          core.setTimeout(data.timeout ?? -1);
          core.exec(...(data.args || []));
          result = core.ret;
          core.reset();
          break;
        case TYPES.WRITE_FILE:
          core.FS.writeFile(data.path, data.data);
          result = true;
          break;
        case TYPES.READ_FILE:
          result = core.FS.readFile(data.path, { encoding: data.encoding || 'binary' });
          break;
        case TYPES.DELETE_FILE:
          core.FS.unlink(data.path);
          result = true;
          break;
        default:
          throw new Error('unknown message type');
      }
    }
    const transfer = result instanceof Uint8Array ? [result.buffer] : [];
    self.postMessage({ id, type, data: result }, transfer);
  } catch (error) {
    self.postMessage({ id, type: TYPES.ERROR, data: String(error?.message || error) });
  }
};
