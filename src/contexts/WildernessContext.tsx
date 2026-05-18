import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CustomOpening } from '@/types';

const STORAGE_KEY = 'chess_horizon_wilderness';

function loadOpenings(): CustomOpening[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return getDefaultWildernessOpenings();
}

function saveOpenings(openings: CustomOpening[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openings));
  } catch { /* ignore */ }
}

function getDefaultWildernessOpenings(): CustomOpening[] {
  return [
    {
      id: 'wild-gambit',
      name: 'Wild Gambit',
      description: 'A user-submitted aggressive gambit line with sharp tactical play.',
      createdAt: Date.now() - 86400000 * 5,
      variations: [
        {
          id: 'main',
          name: 'Main Line',
          moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'Bxf7+', 'Kxf7', 'Ne5+', 'Ke8', 'Qxg4', 'Nf6', 'Qxf4', 'd6', 'Nc3'],
        },
      ],
    },
    {
      id: 'mystery-opening',
      name: 'Mystery Opening',
      description: 'An experimental opening submitted by the community.',
      createdAt: Date.now() - 86400000 * 2,
      variations: [
        {
          id: 'main',
          name: 'Main Line',
          moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Ba6', 'b3', 'Bb4+', 'Bd2', 'Be7', 'Bg2', 'c6', 'Bc3', 'd5', 'Nbd2', 'Nbd7', 'O-O', 'O-O', 'Re1', 'c5'],
        },
      ],
    },
  ];
}

interface WildernessContextValue {
  openings: CustomOpening[];
  addOpening: (name: string, description: string) => CustomOpening;
  deleteOpening: (id: string) => void;
  addVariation: (openingId: string, name: string, moves: string[]) => void;
  deleteVariation: (openingId: string, variationId: string) => void;
  updateVariationMoves: (openingId: string, variationId: string, moves: string[]) => void;
  getOpening: (id: string) => CustomOpening | undefined;
}

const WildernessContext = createContext<WildernessContextValue | null>(null);

export function WildernessProvider({ children }: { children: React.ReactNode }) {
  const [openings, setOpenings] = useState<CustomOpening[]>(loadOpenings);

  const addOpening = useCallback((name: string, description: string): CustomOpening => {
    const newOpening: CustomOpening = {
      id: `custom-${Date.now()}`,
      name,
      description,
      createdAt: Date.now(),
      variations: [
        {
          id: 'main',
          name: 'Main Line',
          moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
        },
      ],
    };
    const updated = [...openings, newOpening];
    setOpenings(updated);
    saveOpenings(updated);
    return newOpening;
  }, [openings]);

  const deleteOpening = useCallback((id: string) => {
    const updated = openings.filter((o) => o.id !== id);
    setOpenings(updated);
    saveOpenings(updated);
  }, [openings]);

  const addVariation = useCallback((openingId: string, name: string, moves: string[]) => {
    const updated = openings.map((o) => {
      if (o.id !== openingId) return o;
      return {
        ...o,
        variations: [
          ...o.variations,
          { id: `var-${Date.now()}`, name, moves },
        ],
      };
    });
    setOpenings(updated);
    saveOpenings(updated);
  }, [openings]);

  const deleteVariation = useCallback((openingId: string, variationId: string) => {
    const updated = openings.map((o) => {
      if (o.id !== openingId) return o;
      return {
        ...o,
        variations: o.variations.filter((v) => v.id !== variationId),
      };
    });
    setOpenings(updated);
    saveOpenings(updated);
  }, [openings]);

  const updateVariationMoves = useCallback((openingId: string, variationId: string, moves: string[]) => {
    const updated = openings.map((o) => {
      if (o.id !== openingId) return o;
      return {
        ...o,
        variations: o.variations.map((v) =>
          v.id === variationId ? { ...v, moves } : v
        ),
      };
    });
    setOpenings(updated);
    saveOpenings(updated);
  }, [openings]);

  const getOpening = useCallback(
    (id: string) => openings.find((o) => o.id === id),
    [openings]
  );

  return (
    <WildernessContext.Provider
      value={{
        openings,
        addOpening,
        deleteOpening,
        addVariation,
        deleteVariation,
        updateVariationMoves,
        getOpening,
      }}
    >
      {children}
    </WildernessContext.Provider>
  );
}

export function useWilderness() {
  const context = useContext(WildernessContext);
  if (!context) {
    throw new Error('useWilderness must be used within a WildernessProvider');
  }
  return context;
}
