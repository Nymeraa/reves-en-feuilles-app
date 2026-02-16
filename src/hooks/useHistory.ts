import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseHistoryReturn<T> {
  state: T;
  set: (newPresent: T | ((prev: T) => T), options?: { history?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyState: HistoryState<T>; // For debugging if needed
  snapshot: () => void;
}

const HISTORY_LIMIT = 20;

export function useHistory<T>(initialPresent: T): UseHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;

      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;

      const next = curr.future[0];
      const newFuture = curr.future.slice(1);

      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback(
    (newPresent: T | ((prev: T) => T), options: { history?: boolean } = { history: true }) => {
      setHistory((curr) => {
        const nextState =
          typeof newPresent === 'function'
            ? (newPresent as (prev: T) => T)(curr.present)
            : newPresent;

        if (curr.present === nextState) return curr;

        // If history is skipped, we just update present but keep past/future?
        // Usually, any change should clear future to avoid inconsistency.
        // But for "dragging", we want to be able to undo to *before* drag.
        // So we keep 'past' as is.

        let newPast = curr.past;

        if (options.history !== false) {
          newPast = [...curr.past, curr.present];
          if (newPast.length > HISTORY_LIMIT) {
            newPast.shift(); // Remove oldest
          }
        }

        return {
          past: newPast,
          present: nextState,
          future: [], // Clear future on new change
        };
      });
    },
    []
  );

  const snapshot = useCallback(() => {
    setHistory((curr) => {
      const newPast = [...curr.past, curr.present];
      if (newPast.length > HISTORY_LIMIT) {
        newPast.shift();
      }
      return {
        ...curr,
        past: newPast,
      };
    });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    historyState: history,
    snapshot,
  };
}
