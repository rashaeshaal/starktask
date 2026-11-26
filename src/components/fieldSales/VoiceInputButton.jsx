// src/components/fieldSales/VoiceInputButton.jsx
// Hands-free Voice Input Microphone Button with Language Selector & Pulse Animation

import React, { useState } from 'react';
import { Mic, MicOff, Globe, AlertCircle, ChevronDown } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';

export default function VoiceInputButton({ onSpeechInput, disabled = false }) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const {
    isListening,
    startListening,
    stopListening,
    selectedLanguage,
    changeLanguage,
    availableLanguages,
    isSupported,
    error
  } = useVoiceInput((text) => {
    if (onSpeechInput && text) {
      onSpeechInput(text);
    }
  });

  if (!isSupported) {
    return (
      <span 
        className="p-1.5 text-slate-300 cursor-not-allowed inline-flex items-center" 
        title="Voice input not supported in this browser"
      >
        <MicOff className="w-4 h-4" />
      </span>
    );
  }

  const currentLangObj = availableLanguages.find(l => l.code === selectedLanguage) || availableLanguages[0];

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Mic Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isListening) stopListening();
          else startListening();
        }}
        aria-label={isListening ? "Stop voice listening" : "Start voice input"}
        title={isListening ? "Listening... Click to stop" : `Speak in ${currentLangObj.native}`}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
          isListening 
            ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse ring-2 ring-rose-400/40' 
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Mic className={`w-4 h-4 ${isListening ? 'text-rose-600' : ''}`} />
      </button>

      {/* Language Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLangMenu(prev => !prev)}
          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-slate-100 transition"
          title="Change dictation language"
        >
          <span>{currentLangObj.native}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showLangMenu && (
          <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Language
            </div>
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  changeLanguage(lang.code);
                  setShowLangMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                  selectedLanguage === lang.code ? 'font-bold text-[#05331F] bg-emerald-50/60' : 'text-slate-700'
                }`}
              >
                <span>{lang.native}</span>
                <span className="text-[10px] text-slate-400">{lang.code.slice(0, 2).toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error alert toast pop */}
      {error && (
        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 shadow-lg z-50 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

