"use client";

import { useState } from 'react';
import { useAuth, api } from '@/providers/AuthProvider';
import Link from 'next/link';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Modal Backdrop ───
function ModalBackdrop({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

// ─── Self-Service Forgot Password Modal ───
function ForgotPasswordModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Enter OTP & New Password
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setError('Please enter your username or registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/password-reset/request-otp/', {
        email_or_username: identifier.trim(),
      });
      setSuccessMsg(res.data.message || 'OTP has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to send OTP. Please check your username/email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Change Password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/password-reset/verify-otp/', {
        email_or_username: identifier.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });
      onSuccess(res.data.message || 'Password reset successfully! Please sign in with your new password.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to reset password. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-white rounded border border-brand-border shadow-2xl p-6 sm:p-8 text-brand-black font-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h2 className="font-heading text-2xl font-semibold text-brand-black">
            {step === 1 ? 'Reset Your Password' : 'Enter Verification Code'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-brand-black transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 font-inter text-xs rounded">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 font-inter text-xs rounded">
            {successMsg}
          </div>
        )}

        {step === 1 ? (
          /* ── Step 1 Form ── */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-gray-500 font-inter text-xs leading-relaxed">
              Enter your username or registered email address. We will send a secure 6-digit verification code to your email.
            </p>

            <div>
              <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
                placeholder="e.g. yourname or name@example.com"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-100 text-brand-black rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send OTP'}
              </button>
            </div>
          </form>
        ) : (
          /* ── Step 2 Form ── */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-gray-500 font-inter text-xs leading-relaxed">
              Please enter the 6-digit verification code sent to your email and set your new password.
            </p>

            <div>
              <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => { setOtpCode(e.target.value); setError(''); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-label text-center tracking-[0.35em] text-lg text-brand-black focus:outline-none focus:border-brand-gold"
                placeholder="123456"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
                placeholder="Re-enter password"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="flex-1 py-2.5 bg-gray-100 text-brand-black rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalBackdrop>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessBanner('');
    
    // Validate with Zod
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors = {};
      result.error.issues.forEach((issue) => {
        formattedErrors[issue.path[0]] = issue.message;
      });
      setErrors(formattedErrors);
      return;
    }

    setIsLoading(true);
    try {
      await login(formData.username, formData.password);
    } catch (err) {
      setApiError(err.response?.data?.error || err.response?.data?.detail || 'Invalid credentials or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-brand-cream font-body p-4">
      <div className="w-full max-w-md bg-white p-8 rounded border border-brand-border shadow-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-brand-black mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-500 font-inter">Sign in to access the News Portal dashboard</p>
        </div>

        {successBanner && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded font-inter">
            {successBanner}
          </div>
        )}

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded font-inter">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest mb-1.5">
              Username or Email
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
              placeholder="Enter your username or email"
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest">
                Password
              </label>
              <button
                type="button"
                onClick={() => { setApiError(''); setShowForgotModal(true); }}
                className="text-xs text-brand-red hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
              placeholder="Enter your password"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.2em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-inter text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-red hover:underline">
            Register here
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotModal(false)}
          onSuccess={(msg) => setSuccessBanner(msg)}
        />
      )}
    </div>
  );
}
