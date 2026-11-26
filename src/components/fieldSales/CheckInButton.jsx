// src/components/fieldSales/CheckInButton.jsx
// GPS Check-In & Check-Out with accuracy checking and manual note fallback

import React, { useState } from 'react';
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { GPS_ACCURACY_THRESHOLD_METERS } from '../../config/fieldSalesConfig';
import { writeAuditLog } from '../../firestoreService';

export default function CheckInButton({
  taskId,
  taskTitle = '',
  currentUser,
  checkInData = null,
  checkOutData = null,
  onCheckInSuccess,
  onCheckOutSuccess,
  disabled = false
}) {
  const [loading, setLoading] = useState(false);
  const [manualNotePrompt, setManualNotePrompt] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('checkin'); // 'checkin' | 'checkout'

  const hasCheckedIn = Boolean(checkInData?.timestamp);
  const hasCheckedOut = Boolean(checkOutData?.timestamp);

  const requestPosition = (actionType) => {
    setLoading(true);
    setErrorMsg('');
    setMode(actionType);

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setManualNotePrompt(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const timestamp = new Date().toISOString();
        const payload = {
          latitude,
          longitude,
          accuracy,
          timestamp,
          isManual: false
        };

        if (actionType === 'checkin') {
          if (onCheckInSuccess) onCheckInSuccess(payload);
          await writeAuditLog({
            actorId: currentUser?.id || currentUser?.uid,
            action: 'VISIT_GPS_CHECKIN',
            targetId: taskId,
            after: payload,
            reason: `GPS Check-in recorded at ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`
          });
        } else {
          if (onCheckOutSuccess) onCheckOutSuccess(payload);
          await writeAuditLog({
            actorId: currentUser?.id || currentUser?.uid,
            action: 'VISIT_GPS_CHECKOUT',
            targetId: taskId,
            after: payload,
            reason: `GPS Checkout recorded at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          });
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        setErrorMsg('GPS location access denied or timed out. Please enter a manual check-in note.');
        setManualNotePrompt(true);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualNote.trim()) return;

    const payload = {
      isManual: true,
      manualNote: manualNote.trim(),
      timestamp: new Date().toISOString()
    };

    if (mode === 'checkin') {
      if (onCheckInSuccess) onCheckInSuccess(payload);
      await writeAuditLog({
        actorId: currentUser?.id || currentUser?.uid,
        action: 'VISIT_MANUAL_CHECKIN',
        targetId: taskId,
        after: payload,
        reason: `Manual Check-in: ${manualNote.trim()}`
      });
    } else {
      if (onCheckOutSuccess) onCheckOutSuccess(payload);
      await writeAuditLog({
        actorId: currentUser?.id || currentUser?.uid,
        action: 'VISIT_MANUAL_CHECKOUT',
        targetId: taskId,
        after: payload,
        reason: `Manual Checkout: ${manualNote.trim()}`
      });
    }
    setManualNotePrompt(false);
    setManualNote('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Check-In Button / Status */}
        {!hasCheckedIn ? (
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => requestPosition('checkin')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-40 cursor-pointer"
          >
            {loading && mode === 'checkin' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            <span>GPS Check-In</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Checked In: {new Date(checkInData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {checkInData.latitude && (
              <a 
                href={`https://maps.google.com/?q=${checkInData.latitude},${checkInData.longitude}`} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] text-emerald-700 underline ml-1"
                title="View on Google Maps"
              >
                Map
              </a>
            )}
          </div>
        )}

        {/* Check-Out Button / Status */}
        {hasCheckedIn && !hasCheckedOut && (
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => requestPosition('checkout')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-40 cursor-pointer"
          >
            {loading && mode === 'checkout' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            <span>GPS Check-Out</span>
          </button>
        )}

        {hasCheckedOut && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Checked Out: {new Date(checkOutData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Manual Check-in note prompt modal/popover */}
      {manualNotePrompt && (
        <form onSubmit={handleManualSubmit} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Manual Location Note Required</span>
          </div>
          <p className="text-[11px] text-amber-700">
            GPS location was not captured. Provide reason/address note to record {mode === 'checkin' ? 'check-in' : 'checkout'}:
          </p>
          <input
            type="text"
            required
            placeholder="e.g. Inside basement godown, network offline..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            className="w-full h-8 px-2.5 bg-white border border-amber-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setManualNotePrompt(false)}
              className="px-2.5 py-1 text-slate-600 hover:bg-slate-200/50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!manualNote.trim()}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-40"
            >
              Save Manual {mode === 'checkin' ? 'Check-in' : 'Checkout'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

