'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ── Web Speech API minimal types ──────────────────────────────────────────────
// The Web Speech API has no official @types package for the webkit-prefixed
// variant.  We declare the subset this hook uses to avoid `any` while keeping
// the file lightweight.

interface SpeechRecognitionAlternative {
  readonly transcript: string
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  readonly [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error?: string
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const win = window as SpeechRecognitionWindow
  return win.SpeechRecognition ?? win.webkitSpeechRecognition
}

// ─────────────────────────────────────────────────────────────────────────────

interface UseSpeechRecognitionOptions {
  language?: string
  onResult?: (text: string) => void
  onError?: (error: string) => void
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  error: string | null
}

export function useSpeechRecognition({
  language = 'es-CO',
  onResult,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  // Lazy initializer: browser-support check runs once at mount, not inside an
  // effect, so we avoid triggering `react-hooks/set-state-in-effect`.
  const [error, setError] = useState<string | null>(() =>
    getSpeechRecognitionCtor() ? null : 'Speech Recognition no soportado en este navegador'
  )

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Callback refs: keep latest callback without re-creating the recognition instance.
  // When onResult/onError are inline functions in the parent, they get a new reference
  // every render. Without refs, the useEffect below would re-run on each parent render,
  // creating a new SpeechRecognition object and replacing recognitionRef.current while
  // a recording session might still be in progress.
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Create the SpeechRecognition instance only when language changes (not on every render).
  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionCtor()
    if (!SpeechRecognitionAPI) return // error already set by useState initializer

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      setTranscript('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
      onResultRef.current?.(text)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMsg = event.error ?? 'Error desconocido'
      setError(errorMsg)
      onErrorRef.current?.(errorMsg)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      // Null out handlers to prevent stale callbacks firing after cleanup
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      // Abort any in-progress session when language changes or component unmounts
      try {
        recognition.abort()
      } catch {
        // already stopped — ignore
      }
    }
  }, [language]) // Only language triggers recreation; callbacks use refs

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
  }
}
