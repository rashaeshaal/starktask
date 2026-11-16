import React, { useState } from 'react';
import { Building2, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginScreen() {
  const { login, register, resetPassword } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Director Operations');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        await register(email, password, {
          fullName,
          role,
          department: role === 'Director Operations' || role === 'General Manager' || role === 'Executive Director' ? 'management' : 'sales'
        });
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg(err.message.replace('Firebase: ', ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your official email address to receive a password reset link.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPassword(email);
      setSuccessMsg('Password reset instructions have been sent to your email.');
    } catch (err) {
      setErrorMsg(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 safe-pb safe-pt">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Company Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#05331F] text-white shadow-sm mb-1">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            SalesDoor Enterprise
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Employee Management & Task Portal
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegisterMode && (
            <>
              <div>
                <label className="block font-medium text-[#0F172A] mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajiv Mehra"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F172A] mb-1.5">
                  Initial Role / Designation
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
                >
                  <option value="Executive Director">Executive Director (Top Leadership)</option>
                  <option value="Director Operations">Director Operations (Operations Head)</option>
                  <option value="Operations Head">Operations Head</option>
                  <option value="QC Inspector">QC Inspector</option>
                  <option value="Warehouse In-charge">Warehouse In-charge</option>
                  <option value="Warehouse Supervisor">Warehouse Supervisor</option>
                  <option value="Loading Staff">Loading Staff</option>
                  <option value="Transport Manager">Transport Manager</option>
                  <option value="Accounts Manager">Accounts Manager</option>
                  <option value="Accountant">Accountant</option>
                  <option value="CSO">CSO (Chief Sales Officer)</option>
                  <option value="ASM">ASM</option>
                  <option value="Sales Coordinator">Sales Coordinator</option>
                  <option value="HR Manager">HR Manager</option>
                  <option value="Brand Manager">Brand Manager</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] mb-1.5">
              Official Company Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@starkdoors.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
              />
              <Mail className="w-4 h-4 text-[#64748B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-medium text-[#0F172A]">
                Password
              </label>
              {!isRegisterMode && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[11px] font-medium text-[#05331F] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#05331F] hover:bg-[#07472c] active:bg-[#032214] text-white font-medium py-2.5 px-4 rounded-xl shadow-xs transition duration-150 disabled:opacity-60 text-xs mt-3 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {isSubmitting
                ? 'Authenticating...'
                : isRegisterMode
                ? 'Create Account'
                : 'Sign In'}
            </span>
          </button>
        </form>

        {/* Small Bottom Registration Link */}
        <div className="text-center pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
          {isRegisterMode ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-semibold text-[#05331F] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New employee?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-semibold text-[#05331F] hover:underline cursor-pointer"
              >
                Register account
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
