import React, { useState } from 'react';
import { ExternalLink, Play, RefreshCw, Square, Video } from 'lucide-react';

interface CctvPanelProps {
  url: string;
}

export const CctvPanel: React.FC<CctvPanelProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const playStream = () => {
    setIsLoading(true);
    setIsPlaying(true);
    setFrameKey((prev) => prev + 1);
  };

  const stopStream = () => {
    // Unmounting the iframe stops its network activity/streaming.
    setIsPlaying(false);
    setIsLoading(false);
  };

  const refreshFrame = () => {
    if (!isPlaying) {
      playStream();
      return;
    }
    setIsLoading(true);
    setFrameKey((prev) => prev + 1);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <Video className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">CCTV Sungai</h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isPlaying
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'animate-pulse bg-rose-500' : 'bg-slate-400'}`} />
                {isPlaying ? 'Live' : 'Stop'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Streaming hanya aktif saat tombol Play ditekan untuk menghemat paket data.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPlaying ? (
            <button
              type="button"
              onClick={playStream}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              title="Mulai streaming CCTV"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play CCTV
            </button>
          ) : (
            <button
              type="button"
              onClick={stopStream}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
              title="Hentikan streaming CCTV dan pemakaian data"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop CCTV
            </button>
          )}

          <button
            type="button"
            onClick={refreshFrame}
            disabled={!isPlaying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title={isPlaying ? 'Muat ulang CCTV' : 'Aktifkan CCTV terlebih dahulu'}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Buka CCTV pada tab baru"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka
          </a>
        </div>
      </div>

      <div className="relative flex h-[220px] items-center justify-center bg-slate-950 sm:h-[260px] lg:h-[300px]">
        {!isPlaying ? (
          <button
            type="button"
            onClick={playStream}
            className="group flex flex-col items-center gap-3 text-center"
            title="Mulai streaming CCTV"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition group-hover:scale-105 group-hover:bg-white/15">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">CCTV tidak sedang streaming</span>
              <span className="mt-1 block text-xs text-slate-400">Tekan Play untuk menampilkan video</span>
            </span>
          </button>
        ) : (
          <>
            {isLoading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70">
                <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-slate-200 shadow-lg">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Memuat CCTV...
                </div>
              </div>
            )}

            <iframe
              key={frameKey}
              src={url}
              title="CCTV Live Digital Twin Sungai"
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setIsLoading(false)}
            />
          </>
        )}
      </div>
    </section>
  );
};
