// Floating voice-assistant button.
// Press-and-hold to record. Sends audio to /api/ai-assistant/voice (Groq
// Whisper → Llama 3.3 → ElevenLabs). Plays back the spoken reply, shows
// a small toast for visual confirmation.

import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, Volume2, X } from 'lucide-react';
import { API_URL } from '@/lib/api';

type Phase = 'idle' | 'recording' | 'processing' | 'replying' | 'error';

interface Citation {
    saleId: string;
    productId?: string;
    dateTime: string;
    amount: number;
}

interface Reply {
    transcript: string;
    speech: string;
    action: string;
    audioBase64: string | null;
    data?: any;
}

export default function VoiceAssistant() {
    const [phase, setPhase] = useState<Phase>('idle');
    const [last, setLast] = useState<Reply | null>(null);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [available, setAvailable] = useState<boolean | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioElRef = useRef<HTMLAudioElement | null>(null);

    // Probe availability on mount. Only show the mic once we know GROQ
    // is configured server-side — avoids a flashing button on first paint.
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setAvailable(false); return; }
        fetch(`${API_URL}/ai-assistant/health`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async r => {
                if (!r.ok) {
                    console.warn('[VoiceAssistant] health endpoint returned', r.status, '— backend likely not redeployed with /api/ai-assistant routes yet');
                    return null;
                }
                return r.json();
            })
            .then(d => {
                if (!d) { setAvailable(false); return; }
                if (!d.groq) {
                    console.warn('[VoiceAssistant] hidden — GROQ_API_KEY is not set on the backend. Add it on your backend host (Render/Railway) → Environment Variables.');
                }
                setAvailable(!!d?.groq);
            })
            .catch(err => {
                console.warn('[VoiceAssistant] health check failed:', err?.message || err, '— backend may be down or the new /api/ai-assistant routes are not deployed yet');
                setAvailable(false);
            });
    }, []);

    async function startRecording() {
        if (phase !== 'idle') return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: pickMime() });
            chunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = handleStop;
            recorderRef.current = recorder;
            recorder.start();
            setPhase('recording');
        } catch {
            setErrorText('Microphone permission denied');
            setPhase('error');
            setTimeout(() => { setErrorText(null); setPhase('idle'); }, 2500);
        }
    }

    function stopRecording() {
        const r = recorderRef.current;
        if (r && r.state === 'recording') {
            r.stop();
            r.stream.getTracks().forEach(t => t.stop());
        }
    }

    async function handleStop() {
        setPhase('processing');
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
        if (blob.size < 500) {
            setPhase('idle');
            return;
        }

        const form = new FormData();
        form.append('audio', blob, 'voice.webm');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_URL}/ai-assistant/voice`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            if (!res.ok) throw new Error(`Voice command failed (${res.status})`);
            const data = (await res.json()) as Reply;
            setLast(data);
            setPhase('replying');

            // Prefer ElevenLabs audio; fall back to browser speech synth
            if (data.audioBase64) {
                const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
                audioElRef.current = audio;
                audio.onended = () => setPhase('idle');
                audio.onerror = () => setPhase('idle');
                audio.play().catch(() => setPhase('idle'));
            } else if ('speechSynthesis' in window && data.speech) {
                const u = new SpeechSynthesisUtterance(data.speech);
                u.rate = 1.05;
                u.pitch = 1.0;
                u.onend = () => setPhase('idle');
                speechSynthesis.speak(u);
            } else {
                setTimeout(() => setPhase('idle'), 2000);
            }
        } catch (e: any) {
            setErrorText(e.message || 'Failed to process command');
            setPhase('error');
            setTimeout(() => { setErrorText(null); setPhase('idle'); }, 3000);
        }
    }

    function dismissReply() {
        if (audioElRef.current) {
            audioElRef.current.pause();
            audioElRef.current = null;
        }
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        setLast(null);
        setPhase('idle');
    }

    // Only render once we have a positive yes — kills the flash-and-disappear
    if (available !== true) return null;

    return (
        <>
            {/* Reply card — shows transcript and reply.
                On phones, anchor to both edges so it never overflows the viewport. */}
            {(phase === 'replying' || (phase === 'idle' && last)) && last && (
                <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-50 sm:max-w-sm animate-fade-in">
                    <div className="bg-white border border-emerald-200 rounded-2xl shadow-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-emerald-700">
                                <Volume2 className="w-3 h-3" /> Assistant
                            </div>
                            <button onClick={dismissReply} className="text-ink-400 hover:text-ink-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {last.transcript && (
                            <div className="text-[12px] text-ink-500 italic mb-2">"{last.transcript}"</div>
                        )}
                        <div className="text-[14px] text-ink-900 font-medium leading-snug">{last.speech}</div>

                        {/* Citations — every c-store query returns transaction IDs.
                            Showing them is the trust moat: the answer above is grounded in these rows. */}
                        {(() => {
                            const citations = collectCitations(last.data);
                            if (citations.length === 0) return null;
                            return (
                                <div className="mt-3 pt-2.5 border-t border-emerald-100">
                                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-700 mb-1.5">
                                        Based on {citations.length} transaction{citations.length === 1 ? '' : 's'}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {citations.slice(0, 6).map(c => (
                                            <div key={c.saleId + (c.productId || '')} className="flex items-center justify-between text-[11px] text-ink-600 font-mono">
                                                <span>{new Date(c.dateTime).toLocaleDateString()} · {c.saleId.slice(0, 8)}</span>
                                                <span className="text-ink-900 font-semibold">${c.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {citations.length > 6 && (
                                            <div className="text-[10.5px] text-ink-400 italic">+ {citations.length - 6} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Error toast */}
            {errorText && (
                <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-50 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3.5 py-2.5 text-[13px] font-medium shadow-lg">
                    {errorText}
                </div>
            )}

            {/* Mic button */}
            <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => phase === 'recording' && stopRecording()}
                onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                disabled={phase === 'processing'}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl transition-all flex items-center justify-center select-none ${
                    phase === 'recording'
                        ? 'bg-rose-600 text-white scale-110 shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse'
                        : phase === 'processing'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105'
                }`}
                aria-label={phase === 'recording' ? 'Stop recording' : 'Hold to talk'}
                title={phase === 'idle' ? 'Hold to talk to Fluxor' : ''}
            >
                {phase === 'processing' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>

            {/* Subtle hint label that fades out */}
            {phase === 'idle' && available === true && !last && (
                <div className="fixed bottom-7 right-24 z-40 hidden sm:block bg-ink-900/85 text-white text-[11px] font-medium px-2.5 py-1 rounded-md backdrop-blur-sm pointer-events-none animate-fade-in">
                    Hold to talk
                </div>
            )}
        </>
    );
}

function pickMime(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const c of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
    }
    return 'audio/webm';
}

// Pull transaction-id citations out of any c-store tool response. Each
// c-store tool either returns `data.citations` directly (revenue summary)
// or a `data.results[]` where each result has its own citations[].
function collectCitations(data: any): Citation[] {
    if (!data) return [];
    const out: Citation[] = [];
    if (Array.isArray(data.citations)) {
        for (const c of data.citations) if (c?.saleId) out.push(c);
    }
    if (Array.isArray(data.results)) {
        for (const r of data.results) {
            if (Array.isArray(r?.citations)) {
                for (const c of r.citations) if (c?.saleId) out.push(c);
            }
        }
    }
    // Dedupe by saleId+productId (a single sale can be cited twice across results)
    const seen = new Set<string>();
    return out.filter(c => {
        const k = c.saleId + '|' + (c.productId || '');
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}
