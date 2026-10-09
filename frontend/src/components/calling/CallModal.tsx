import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User, Building } from 'lucide-react';
import { api } from '../../services/api';

interface CallModalProps {
  call: {
    id?: string;
    bookingId?: string;
    shopId: string;
    receiverId?: string;
    receiverName?: string;
    receiverRole?: string;
    callerName?: string;
    callerRole?: string;
    isIncoming?: boolean;
  };
  onClose: () => void;
  onCallMissedOrUnhandled?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  call,
  onClose,
  onCallMissedOrUnhandled,
}) => {
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED' | 'ENDED'>(
    call.isIncoming ? 'RINGING' : 'RINGING'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  // Auto connect after 2 seconds if outgoing for instant demo responsiveness
  useEffect(() => {
    let timeout: any;
    if (!call.isIncoming && callState === 'RINGING') {
      timeout = setTimeout(() => {
        setCallState('CONNECTED');
      }, 2500);
    }
    return () => clearTimeout(timeout);
  }, [call.isIncoming, callState]);

  // If ringing for 15s and unanswered, trigger AI front desk
  useEffect(() => {
    let missedTimeout: any;
    if (callState === 'RINGING') {
      missedTimeout = setTimeout(() => {
        if (callState === 'RINGING') {
          handleEndCall('MISSED');
          if (onCallMissedOrUnhandled) {
            onCallMissedOrUnhandled();
          }
        }
      }, 12000);
    }
    return () => clearTimeout(missedTimeout);
  }, [callState]);

  // Duration timer
  useEffect(() => {
    let interval: any;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const handleAccept = async () => {
    setCallState('CONNECTED');
  };

  const handleEndCall = async (statusOverride = 'ENDED') => {
    setCallState('ENDED');
    if (call.id) {
      try {
        await api.post(`/calls/${call.id}/end`, {
          status: statusOverride,
          durationSeconds: duration,
        });
      } catch (e) {
        console.error(e);
      }
    }
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl text-white relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 mb-6">
            <Volume2 className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            <span>BayFlow In-App Voice Call (WebRTC)</span>
          </div>

          {/* Avatar representation */}
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center mb-4 ring-4 ring-slate-800 relative shadow-lg">
            <User className="w-12 h-12 text-white" />
            {callState === 'RINGING' && (
              <span className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-75" />
            )}
          </div>

          <h3 className="text-xl font-bold">
            {call.isIncoming ? call.callerName || 'Shop Service Advisor' : call.receiverName || 'Service Advisor / Customer'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 capitalize">
            {call.isIncoming ? `${call.callerRole || 'Shop Advisor'} is calling` : 'Direct dashboard audio line'}
          </p>

          {/* Call Status Badge */}
          <div className="my-6">
            {callState === 'RINGING' && (
              <div className="text-sm font-medium text-amber-400 animate-pulse flex items-center justify-center space-x-2">
                <span>Ringing...</span>
              </div>
            )}
            {callState === 'CONNECTED' && (
              <div className="text-xl font-mono font-bold text-emerald-400 flex items-center justify-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{formatDuration(duration)}</span>
              </div>
            )}
            {callState === 'ENDED' && (
              <div className="text-sm font-medium text-rose-400">Call Ended</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center space-x-4 pt-2">
            {call.isIncoming && callState === 'RINGING' ? (
              <>
                <button
                  onClick={() => handleEndCall('MISSED')}
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
                  title="Decline"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <button
                  onClick={handleAccept}
                  className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 animate-bounce"
                  title="Accept"
                >
                  <Phone className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                {callState === 'CONNECTED' && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isMuted
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}

                <button
                  onClick={() => handleEndCall('ENDED')}
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
