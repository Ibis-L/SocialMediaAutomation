"use client";

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username cannot exceed 20 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string(),
  role: z.enum(['Editor', 'News Writer', 'Publisher', 'Viewer/Reporter'], { required_error: 'Please select a role' })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'Viewer/Reporter' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    // Validate with Zod
    const result = registerSchema.safeParse(formData);
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
      await register(formData.username, formData.email, formData.password, formData.role);
      setIsSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to register account.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-brand-cream font-body py-10">
      <div className="w-full max-w-md bg-white p-8 rounded border border-brand-border shadow-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-brand-black mb-2">Create Account</h1>
          <p className="text-sm text-gray-500 font-inter">Join the News Portal dashboard</p>
        </div>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="mb-4 text-green-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-xl font-heading text-brand-black mb-2">Registration Successful</h2>
            <p className="text-sm text-gray-600 font-inter mb-6">
              Your account has been created and is currently pending administrator approval. You will be able to log in once an admin activates your account.
            </p>
            <Link href="/login" className="inline-block w-full px-6 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.2em] uppercase hover:bg-red-700 transition-colors">
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            {apiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded font-inter">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
                  placeholder="Choose a username"
                />
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
                  placeholder="Create a password"
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
                  placeholder="Repeat your password"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-black uppercase tracking-widest mb-1.5">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.role ? 'border-red-500' : 'border-gray-300'} rounded font-inter text-sm focus:outline-none focus:border-brand-gold`}
                >
                  <option value="Editor">Editor</option>
                  <option value="News Writer">News Writer</option>
                  <option value="Publisher">Publisher</option>
                  <option value="Viewer/Reporter">Viewer/Reporter</option>
                </select>
                {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.2em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating Account...' : 'Register'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-inter text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-red hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
