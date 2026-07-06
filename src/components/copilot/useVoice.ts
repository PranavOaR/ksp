'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceLanguage = 'en-IN' | 'kn-IN';

/** Minimal typings for the Web Speech API (not in lib.dom for all targets). */
interface SpeechRecognitionResultChunk {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultChunk>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidates = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidates.SpeechRecognition ?? candidates.webkitSpeechRecognition ?? null;
}

const RECOGNITION_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':
    'Microphone access was blocked. Click the lock/mic icon in the address bar and allow the microphone, then try again.',
  'service-not-allowed': 'Speech recognition service is blocked by the browser.',
  'no-speech': 'No speech detected — tap the mic and speak clearly.',
  'audio-capture': 'No microphone found. Connect a microphone and try again.',
  network: 'Speech recognition needs an internet connection (the browser sends audio to its speech service).',
  'language-not-supported':
    'This browser does not support speech recognition for the selected language. Chrome supports both English and Kannada.',
  aborted: '',
};

export interface VoiceControls {
  isSupported: boolean;
  isListening: boolean;
  /** Live transcript while speaking; final transcript is delivered via onFinal. */
  interimTranscript: string;
  /** Human-readable reason the last recognition attempt failed, if any. */
  recognitionError: string | null;
  /** True once the browser reports an installed Kannada text-to-speech voice. */
  hasKannadaVoice: boolean;
  startListening(language: VoiceLanguage): void;
  stopListening(): void;
  /** Returns false when no voice for the requested language exists in this browser. */
  speak(text: string, language: VoiceLanguage): boolean;
  stopSpeaking(): void;
}

/**
 * Voice interface (PRD A4): speech-to-text via the browser's SpeechRecognition
 * (Chrome/Edge; supports en-IN and kn-IN) and text-to-speech via speechSynthesis.
 */
export function useVoice(onFinal: (transcript: string) => void): VoiceControls {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  // Resolved after mount so SSR and first client render agree (no hydration mismatch)
  const [isSupported, setIsSupported] = useState(false);
  const [hasKannadaVoice, setHasKannadaVoice] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setIsSupported(getRecognitionConstructor() !== null);

    // speechSynthesis voices load asynchronously in Chrome
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return;
    const loadVoices = () => {
      voicesRef.current = synth.getVoices();
      setHasKannadaVoice(voicesRef.current.some((voice) => voice.lang.toLowerCase().startsWith('kn')));
    };
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    return () => synth.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback((language: VoiceLanguage) => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setRecognitionError('Voice input is not supported in this browser — use Chrome or Edge.');
      return;
    }

    recognitionRef.current?.abort();
    setRecognitionError(null);
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i];
        if (chunk.isFinal) final += chunk[0].transcript;
        else interim += chunk[0].transcript;
      }
      if (interim) setInterimTranscript(interim);
      if (final.trim()) {
        setInterimTranscript('');
        onFinalRef.current(final.trim());
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };
    recognition.onerror = (event) => {
      const message =
        RECOGNITION_ERROR_MESSAGES[event.error] ?? `Voice recognition failed (${event.error}).`;
      if (message) setRecognitionError(message);
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setRecognitionError('Could not start the microphone. Reload the page and try again.');
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text: string, language: VoiceLanguage): boolean => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    const prefix = language.slice(0, 2).toLowerCase();
    const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
    const match =
      voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase()) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
    if (!match) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = match;
    utterance.lang = match.lang;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    },
    []
  );

  return {
    isSupported,
    isListening,
    interimTranscript,
    recognitionError,
    hasKannadaVoice,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
