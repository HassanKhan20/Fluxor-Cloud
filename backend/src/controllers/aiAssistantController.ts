// AI voice-assistant controller.
// Single endpoint: takes audio in, runs the full pipeline, returns
// a structured action result + (optionally) MP3 audio for the spoken reply.

import { Request, Response } from 'express';
import fs from 'fs';
import { getStoreId } from '../lib/storeContext';
import { prisma } from '../lib/prisma';
import {
    transcribeAudio,
    pickTool,
    executeTool,
    synthesizeSpeech,
} from '../services/aiAssistantService';

export const handleVoiceCommand = async (req: Request, res: Response) => {
    const storeId = await getStoreId(req);
    if (!storeId) return res.status(403).json({ message: 'No active store found' });
    const userId = (req as any).user?.userId ?? null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: 'Audio file is required (multipart field "audio")' });

    let cleanup = () => {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    };

    try {
        // 1. Transcribe with Groq Whisper
        const transcript = await transcribeAudio(file.path, file.mimetype || 'audio/webm');
        if (!transcript) {
            cleanup();
            return res.json({ transcript: '', speech: 'I did not catch that. Could you try again?', action: 'no_speech' });
        }

        // 2. Pick a tool with Groq Llama 3.3 — facility-aware so the model
        //    sees the right tool list (c-store queries vs kitchen logging)
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { facilityType: true }
        });
        const call = await pickTool(transcript, store?.facilityType ?? 'RETIREMENT_HOME');

        // 3. Execute against the database
        const result = await executeTool(storeId, userId, call);

        // 4. Optional ElevenLabs TTS
        let audioBase64: string | null = null;
        try {
            const audio = await synthesizeSpeech(result.speech);
            if (audio) audioBase64 = audio.toString('base64');
        } catch (err) {
            console.error('[Voice] TTS failed (non-fatal):', err);
        }

        cleanup();
        res.json({
            transcript,
            tool: call.name,
            args: call.args,
            speech: result.speech,
            action: result.action,
            data: result.data ?? null,
            audioBase64, // null = client should fall back to browser speech synth
        });
    } catch (err: any) {
        cleanup();
        console.error('[Voice] command failed:', err);
        res.status(500).json({ message: err?.message || 'Voice command failed' });
    }
};

// Quick health check — verifies which AI providers are configured
export const aiHealth = async (_req: Request, res: Response) => {
    res.json({
        groq: !!process.env.GROQ_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    });
};
