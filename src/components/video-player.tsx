"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  ChevronLeft, ChevronRight, CheckCircle, Circle, RotateCcw, RotateCw, Loader2,
  AlertCircle, Trash2,
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

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Clave para guardar la URL firmada en sessionStorage */
function sessionKey(lessonId: string) {
  return `signed_url_${lessonId}`;
}

/** Lee una URL firmada cacheada en sessionStorage (si aún no expiró) */
function getCachedUrl(lessonId: string): string | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(lessonId));
    if (!raw) return null;
    const { url, expiresAt } = JSON.parse(raw) as { url: string; expiresAt: number };
    // Descartar si quedan menos de 10 minutos de validez
    if (Date.now() > expiresAt - 10 * 60 * 1000) {
      sessionStorage.removeItem(sessionKey(lessonId));
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** Guarda la URL firmada en sessionStorage con su tiempo de expiración */
function setCachedUrl(lessonId: string, url: string, ttlSeconds = 7200) {
  try {
    sessionStorage.setItem(
      sessionKey(lessonId),
      JSON.stringify({ url, expiresAt: Date.now() + ttlSeconds * 1000 })
    );
  } catch {
    // sessionStorage puede estar bloqueado en modo privado
  }
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
  const [savingNote, setSavingNote] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: "10%", right: "2%" });
  const [progressError, setProgressError] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<number>(0);      // posición (segundos) del último save
  const lastSavedAtRef = useRef<number>(0);    // timestamp (ms) del último save
  const pendingSaveRef = useRef<{ seconds: number; completed: boolean } | null>(null); // cola offline
  const abortControllerRef = useRef<AbortController | null>(null);
  const seekSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Deduplicación: evita guardar si la posición no cambió y el save fue reciente ──
  // Caso típico: onPause + visibilitychange disparan juntos → mismo segundo, misma pos.
  const isDuplicate = useCallback((seconds: number): boolean => {
    const positionDelta = Math.abs(seconds - lastSavedRef.current);
    const msSinceLastSave = Date.now() - lastSavedAtRef.current;
    return positionDelta < 2 && msSinceLastSave < 3000;
  }, []);

  // ── Guardar progreso via fetch (mientras la página sigue abierta) ─
  const saveProgress = useCallback((seconds: number, isCompleted?: boolean) => {
    if (!lesson.id) return;
    if (isDuplicate(seconds)) return; // skip: save idéntico hace <3s

    const body = JSON.stringify({
      lesson_id: lesson.id,
      watched_seconds: Math.floor(seconds),
      completed: isCompleted ?? completed,
    });

    // Actualizar refs antes del fetch (optimista) para que la deduplicación funcione
    lastSavedRef.current = seconds;
    lastSavedAtRef.current = Date.now();

    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((r) => {
        if (!r.ok) {
          console.error("[progress] Error al guardar progreso:", r.status);
          // Encolar para reintentar al recuperar conexión
          pendingSaveRef.current = { seconds, completed: isCompleted ?? completed };
          setProgressError(true);
          setTimeout(() => setProgressError(false), 5000);
        } else {
          // Save exitoso: limpiar cola offline si la había
          pendingSaveRef.current = null;
        }
      })
      .catch(() => {
        // Error de red → encolar para cuando vuelva la conexión
        pendingSaveRef.current = { seconds, completed: isCompleted ?? completed };
        setProgressError(true);
        setTimeout(() => setProgressError(false), 5000);
      });
  }, [lesson.id, completed, isDuplicate]);

  // ── Guardar via sendBeacon (garantizado incluso al cerrar el browser) ──
  // sendBeacon no puede cancelarse ni falla por cierre de pestaña.
  const saveProgressBeacon = useCallback((seconds: number, isCompleted?: boolean) => {
    if (!lesson.id || seconds <= 5) return;
    if (isDuplicate(seconds)) return; // skip: save idéntico hace <3s

    lastSavedRef.current = seconds;
    lastSavedAtRef.current = Date.now();

    const payload = JSON.stringify({
      lesson_id: lesson.id,
      watched_seconds: Math.floor(seconds),
      completed: isCompleted ?? completed,
    });
    navigator.sendBeacon(
      "/api/progress",
      new Blob([payload], { type: "application/json" })
    );
  }, [lesson.id, completed, isDuplicate]);

  // ── Cola offline: reintentar el último save cuando vuelve la conexión ──
  useEffect(() => {
    function handleOnline() {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      pendingSaveRef.current = null; // limpiar antes de reintentar
      saveProgress(pending.seconds, pending.completed);
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [saveProgress]);

  // ── Obtener URL firmada de R2 al montar ───────────────────────
  // 1. Primero busca en sessionStorage (evita request si la URL sigue vigente)
  // 2. Si no hay cache, fetcha con AbortController para cancelar si la lección cambia
  useEffect(() => {
    if (!lesson.video_url) return;

    // Verificar cache primero
    const cached = getCachedUrl(lesson.id);
    if (cached) {
      setSignedUrl(cached);
      return;
    }

    // Cancelar request anterior si el usuario navegó rápido entre lecciones
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingUrl(true);
    setSignedUrl(null);

    fetch(`/api/videos/signed-url?lesson_id=${encodeURIComponent(lesson.id)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          setSignedUrl(data.url);
          setCachedUrl(lesson.id, data.url, 7200); // cachear 2 horas
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("[signed-url]", err);
      })
      .finally(() => setLoadingUrl(false));

    return () => controller.abort();
  }, [lesson.id, lesson.video_url]);

  // ── Cargar notas desde la DB al montar o cambiar de lección ─────────────
  useEffect(() => {
    fetch(`/api/notes?lesson_id=${encodeURIComponent(lesson.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotes(
            data.map((n: { id: string; text: string; timestamp_sec: number; created_at: string }) => ({
              id: n.id,
              text: n.text,
              timestamp: n.timestamp_sec,
              createdAt: fmtDate(n.created_at),
            }))
          );
        }
      })
      .catch(() => {}); // silencioso si no hay conexión
  }, [lesson.id]);

  // ── Heartbeat: 60s — solo red de seguridad, los eventos cubren lo demás ──
  // Los eventos pause, seek y visibilitychange ya guardan en los momentos clave.
  // Este intervalo es el último recurso para videos que corren sin interrupciones.
  useEffect(() => {
    if (!playing) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === "hidden") return; // cubierto por visibilitychange
      if (videoRef.current) saveProgress(videoRef.current.currentTime);
    }, 60_000); // 60s — era 30s → era 10s. Ahora los eventos manejan los casos importantes.

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [playing, saveProgress]);

  // ── visibilitychange: guardar INMEDIATAMENTE al ir a background ──
  // Antes solo pausaba el heartbeat. Ahora también salva la posición actual.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        // Guardar posición inmediatamente (el usuario cambió de pestaña/app)
        if (videoRef.current && videoRef.current.currentTime > 5) {
          saveProgressBeacon(videoRef.current.currentTime);
        }
      }
      // Al volver a visible, el heartbeat se reactiva con el efecto de playing
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveProgressBeacon]);

  // ── pagehide: reemplaza beforeunload para mayor compatibilidad ──────
  // `beforeunload` no dispara en iOS Safari ni cuando la página entra al bfcache.
  // `pagehide` cubre ambos casos y todos los navegadores desktop también.
  // sendBeacon garantiza la entrega incluso cuando el proceso ya está cerrando.
  useEffect(() => {
    function handlePageHide() {
      if (videoRef.current && videoRef.current.currentTime > 5) {
        saveProgressBeacon(videoRef.current.currentTime);
      }
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [saveProgressBeacon]);

  // ── Desmontar por cambio de lección (navegación interna) ──────
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (seekSaveTimeout.current) clearTimeout(seekSaveTimeout.current);
      // En navegación interna fetch sigue funcionando (página no cierra)
      if (videoRef.current && videoRef.current.currentTime > 5) {
        saveProgress(videoRef.current.currentTime);
      }
    };
  }, [saveProgress]);

  // ── Sincronizar velocidad ─────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // ── Auto-hide controles ───────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // ── Watermark se mueve cada 30s ───────────────────────────────
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
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + delta, duration));
    videoRef.current.currentTime = newTime;
    // Guardar posición al buscar con los botones ±10s (debounce 1s)
    if (seekSaveTimeout.current) clearTimeout(seekSaveTimeout.current);
    seekSaveTimeout.current = setTimeout(() => saveProgress(newTime), 1000);
  }

  // El usuario arrastró la barra de progreso — guardar nueva posición
  function handleProgress(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
    // Debounce 1s: evita guardar en cada pixel arrastrado
    if (seekSaveTimeout.current) clearTimeout(seekSaveTimeout.current);
    seekSaveTimeout.current = setTimeout(() => saveProgress(t), 1000);
  }

  // El usuario pausó explícitamente — checkpoint natural
  function handlePause() {
    setPlaying(false);
    if (videoRef.current && videoRef.current.currentTime > 5) {
      saveProgress(videoRef.current.currentTime);
    }
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
      const realDuration = videoRef.current.duration;
      setDuration(realDuration);
      // Retomar desde donde quedó (si pasó más de 5 segundos)
      if (initialProgress > 5) {
        videoRef.current.currentTime = initialProgress;
        setCurrentTime(initialProgress);
      }
      // Auto-guardar duración real si la DB tiene 0
      if (realDuration > 0 && lesson.duration === 0) {
        fetch("/api/lessons/duration", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lesson_id: lesson.id, duration_seconds: realDuration }),
        }).catch(() => {});
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

  async function saveNote() {
    if (!noteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lesson.id,
          text: noteText.trim(),
          timestamp_sec: Math.floor(currentTime),
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setNotes((prev) => [
          { id: saved.id, text: saved.text, timestamp: saved.timestamp_sec, createdAt: "Ahora" },
          ...prev,
        ]);
        setNoteText("");
      }
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/notes?id=${encodeURIComponent(noteId)}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
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
              onPause={handlePause}  // guarda posición al pausar
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
                      <p className="text-white/20 text-xs mt-2">Esta técnica aún no tiene video disponible</p>
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

          {/* Banner de error al guardar progreso */}
          {progressError && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/80 border border-white/10 text-white/70 text-xs px-3 py-1.5 rounded-full pointer-events-none">
              <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
              No se pudo guardar el progreso
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
                <Button variant="primary" size="sm" onClick={saveNote} disabled={savingNote}>
                  {savingNote ? "Guardando…" : "Guardar nota"}
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
                  <div key={note.id} className="px-4 py-3 border-b border-border-default group">
                    <div className="flex items-center justify-between">
                      <button
                        className="text-[10px] font-mono bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-sm hover:text-gold transition-colors"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime = note.timestamp;
                        }}
                      >
                        En {fmt(note.timestamp)}
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 transition-all"
                        onClick={() => deleteNote(note.id)}
                        aria-label="Borrar nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
