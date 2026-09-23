import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Please enter a username');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, username);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        await signIn(email, password);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a1f] border border-[#00f5d4]/30 rounded-2xl p-8 max-w-md w-full shadow-[0_0_80px_rgba(0,245,212,0.15)]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'signin' ? 'Welcome Back' : 'Join the Journey'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="text-4xl mb-3">✅</div>
                <p className="text-[#00f5d4] font-semibold mb-1">Account created!</p>
                <p className="text-sm text-white/50">Welcome to Chess Horizon</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white placeholder-white/30 focus:border-[#00f5d4]/50 focus:outline-none transition-colors"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Username</label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3 top-3 text-white/30" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Your player name"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white placeholder-white/30 focus:border-[#00f5d4]/50 focus:outline-none transition-colors"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-white/60 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-white/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#141422] border border-[#2a2a3e] text-white placeholder-white/30 focus:border-[#00f5d4]/50 focus:outline-none transition-colors"
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f5d4] to-[#00c4aa] text-[#0a0a1f] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : mode === 'signin' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2a2a3e]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#0a0a1f] text-white/40">
                      {mode === 'signin' ? 'New here?' : 'Already have an account?'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#2a2a3e] text-white/70 hover:text-[#00f5d4] hover:border-[#00f5d4]/30 transition-colors font-medium"
                >
                  {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
