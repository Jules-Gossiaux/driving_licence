"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LessonMediaView } from "@/application/content-views";

type MarkdownContentProps = {
  body: string;
  mediaByFile?: Record<string, LessonMediaView>;
  className?: string;
};

type ZoomableImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string | null;
};

const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;

function ZoomableImage({ src, alt, width, height, caption }: ZoomableImageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function openDialog() {
    setZoom(1);
    setOpen(true);
  }

  function changeZoom(direction: 1 | -1) {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]);
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), ZOOM_LEVELS.length - 1);
    setZoom(ZOOM_LEVELS[nextIndex] ?? 1);
  }

  return (
    <figure className="lesson-figure">
      <button
        type="button"
        onClick={openDialog}
        className="group block w-full cursor-zoom-in rounded-xl text-left"
        aria-label={`Agrandir l'image : ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          unoptimized
          className="h-auto w-full rounded-xl border border-slate-200 bg-white"
        />
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-slate-800">
          <span aria-hidden="true">⤢</span> Toucher pour agrandir
        </span>
      </button>
      {caption ? <figcaption className="mt-1 text-xs text-slate-500">{caption}</figcaption> : null}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        aria-label={`Aperçu agrandi : ${alt}`}
        className="media-dialog"
      >
        <div className="media-dialog-card">
          <div className="media-dialog-toolbar">
            <p className="line-clamp-1 pr-2 text-sm font-medium text-slate-700">{alt}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => changeZoom(-1)}
                disabled={zoom <= 1}
                aria-label="Réduire le zoom"
                className="media-dialog-button"
              >
                −
              </button>
              <span className="w-12 text-center text-xs font-semibold text-slate-600 tabular-nums">
                {Math.round(zoom * 100)} %
              </span>
              <button
                type="button"
                onClick={() => changeZoom(1)}
                disabled={zoom >= 3}
                aria-label="Augmenter le zoom"
                className="media-dialog-button"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer l'aperçu"
                className="media-dialog-button ml-1 bg-slate-900 text-white hover:bg-slate-700"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="media-dialog-scroll">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              unoptimized
              style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
              className="h-auto rounded-lg bg-white"
            />
          </div>
          {caption ? <p className="media-dialog-caption">{caption}</p> : null}
        </div>
      </dialog>
    </figure>
  );
}

function ZoomableTable({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <div className="lesson-table">
      <div
        className="lesson-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tableau défilable horizontalement"
      >
        <table>{children}</table>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 sm:hidden">
          Faites glisser pour voir toutes les colonnes.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <span aria-hidden="true">⤢</span> Agrandir le tableau
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        aria-label="Tableau agrandi"
        className="media-dialog media-dialog-wide"
      >
        <div className="media-dialog-card">
          <div className="media-dialog-toolbar">
            <p className="text-sm font-medium text-slate-700">Tableau</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le tableau agrandi"
              className="media-dialog-button bg-slate-900 text-white hover:bg-slate-700"
            >
              ✕
            </button>
          </div>
          <p className="px-4 pt-3 text-xs text-slate-500 sm:hidden">
            Faites glisser le tableau pour voir les autres colonnes.
          </p>
          <div className="media-dialog-scroll p-4">
            <table>{children}</table>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export function MarkdownContent({ body, mediaByFile, className }: MarkdownContentProps) {
  return (
    <div className={`lesson-body ${className ?? ""}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            if (typeof src !== "string") {
              return null;
            }

            const media = mediaByFile?.[src];

            return (
              <ZoomableImage
                src={src}
                alt={alt || media?.alt || "Illustration de la leçon"}
                width={media?.width ?? 960}
                height={media?.height ?? 540}
                caption={media?.caption}
              />
            );
          },
          table: ({ children }) => <ZoomableTable>{children}</ZoomableTable>,
          p: ({ children, node }) => {
            const onlyChild = node?.children.length === 1 ? node.children[0] : undefined;

            if (onlyChild?.type === "element" && onlyChild.tagName === "img") {
              return <>{children}</>;
            }

            return <p>{children}</p>;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
