import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Video } from 'lucide-react';

interface CctvPanelProps {
  url: string;
}

export const CctvPanel: React.FC<CctvPanelProps> = ({ url }) => {
  const [frameKey, setFrameKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFrame = () => {
    setIsLoading(true);
    setFrameKey((prev) => prev + 1);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-3.5 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">CCTV Live Sungai</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                Live
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Pemantauan visual kondisi sungai dari CCTV Digital Twin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshFrame}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Muat ulang tampilan CCTV"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh CCTV
          </button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            title="Buka CCTV pada tab baru"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka CCTV
          </a>
        </div>
      </div>

      <div className="relative bg-slate-950">
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
          className="h-[420px] w-full border-0 sm:h-[520px] lg:h-[620px]"
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      <div className="border-t border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-400">
        Jika tampilan CCTV tidak muncul karena kebijakan keamanan server CCTV, gunakan tombol <span className="font-semibold">Buka CCTV</span>.
      </div>
    </section>
  );
};
