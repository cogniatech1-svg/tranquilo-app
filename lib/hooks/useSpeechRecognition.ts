'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

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
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech Recognition no soportado en este navegador')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      setTranscript(text)
      onResult?.(text)
    }

    recognition.onerror = (event: any) => {
      const errorMsg = event.error || 'Error desconocido'
      setError(errorMsg)
      onError?.(errorMsg)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [language, onResult, onError])

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
