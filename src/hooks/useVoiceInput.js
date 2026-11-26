// src/hooks/useVoiceInput.js
// Custom hook for Web Speech API with multilingual support and graceful fallbacks

import { useState, useEffect, useRef, useCallback } from 'react';
import { VOICE_LANGUAGES, DEFAULT_VOICE_LANGUAGE } from '../config/fieldSalesConfig';

export function useVoiceInput(onResultCallback = null) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('stark_voice_lang') || DEFAULT_VOICE_LANGUAGE;
  });
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (onResultCallback) {
          onResultCallback(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else {
          setError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      setIsSupported(false);
      setError('Voice recognition initialization failed: ' + err.message);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [selectedLanguage, onResultCallback]);

  const changeLanguage = useCallback((langCode) => {
    setSelectedLanguage(langCode);
    localStorage.setItem('stark_voice_lang', langCode);
    if (recognitionRef.current) {
      recognitionRef.current.lang = langCode;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    setError(null);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.lang = selectedLanguage;
        recognitionRef.current.start();
      }
    } catch (err) {
      console.warn('Recognition start warning:', err);
    }
  }, [isSupported, selectedLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    selectedLanguage,
    changeLanguage,
    availableLanguages: VOICE_LANGUAGES,
    isSupported,
    error,
    startListening,
    stopListening
  };
}

