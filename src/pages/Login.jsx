import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, Mail, Lock, AlertCircle, User, Building2, UserCircle } from 'lucide-react';
import { getFirebaseAuthErrorMessage } from '../utils/firebaseError';

export default function Login() {
  const [activeTab, setActiveTab] = useState('customer');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (isSignUp && password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (isSignUp && !displayName.trim()) {
      return setError('Please enter a username');
    }

    try {
      setError('');
      setLoading(true);

      if (activeTab === 'provider' && isSignUp) {
        navigate('/provider/register', { state: { email, password, displayName } });
        return;
      }

      if (isSignUp) {
        await signup(email, password, displayName);
        navigate('/');
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl shadow-lg shadow-teal-600/20 mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ParkEase Kenya</h1>
          <p className="text-gray-500 text-sm mt-1">Find and reserve parking before you arrive</p>
        </div>

        {/* Role Tab Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
          <button
            onClick={() => { setActiveTab('customer'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'customer'
              ? 'bg-white text-teal-700 shadow-card'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <User className="w-4 h-4" />
            Customer
          </button>
          <button
            onClick={() => { setActiveTab('provider'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'provider'
              ? 'bg-white text-teal-700 shadow-card'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Building2 className="w-4 h-4" />
            Provider
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            {activeTab === 'provider'
              ? isSignUp ? 'Register as a parking provider' : 'Sign in to your provider dashboard'
              : isSignUp ? 'Sign up to start booking parking' : 'Sign in to find parking near you'
            }
          </p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-4 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-900 placeholder-gray-400"
                    placeholder="e.g. johndoe"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-900 placeholder-gray-400"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading
                ? 'Please wait...'
                : isSignUp
                  ? (activeTab === 'provider' ? 'Continue to Registration →' : 'Create Account')
                  : 'Sign In'
              }
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-teal-600 hover:text-teal-700 font-medium text-sm transition"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}