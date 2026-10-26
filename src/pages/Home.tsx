import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Target,
  Trophy,
  Zap,
  Brain,
  BookOpen,
  History,
  ChevronRight,
  Play,
  Sparkles,
  Swords,
  LogOut,
  User,
  Settings,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { tap as hapticTap } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import ThemePicker from '@/components/ThemePicker';
import SoundPicker from '@/components/SoundPicker';
import { KINGDOM_VARIATION_SLOTS } from '@/data/kingdomSlots';
import { TIER_NAMES } from '@/types';
import { INTERIOR_CASTLE_SPOTS } from '@/data/interiorCastleSpots';

// Landing stats are computed from the game's own data modules at build
// time, so the page can never drift from the actual content again
// (Patch 45: it previously advertised 6 kingdoms / 26 variations).
const KINGDOM_COUNT = Object.values(KINGDOM_VARIATION_SLOTS).filter(
  (v) => v && v.length > 0,
).length;
const VARIATION_COUNT = Object.values(KINGDOM_VARIATION_SLOTS).reduce(
  (sum, v) => sum + (v?.length ?? 0),
  0,
);
const PRESTIGE_TIER_COUNT = Object.values(TIER_NAMES).filter(
  (name) => name !== 'Locked',
).length;

// The one web-weight derivative of Scott's Italy interior (Patch 46,
// approved scoped exception): full frame, faithfully resized — every
// section frames this same file with CSS, so the artwork's composition
// is never altered and it downloads exactly once.
const ITALY_ART = `${import.meta.env.BASE_URL}images/landing/italy-hero.webp`;

// Journey stops frame the map at each castle's REAL coordinates — the
// same data the game's interior uses (interiorCastleSpots.ts).
const italySpot = (variationId: string) =>
  INTERIOR_CASTLE_SPOTS.italian.find((s) => s.variationId === variationId) ?? { x: 50, y: 50 };

const FEATURES = [
  {
    icon: Map,
    title: 'Explore the Atlas',
    description:
      'Navigate a fantasy world map to discover chess opening kingdoms. Every opening stands at a real castle, from Castel Sant\'Angelo in Rome to Castel Nuovo in Naples.',
  },
  {
    icon: Target,
    title: 'Precision Drills',
    description:
      "Practice specific moves from the active opening repertoire. Get immediate feedback with the interactive chess board, and face deviation drills that punish the move you'd actually play, at your level.",
  },
  {
    icon: Trophy,
    title: 'Prestige System',
    description:
      'Progress from Novice to Master. Earn stars, build streaks, and watch your pieces evolve as you climb the ranks.',
  },
  {
    icon: BookOpen,
    title: 'Follow the Story',
    description:
      'A short film opens your journey. Clear an opening to unlock the next as the path winds from kingdom to kingdom — tactics and traps join the road as you earn them.',
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
    icon: Zap,
    stat: 'TACTICS',
    label: 'Tactical Variations',
    description:
      'Fifty named tactical variations — Traxler, Fried Liver, the Evans Gambit — each one a real idea from real games, woven into the story as you reach them.',
  },
  {
    icon: Swords,
    stat: 'LINES',
    label: 'Opening Recall',
    description:
      'Use active recall and immediate move feedback to rehearse the opening lines you choose.',
  },
  {
    icon: History,
    stat: 'TRACK',
    label: 'Progress That Persists',
    description:
      'Every position remembers your stars, streaks, and best runs — pick up exactly where you left off.',
  },
];

interface JourneyStop {
  title: string;
  place: string;
  body: string;
  /** Map framing (real castle coordinates) for this stop's art view. */
  spot: { x: number; y: number };
  zoom: number;
  film?: boolean;
}

const JOURNEY: JourneyStop[] = [
  {
    title: 'The Film',
    place: 'Before the first move',
    body: 'A short film opens the journey: principles before memorization. Every move either adds or subtracts, and the position — the sum, the difference — tells you what it is.',
    spot: { x: 20, y: 38 },
    zoom: 1.5,
    film: true,
  },
  {
    title: 'Giuoco Piano',
    place: 'Castel Sant\'Angelo, Rome',
    body: 'The quiet game. White builds, Black builds, and the first lesson is the supported break — the pawn push that arrives with help behind it.',
    spot: italySpot('giuoco-piano'),
    zoom: 2.6,
  },
  {
    title: 'The Road Opens',
    place: 'Two Knights — Castello di Fénis',
    body: 'The position sharpens. Down the side roads wait the Traxler and the Fried Liver, and here deviation drills join the journey — the moves you would actually play, answered at your level.',
    spot: italySpot('two-knights'),
    zoom: 2.6,
  },
  {
    title: 'The Capstone',
    place: 'Evans Gambit — Castel Nuovo, Naples',
    body: 'A pawn offered at a feast. The Evergreen Game grew from this offering, and Kasparov reached for it against Anand. Italy ends the way it should: with a gift that was never really one.',
    spot: italySpot('evans-gambit'),
    zoom: 2.6,
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Navigation with a faint haptic confirmation.
  const go = (path: string) => {
    hapticTap();
    setLocation(path);
  };

  // Lock body scroll while the settings modal is open so gestures don't
  // scroll the page behind the modal on touch devices.
  useEffect(() => {
    if (!showSettings) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showSettings]);

  return (
    <div className="lp-root min-h-screen lp-ink lp-parchment">
      {/* Navigation — fixed box-art identity (Patch 46) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#070713]/85 backdrop-blur-md border-b border-[#ece5d3]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Swords className="text-[#00f5d4]" size={24} />
              <span className="font-display text-base sm:text-lg font-bold tracking-wide whitespace-nowrap text-[#ece5d3]">Chess Horizon</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-4">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-[#ece5d3]/70 hover:text-white hover:bg-white/10 px-2 sm:px-4"
                onClick={() => go('/atlas')}
              >
                Atlas
              </Button>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-[#ece5d3]/70 hover:text-white hover:bg-white/10 px-2 sm:px-4"
                onClick={() => go('/kingdom/italian')}
              >
                Drill
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#ece5d3]/70 hover:text-white hover:bg-white/10"
                onClick={() => { hapticTap(); setShowSettings(true); }}
                aria-label="Settings"
              >
                <Settings size={18} />
              </Button>
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-[#ece5d3]/20">
                    <User size={14} className="text-[#00f5d4]" />
                    <span className="text-xs font-medium text-[#ece5d3]/70">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-[#ece5d3]/50 hover:text-red-400"
                  >
                    <LogOut size={16} />
                  </Button>
                </>
              ) : (
                <Button
                  className="bg-[#00d9b8] hover:bg-[#00c4a3] text-[#06231c] font-semibold px-3 sm:px-4 whitespace-nowrap"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero — the Italian interior, full frame (Patch 46) */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0" aria-hidden>
          <img
            src={ITALY_ART}
            alt=""
            className="kenburns w-full h-full object-cover"
            style={{ objectPosition: '50% 16%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070713]/70 via-[#070713]/25 to-[#070713]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070713]/55 via-transparent to-[#070713]/55" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#070713]/60 border border-[#ece5d3]/30 mb-6 backdrop-blur-sm"
          >
            <Sparkles size={16} className="text-[#00f5d4]" />
            <span className="text-sm text-[#ece5d3]">
              The story begins in Italy
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-[#ece5d3] mb-6 leading-tight"
            style={{ textShadow: '0 2px 30px rgba(7,7,19,0.9)' }}
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
            className="text-lg sm:text-xl text-[#ece5d3]/80 max-w-2xl mx-auto mb-10"
            style={{ textShadow: '0 1px 16px rgba(7,7,19,0.9)' }}
          >
            Explore a fantasy world of chess openings. Follow the story from
            the gates of Italy, drill moves, earn stars, and rise from Novice
            to Master.
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
              className="bg-[#00d9b8] hover:bg-[#00c4a3] text-[#06231c] text-lg px-8 py-6 font-semibold group"
              onClick={() => go('/atlas')}
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
              className="border-[#ece5d3]/40 text-[#ece5d3] hover:bg-white/10 text-lg px-8 py-6 bg-[#070713]/40"
              onClick={() => go('/kingdom/italian')}
            >
              Start Drilling
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-10"
          initial={{ x: '-50%' }}
          animate={{ y: [0, 8, 0], x: '-50%' }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-[#ece5d3]/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-[#ece5d3]/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Milestones — the stats, as markers on the road (data-derived) */}
      <section id="milestones" className="relative py-14 lp-ink">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute left-[16%] right-[16%] top-[7px] h-px bg-gradient-to-r from-transparent via-[#ece5d3]/35 to-transparent" aria-hidden />
            <div className="flex items-start justify-between text-center">
              {[
                { value: KINGDOM_COUNT, label: 'Kingdoms' },
                { value: VARIATION_COUNT, label: 'Variations' },
                { value: PRESTIGE_TIER_COUNT, label: 'Prestige Tiers' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex-1"
                >
                  <div className="mx-auto w-[15px] h-[15px] rounded-full bg-[#070713] border-2 border-[#00f5d4] relative z-10" />
                  <div className="font-display text-3xl sm:text-4xl font-bold text-[#ece5d3] mt-4">{stat.value}</div>
                  <div className="text-sm text-[#ece5d3]/55 tracking-wide">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Journey — the story, told in places (Patch 46 centerpiece) */}
      <section id="journey" className="relative py-24 lp-ink overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#ece5d3] mb-4">
              The <span className="neon-text-teal">Journey</span>
            </h2>
            <p className="text-[#ece5d3]/55 max-w-2xl mx-auto">
              One road through Italy, four stops — each at the real castle
              where its opening stands in the game.
            </p>
          </motion.div>

          <div className="relative">
            {/* The road */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px origin-top bg-gradient-to-b from-[#00f5d4]/50 via-[#ece5d3]/25 to-[#00f5d4]/50"
              aria-hidden
            />
            <div className="space-y-20">
              {JOURNEY.map((stop, i) => (
                <motion.div
                  key={stop.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55 }}
                  className={`relative flex flex-col sm:flex-row gap-8 sm:gap-14 pl-12 sm:pl-0 ${
                    i % 2 === 1 ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  {/* Stop marker */}
                  <div className="absolute left-4 sm:left-1/2 top-8 -translate-x-1/2 w-4 h-4 rounded-full bg-[#070713] border-2 border-[#00f5d4] z-10" aria-hidden />
                  {/* Art frame: the same full map, framed at the castle */}
                  <div className="sm:w-1/2">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#ece5d3]/20 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${ITALY_ART})`,
                          backgroundSize: `${stop.zoom * 100}%`,
                          backgroundPosition: `${stop.spot.x}% ${stop.spot.y}%`,
                        }}
                        aria-hidden
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070713]/45 to-transparent" aria-hidden />
                      {stop.film && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-[#070713]/70 border border-[#ece5d3]/40 backdrop-blur-sm flex items-center justify-center">
                            <Play size={26} className="text-[#ece5d3] ml-1" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#070713]/80 border border-[#ece5d3]/25 text-[11px] tracking-wide text-[#ece5d3]">
                        {stop.place}
                      </div>
                    </div>
                  </div>
                  {/* Words */}
                  <div className="sm:w-1/2 flex flex-col justify-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#00f5d4]/80 mb-2">
                      Stop {i + 1}
                    </p>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#ece5d3] mb-3">
                      {stop.title}
                    </h3>
                    <p className="text-[#ece5d3]/65 leading-relaxed max-w-md">
                      {stop.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lp-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#ece5d3] mb-4">
              Everything You Need to
              <span className="neon-text-teal"> Master Openings</span>
            </h2>
            <p className="text-[#ece5d3]/55 max-w-2xl mx-auto">
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
                className="p-6 rounded-2xl lp-panel hover:border-[#00f5d4]/40 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center mb-4">
                  <feature.icon className="text-[#00f5d4]" size={24} />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#ece5d3] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#ece5d3]/55 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice design */}
      <section className="relative py-24 bg-[#0a0a1e] overflow-hidden">
        {/* A faint strip of the Italy art along the band's top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-20 opacity-25"
          style={{
            backgroundImage: `url(${ITALY_ART})`,
            backgroundSize: '100%',
            backgroundPosition: '50% 96%',
          }}
          aria-hidden
        />
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-[#0a0a1e]" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#ece5d3] mb-4">
              Built for{' '}
              <span className="neon-text-teal">Focused Practice</span>
            </h2>
            <p className="text-[#ece5d3]/55 max-w-2xl mx-auto">
              Our approach combines deliberate practice, real tactics, and
              progress you can see into a structured opening-training loop.
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
                className="p-6 rounded-2xl lp-panel text-center group hover:border-[#00f5d4]/40 transition-colors"
              >
                <div className="font-display text-4xl font-bold text-[#00f5d4] mb-2">
                  {benefit.stat}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="text-[#00f5d4]" size={24} />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#ece5d3] mb-2">
                  {benefit.label}
                </h3>
                <p className="text-sm text-[#ece5d3]/55 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — over the map's south (Naples → Andria) */}
      <section id="journey" className="relative py-24 lp-ink overflow-hidden">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `url(${ITALY_ART})`,
            backgroundSize: '160%',
            backgroundPosition: '62% 88%',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070713] via-[#070713]/55 to-[#070713]" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl lp-panel backdrop-blur-[2px]"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#ece5d3] mb-4">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-[#ece5d3]/65 mb-8 max-w-xl mx-auto">
              Enter the Atlas and start exploring the Italian Kingdom — your
              journey begins with a short film, and a single move.
            </p>
            <Button
              size="lg"
              className="bg-[#00d9b8] hover:bg-[#00c4a3] text-[#06231c] text-lg px-10 py-6 font-semibold"
              onClick={() => go('/atlas')}
            >
              Explore the Atlas
              <ChevronRight size={20} />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#05050e] border-t border-[#ece5d3]/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Swords className="text-[#00f5d4]" size={20} />
              <span className="font-display font-semibold text-[#ece5d3]">Chess Horizon</span>
            </div>
            <p className="text-sm text-[#ece5d3]/40">
              Master openings, one move at a time.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex overflow-y-auto bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md m-auto rounded-2xl th-panel border th-border p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Close settings"
                >
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Board Theme</h3>
              <ThemePicker />
              <div className="mt-6 pt-6 border-t th-border">
                <h3 className="text-sm font-semibold text-white/70 mb-3">Sound</h3>
                <SoundPicker />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
