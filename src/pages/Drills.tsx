import { useLocation } from 'wouter';
import { MAIN_DRILLS, DRILLS } from '@/data/drillRegistry';
import { motion } from 'framer-motion';
import { Play, Eye } from 'lucide-react';

export default function Drills() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-4">Available Drill Packs</h1>

        <section className="mb-8">
          <h2 className="text-sm text-white/40 mb-3">Featured (main)</h2>
          <div className="grid grid-cols-1 gap-3">
            {MAIN_DRILLS.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e] flex items-center justify-between">
                <div className="text-white">{d.label}</div>
                <div className="flex gap-2">
                  <button onClick={() => setLocation(`/drill-session/${d.id}`)} className="px-3 py-2 rounded-lg bg-[#00f5d4] text-[#0a0a1f] font-semibold">Start</button>
                  <button onClick={() => setLocation(`/watch-mode/${d.id}`)} className="px-3 py-2 rounded-lg bg-transparent border border-[#2a2a3e] text-white/70">Watch</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm text-white/40 mb-3">All drill packs</h2>
          <div className="grid grid-cols-1 gap-2">
            {DRILLS.map((d) => (
              <motion.div key={d.id} className="p-3 rounded-xl bg-[#0f1622] border border-[#1f2530] flex items-center justify-between">
                <div className="text-white/90">{d.label}</div>
                <div className="flex gap-2">
                  <button onClick={() => setLocation(`/drill-session/${d.id}`)} className="px-2 py-1 rounded bg-[#00f5d4]/10 text-[#00f5d4]"> <Play size={14} /> </button>
                  <button onClick={() => setLocation(`/watch-mode/${d.id}`)} className="px-2 py-1 rounded bg-transparent border border-[#2a2a3e] text-white/60"> <Eye size={14} /> </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
