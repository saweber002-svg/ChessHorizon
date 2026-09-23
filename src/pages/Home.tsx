import { motion } from 'framer-motion';
import {
  Map,
  Target,
  Trophy,
  Zap,
  Brain,
  ChevronRight,
  Sparkles,
  Swords,
  Globe,
  LogOut,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';

const FEATURES = [
  {
    icon: Map,
    title: 'Explore the Atlas',
    description:
      'Navigate a fantasy world map to discover chess opening kingdoms. Pinch, zoom, and pan your way through uncharted territories.',
  },
  {
    icon: Target,
    title: 'Precision Drills',
    description:
      'Practice specific moves from the active opening repertoire. Get immediate feedback with the interactive chess board.',
  },
  {
    icon: Trophy,
    title: 'Prestige System',
    description:
      'Progress from Novice to Master. Earn stars, build streaks, and watch your pieces evolve as you climb the ranks.',
  },
  {
    icon: Zap,
    title: 'Spaced Repetition',
    description:
      'Our intelligent system tracks when you last drilled each position, optimizing your learning schedule.',
  },
];

const BENEFITS = [
  {
    icon: Brain,
    stat: 'FOCUS',
    label: 'Pattern Recognition',
    description:
      'Return to specific positions and opening ideas to build focused pattern-recognition practice.',
  },
  {
    icon: Swords,
    stat: 'LINES',
    label: 'Opening Recall',
    description:
      'Use active recall and immediate move feedback to rehearse the opening lines you choose.',
  },
  {
    icon: Sparkles,
    stat: 'PLAY',
    label: 'Engaged Practice',
    description:
      'A narrative map, progress milestones, and trophies keep practice organized and visible.',
  },
  {
    icon: Globe,
    stat: 'ATLAS',
    label: 'Kingdom Repertoire',
    description:
      'Explore opening variations through the Atlas and progress through the available kingdoms step by step.',
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1f]/80 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Swords className="text-[#00f5d4]" size={24} />
              <span className="text-lg font-bold text-white">Chess Horizon</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation('/atlas')}
              >
                Atlas
              </Button>
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation('/drill/italian/giuoco-piano/0')}
              >
                Drill
              </Button>
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#141422] border border-[#2a2a3e]">
                    <User size={14} className="text-[#00f5d4]" />
                    <span className="text-xs font-medium text-white/70">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-white/50 hover:text-red-400"
                  >
                    <LogOut size={16} />
                  </Button>
                </>
              ) : (
                <Button
                  className="bg-[#00f5d4] text-[#0a0a1f] hover:bg-[#00f5d4]/90"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Aurora Background */}
        <div className="absolute inset-0 aurora-bg" />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#00f5d4]/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="relative w-64 h-40 mx-auto rounded-2xl overflow-hidden border border-[#00f5d4]/20 shadow-2xl">
              <img
                src={`${import.meta.env.BASE_URL}images/hero.jpg`}
                alt="Chess Horizon"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1f]/60 to-transparent" />
            </div>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00f5d4]/10 border border-[#00f5d4]/20 mb-6"
          >
            <Sparkles size={16} className="text-[#00f5d4]" />
            <span className="text-sm text-[#00f5d4]">
              Active Opening Repertoire Across the Atlas
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Master Chess
            <br />
            <span className="neon-text-teal">Openings</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10"
          >
            Explore a fantasy world of chess openings. Drill moves, earn stars,
            build streaks, and rise from Novice to Master.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-[#00f5d4] text-[#0a0a1f] hover:bg-[#00f5d4]/90 text-lg px-8 py-6 font-semibold group"
              onClick={() => setLocation('/atlas')}
            >
              Enter the Atlas
              <ChevronRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-[#2a2a3e] text-white hover:bg-white/5 text-lg px-8 py-6"
              onClick={() => setLocation('/drill/italian/giuoco-piano/0')}
            >
              Start Drilling
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex items-center justify-center gap-8 sm:gap-12 mt-16"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">6</div>
              <div className="text-sm text-white/50">Kingdoms</div>
            </div>
            <div className="w-px h-10 bg-[#2a2a3e]" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">26</div>
              <div className="text-sm text-white/50">Variations</div>
            </div>
            <div className="w-px h-10 bg-[#2a2a3e]" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">4</div>
              <div className="text-sm text-white/50">Prestige Tiers</div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#0a0a1f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to
              <span className="neon-text-teal"> Master Openings</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              A complete training system designed to help you learn and retain
              chess opening patterns through deliberate practice.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] hover:border-[#00f5d4]/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center mb-4 group-hover:bg-[#00f5d4]/20 transition-colors">
                  <feature.icon className="text-[#00f5d4]" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice design */}
      <section className="py-24 bg-[#0c0c24]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for{' '}
              <span className="neon-text-teal">Focused Practice</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Our approach combines spaced repetition, deliberate practice, and
              gamification into a structured opening-training loop.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((benefit, index) => (
              <motion.div
                key={benefit.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] text-center group hover:border-[#00f5d4]/30 transition-colors"
              >
                <div className="text-4xl font-bold text-[#00f5d4] mb-2">
                  {benefit.stat}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="text-[#00f5d4]" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {benefit.label}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#0a0a1f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-br from-[#141422] to-[#1a1a2e] border border-[#2a2a3e]"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-white/50 mb-8 max-w-xl mx-auto">
              Enter the Atlas and start exploring the Italian Kingdom. Your
              opening mastery journey begins with a single move.
            </p>
            <Button
              size="lg"
              className="bg-[#00f5d4] text-[#0a0a1f] hover:bg-[#00f5d4]/90 text-lg px-10 py-6 font-semibold"
              onClick={() => setLocation('/atlas')}
            >
              Explore the Atlas
              <ChevronRight size={20} />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#080818] border-t border-[#2a2a3e]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Swords className="text-[#00f5d4]" size={20} />
              <span className="font-semibold text-white">Chess Horizon</span>
            </div>
            <p className="text-sm text-white/40">
              Master openings, one move at a time.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
