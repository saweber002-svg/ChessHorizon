import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Swords,
  TreePine,
  ChevronRight,
  BookOpen,
  Clock,
  Save,
  X,
  GripVertical,
  Play,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useWilderness } from '@/contexts/WildernessContext';
import type { CustomOpening } from '@/types';

export default function Wilderness() {
  const [, setLocation] = useLocation();
  const { openings, addOpening, deleteOpening, updateVariationMoves } = useWilderness();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingOpening, setEditingOpening] = useState<CustomOpening | null>(null);
  const [editMoves, setEditMoves] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const created = addOpening(newName.trim(), newDesc.trim() || 'Custom opening created by you.');
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
    setEditingOpening(created);
    if (created.variations[0]) {
      setEditMoves(created.variations[0].moves.join(' '));
    }
  };

  const handleSaveMoves = () => {
    if (!editingOpening) return;
    const moves = editMoves.trim().split(/\s+/).filter(Boolean);
    updateVariationMoves(editingOpening.id, 'main', moves);
    setEditingOpening(null);
  };

  const handleEditOpening = (opening: CustomOpening) => {
    setEditingOpening(opening);
    const mainVar = opening.variations[0];
    if (mainVar) {
      setEditMoves(mainVar.moves.join(' '));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setLocation('/atlas')} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} className="text-white/60" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <TreePine size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white">The Wilderness</h1>
                  <p className="text-xs text-white/40">Community Openings</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <Plus size={16} />
              Create Opening
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]"
        >
          <p className="text-sm text-white/50">
            The Wilderness is where the community shares and explores custom chess openings.
            Create your own opening sequences, share them with others, and drill them just like
            the official kingdom openings.
          </p>
        </motion.div>

        {/* Openings List */}
        {openings.length === 0 ? (
          <div className="text-center py-16">
            <TreePine size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 mb-4">No custom openings yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
            >
              Create Your First Opening
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {openings.map((opening, index) => {
              const totalMoves = opening.variations.reduce((sum, v) => sum + v.moves.length, 0);
              return (
                <motion.div
                  key={opening.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e] hover:border-emerald-500/20 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white mb-1">{opening.name}</h3>
                      <p className="text-sm text-white/40 mb-3">{opening.description}</p>
                      <div className="flex items-center gap-4 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} />
                          {opening.variations.length} variation{opening.variations.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Swords size={12} />
                          {totalMoves} moves
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(opening.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleEditOpening(opening)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-emerald-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this opening?')) {
                            deleteOpening(opening.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setLocation(`/drill/${opening.id}/main/0`)}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Drill"
                      >
                        <Play size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Variations */}
                  <div className="mt-3 space-y-1">
                    {opening.variations.map((variation) => (
                      <div
                        key={variation.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] cursor-pointer hover:border-[#00f5d4]/20 transition-colors"
                        onClick={() => setLocation(`/drill/${opening.id}/${variation.id}/0`)}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-white/20" />
                          <span className="text-sm text-white/70">{variation.name}</span>
                          <span className="text-xs text-white/30">{variation.moves.length} moves</span>
                        </div>
                        <ChevronRight size={14} className="text-white/20" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Opening Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#141422] border border-[#2a2a3e] rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Create Opening</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <X size={18} className="text-white/40" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Opening Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., My Secret Gambit"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Description (optional)</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Describe your opening..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-[#0a0a1f] font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Create Opening
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Moves Modal */}
      <AnimatePresence>
        {editingOpening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditingOpening(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#141422] border border-[#2a2a3e] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Moves</h2>
                  <p className="text-sm text-white/40">{editingOpening.name}</p>
                </div>
                <button onClick={() => setEditingOpening(null)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <X size={18} className="text-white/40" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-white/60 mb-2">
                  Move Sequence (space-separated SAN notation)
                </label>
                <textarea
                  value={editMoves}
                  onChange={(e) => setEditMoves(e.target.value)}
                  placeholder="e.g., e4 e5 Nf3 Nc6 Bc4 Bc5 ..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
                <p className="text-xs text-white/30 mt-2">
                  Enter moves in standard algebraic notation (SAN), separated by spaces.
                  Example: e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4
                </p>
              </div>

              {/* Move count preview */}
              <div className="mb-4 p-3 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e]">
                <p className="text-sm text-white/60">
                  {editMoves.trim().split(/\s+/).filter(Boolean).length} moves entered
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingOpening(null)}
                  className="flex-1 py-3 rounded-xl bg-[#2a2a3e] text-white/60 font-medium hover:bg-[#2a2a3e]/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMoves}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-[#0a0a1f] font-semibold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Moves
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
