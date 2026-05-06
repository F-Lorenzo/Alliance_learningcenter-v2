"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  ChevronLeft, ChevronRight, CheckCircle, Circle, RotateCcw, RotateCw, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Lesson {
  id: string;
  slug: string;
  title: string;
  duration: number;
  is_free: boolean;
  sort_order: number;
  video_url?: string | null;
}

interface VideoPlayerProps {
  lesson: Lesson;
  lessons: Lesson[];
  slug: string;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  userEmail?: string;
  initialProgress?: number; // segundos donde retomar
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ lesson, lessons, slug, prevLesson, nextLesson, userEmail, initialProgress = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(lesson.duration || 0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [activeTab, setActiveTab] = useState<"content" | "notes">("content");
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<{ id: string; text: string; timestamp: number; createdAt: string }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: "10%", right: "2%" });
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<number>(0);

  // Guardar progreso en la API
  const saveProgress = useCallback((seconds: number, isCompleted?: boolean) => {
    if (!lesson.id) return;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson_id: lesson.id,
        watched_seconds: Math.floor(seconds),
        completed: isCompleted ?? completed,
      }),
    }).catch(() => {});
    lastSavedRef.current = seconds;
  }, [lesson.id, completed]);

  // Obtener URL firmada de R2 al montar.
  // Se pasa lesson_id (nunca la key directa) — el servidor resuelve
  // la key y valida el acceso antes de generar la URL firmada.
  useEffect(() => {
    if (!lesson.video_url) return; // sin video asignado, no hay nada que cargar
    setLoadingUrl(true);
    setSignedUrl(null);
    fetch(`/api/videos/signed-url?lesson_id=${encodeURIComponent(lesson.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.url) setSignedUrl(data.url);
      })
      .catch(() => {})
      .finally(() => setLoadingUrl(false));
  }, [lesson.id, lesson.video_url]);

  // Heartbeat: guardar progreso cada 10 segundos mientras reproduce
  useEffect(() => {
    if (!playing) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }
    heartbeatRef.current = setInterval(() => {
      if (videoRef.current) saveProgress(videoRef.current.currentTime);
    }, 10000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [playing, saveProgress]);

  // Guardar al desmontar (cambio de lección o cierre)
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (videoRef.current && videoRef.current.currentTime > 5) {
        saveProgress(videoRef.current.currentTime);
      }
    };
  }, [saveProgress]);

  // Sincronizar velocidad
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Auto-hide controles
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Watermark se mueve cada 30s
  useEffect(() => {
    const positions = [
      { top: "8%", right: "2%" }, { top: "8%", right: "30%" },
      { top: "70%", right: "2%" }, { top: "70%", right: "30%" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % positions.length;
      setWatermarkPos(positions[idx]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setPlaying(!playing);
  }

  function seek(delta: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + delta, duration));
  }

  function handleProgress(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    if (!completed && duration > 0 && t / duration >= 0.9) {
      setCompleted(true);
      saveProgress(t, true);
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Retomar desde donde quedó (si pasó más de 5 segundos)
      if (initialProgress > 5) {
        videoRef.current.currentTime = initialProgress;
        setCurrentTime(initialProgress);
      }
    }
  }

  function handleEnded() {
    setPlaying(false);
    if (nextLesson) {
      let c = 5;
      setCountdown(c);
      const interval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) clearInterval(interval);
      }, 1000);
    }
  }

  function saveNote() {
    if (!noteText.trim()) return;
    setNotes((prev) => [
      { id: Date.now().toString(), text: noteText.trim(), timestamp: Math.floor(currentTime), createdAt: "Ahora" },
      ...prev,
    ]);
    setNoteText("");
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Player principal */}
      <div
        className="flex flex-col flex-1 bg-black relative"
        onMouseMove={resetControlsTimer}
        onClick={resetControlsTimer}
      >
        {/* Video */}
        <div className="flex-1 relative">
          {signedUrl ? (
            <video
              ref={videoRef}
              src={signedUrl}
              className="absolute inset-0 w-full h-full object-contain"
              muted={muted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
              playsInline
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            /* Placeholder cuando no hay video */
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center">
                {loadingUrl ? (
                  <Loader2 className="w-10 h-10 text-white/40 animate-spin mx-auto" />
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border border-white/20 cursor-pointer mx-auto hover:bg-white/20 transition-colors"
                      onClick={togglePlay}>
                      {playing
                        ? <Pause className="w-8 h-8 text-white" />
                        : <Play className="w-8 h-8 text-white fill-white translate-x-0.5" />
                      }
                    </div>
                    <p className="text-white/40 text-sm mt-4">{lesson.title}</p>
                    {!lesson.video_url && (
                      <p className="text-white/20 text-xs mt-2">Video no disponible</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Watermark anti-piratería */}
          {userEmail && (
            <div
              className="absolute text-white/10 text-xs font-mono pointer-events-none select-none transition-all duration-1000 z-10"
              style={watermarkPos}
            >
              {userEmail}
            </div>
          )}

          {/* Controles overlay */}
          {signedUrl && (
            <div className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 z-10",
              showControls ? "opacity-100" : "opacity-0"
            )}>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleProgress}
                className="w-full h-1.5 mb-3 accent-gold cursor-pointer"
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="text-white hover:text-gold transition-colors">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>
                  <button onClick={() => seek(-10)} className="text-white/70 hover:text-white transition-colors">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => seek(10)} className="text-white/70 hover:text-white transition-colors">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setMuted((v) => !v)} className="text-white/70 hover:text-white transition-colors">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-sm font-mono text-white/70">
                    {fmt(currentTime)} / {fmt(duration)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={speed}
                    onChange={(e) => {
                      const s = Number(e.target.value);
                      setSpeed(s);
                      if (videoRef.current) videoRef.current.playbackRate = s;
                    }}
                    className="bg-transparent text-white/70 text-sm border-none outline-none cursor-pointer"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <option key={s} value={s} className="bg-black">{s}x</option>
                    ))}
                  </select>
                  <button
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => videoRef.current?.requestFullscreen()}
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Countdown auto-next */}
          {countdown !== null && nextLesson && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
              <div className="text-center">
                <p className="text-white text-lg font-medium mb-2">Siguiente técnica en {countdown}…</p>
                <p className="text-white/60 text-sm mb-6">{nextLesson.title}</p>
                <div className="flex gap-3 justify-center">
                  <Link href={`/modulos/${slug}/${nextLesson.slug}`}>
                    <Button variant="primary" size="md">Ir ahora</Button>
                  </Link>
                  <Button variant="secondary" size="md" onClick={() => setCountdown(null)}>
                    Quedarme acá
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debajo del player */}
        <div className="p-6 border-t border-border-default bg-bg-primary">
          <h1 className="text-xl font-medium text-text-primary">{lesson.title}</h1>
          <p className="text-sm text-text-secondary mt-1">Duración: {fmt(duration)}</p>

          <div className="flex justify-between items-center mt-6">
            {prevLesson ? (
              <Link href={`/modulos/${slug}/${prevLesson.slug}`}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4" /> Técnica anterior
                </Button>
              </Link>
            ) : <div />}
            {nextLesson && (
              <Link href={`/modulos/${slug}/${nextLesson.slug}`}>
                <Button variant="ghost" size="sm">
                  Siguiente técnica <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar derecha */}
      <aside className="w-[360px] shrink-0 border-l border-border-default flex flex-col bg-bg-primary overflow-hidden hidden lg:flex">
        <div className="flex border-b border-border-default">
          {(["content", "notes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 text-sm transition-colors",
                activeTab === tab
                  ? "text-text-primary border-b-2 border-gold font-medium"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab === "content" ? "Contenido" : "Mis notas"}
            </button>
          ))}
        </div>

        {activeTab === "content" ? (
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border-default">
              <p className="text-sm font-medium text-text-primary">Técnicas del módulo</p>
              <p className="text-xs text-text-secondary mt-0.5">{lessons.length} técnicas</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {lessons.map((l) => {
                const isCurrent = l.id === lesson.id;
                const isCompleted = l.sort_order < lesson.sort_order;
                return (
                  <Link
                    key={l.id}
                    href={`/modulos/${slug}/${l.slug}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors border-b border-border-default",
                      isCurrent && "bg-bg-secondary border-l-2 border-gold"
                    )}
                  >
                    <span className="text-xs font-mono text-text-tertiary w-6 shrink-0">
                      {String(l.sort_order).padStart(2, "0")}
                    </span>
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : isCurrent ? (
                      <Play className="w-3.5 h-3.5 text-gold fill-gold shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        isCurrent ? "text-gold font-medium" : "text-text-primary"
                      )}>
                        {l.title}
                      </p>
                      <p className="text-xs text-text-secondary">{fmt(l.duration)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-border-default">
              <p className="text-sm font-medium text-text-primary mb-3">Notas de esta técnica</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribí una nota sobre esta técnica…"
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 resize-none transition-colors"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-text-tertiary">En {fmt(currentTime)} del video</span>
                <Button variant="primary" size="sm" onClick={saveNote}>
                  Guardar nota
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {notes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-text-tertiary">Todavía no tenés notas en esta técnica</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="px-4 py-3 border-b border-border-default">
                    <button
                      className="text-[10px] font-mono bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-sm hover:text-gold transition-colors"
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = note.timestamp;
                      }}
                    >
                      En {fmt(note.timestamp)}
                    </button>
                    <p className="text-sm text-text-primary mt-2 leading-relaxed">{note.text}</p>
                    <p className="text-xs text-text-tertiary mt-1">{note.createdAt}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
