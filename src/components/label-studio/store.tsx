
'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { dbHelper, DBMediaItem } from '@/lib/indexed-db-helper';

// --- TYPES ---

export type LabelFormat = 'A' | 'B'; // A=Small(2x4), B=Large(2x2)

export interface LabelElement {
    id: string;
    type: 'text' | 'image' | 'shape';
    x: number; // mm
    y: number; // mm
    width: number; // mm
    height: number; // mm
    rotation: number; // degrees
    scale: number; // factor (1 = 100%)

    content: string; // Text string or Image DataURL
    style: React.CSSProperties; // fontFamily, color, fontSize, etc.

    locked: boolean;
    preset?: string;
}

export interface TrimanConfig {
    url: string; // DataURL
    x: number;
    y: number;
    format: LabelFormat;
}

export interface LabelState {
    format: LabelFormat;
    elements: LabelElement[]; // Master Template
    overrides: Record<number, Record<string, Partial<LabelElement>>>; // Map<SlotIndex, Map<ElementId, Changes>>
    trimanOverlay: TrimanConfig | null;

    selectedElementId: string | null;
    selectedSlotIndex: number | null; // Null = Global Mode

    zoom: number; // 0.5 to 2.0
    mediaLibrary: DBMediaItem[];
}

// --- ACTIONS ---

type Action =
    | { type: 'SET_FORMAT'; payload: LabelFormat }
    | { type: 'ADD_ELEMENT'; payload: LabelElement }
    | { type: 'UPDATE_ELEMENT'; payload: { id: string; changes: Partial<LabelElement> } }
    | { type: 'UPDATE_OVERRIDE'; payload: { slotIndex: number; elementId: string; changes: Partial<LabelElement> } }
    | { type: 'DELETE_ELEMENT'; payload: string }
    | { type: 'SELECT_ELEMENT'; payload: { id: string | null; slotIndex: number | null } }
    | { type: 'SET_TRIMAN'; payload: TrimanConfig | null }
    | { type: 'SET_ZOOM'; payload: number }
    | { type: 'LOAD_MEDIA'; payload: DBMediaItem[] }
    | { type: 'LOAD_STATE'; payload: Partial<LabelState> };

// --- REDUCER ---

const initialState: LabelState = {
    format: 'A',
    elements: [],
    overrides: {},
    trimanOverlay: null,
    selectedElementId: null,
    selectedSlotIndex: null,
    zoom: 1.0,
    mediaLibrary: []
};

function labelReducer(state: LabelState, action: Action): LabelState {
    switch (action.type) {
        case 'SET_FORMAT':
            // Reset overrides when format changes for safety
            return { ...state, format: action.payload, overrides: {} };

        case 'ADD_ELEMENT':
            return {
                ...state,
                elements: [...state.elements, action.payload],
                selectedElementId: action.payload.id,
                selectedSlotIndex: null
            };

        case 'UPDATE_ELEMENT':
            return {
                ...state,
                elements: state.elements.map(el =>
                    el.id === action.payload.id ? { ...el, ...action.payload.changes } : el
                )
            };

        case 'UPDATE_OVERRIDE':
            const { slotIndex, elementId, changes } = action.payload;
            const slotOverrides = state.overrides[slotIndex] || {};
            const elOverride = slotOverrides[elementId] || {};

            return {
                ...state,
                overrides: {
                    ...state.overrides,
                    [slotIndex]: {
                        ...slotOverrides,
                        [elementId]: { ...elOverride, ...changes }
                    }
                }
            };

        case 'DELETE_ELEMENT':
            return {
                ...state,
                elements: state.elements.filter(el => el.id !== action.payload),
                selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId
            };

        case 'SELECT_ELEMENT':
            return {
                ...state,
                selectedElementId: action.payload.id,
                selectedSlotIndex: action.payload.slotIndex
            };

        case 'SET_TRIMAN':
            return { ...state, trimanOverlay: action.payload };

        case 'SET_ZOOM':
            return { ...state, zoom: action.payload };

        case 'LOAD_MEDIA':
            return { ...state, mediaLibrary: action.payload };

        case 'LOAD_STATE':
            return { ...state, ...action.payload };

        default:
            return state;
    }
}

// --- CONTEXT ---

interface LabelContextType {
    state: LabelState;
    dispatch: React.Dispatch<Action>;
    actions: {
        addElement: (type: 'text' | 'image', content?: string) => void;
        updateSelected: (changes: Partial<LabelElement>) => void;
        selectElement: (id: string | null, slotIndex: number | null) => void;
        applyPreset: (preset: 'HautG' | 'HautD' | 'BasG' | 'BasD') => void;
        uploadMedia: (file: File) => Promise<void>;
    };
}

const LabelContext = createContext<LabelContextType | null>(null);

export const useLabelStore = () => {
    const context = useContext(LabelContext);
    if (!context) throw new Error('useLabelStore must be used within LabelStoreProvider');
    return context;
};

export const LabelStoreProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(labelReducer, initialState);

    useEffect(() => {
        dbHelper.init().then(() => {
            dbHelper.getMediaAll().then(media => {
                dispatch({ type: 'LOAD_MEDIA', payload: media });
            });
        });
    }, []);

    const actions = {
        addElement: (type: 'text' | 'image', content = 'Nouveau texte') => {
            const newEl: LabelElement = {
                id: Math.random().toString(36).substr(2, 9),
                type: type as any,
                x: 10,
                y: 10,
                width: type === 'text' ? 80 : 40,
                height: type === 'text' ? 10 : 40,
                rotation: 0,
                scale: 1,
                content: content,
                locked: false,
                style: type === 'text' ? {
                    fontFamily: 'Arial',
                    fontSize: 12,
                    color: '#6a3278', // Default color
                    fontWeight: 'normal'
                } : {}
            };
            dispatch({ type: 'ADD_ELEMENT', payload: newEl });
        },

        selectElement: (id: string | null, slotIndex: number | null) => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id, slotIndex } });
        },

        updateSelected: (changes: Partial<LabelElement>) => {
            if (!state.selectedElementId) return;

            if (state.selectedSlotIndex !== null) {
                // Local Override
                dispatch({
                    type: 'UPDATE_OVERRIDE',
                    payload: {
                        slotIndex: state.selectedSlotIndex,
                        elementId: state.selectedElementId,
                        changes
                    }
                });
            } else {
                // Global Master Update
                dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                        id: state.selectedElementId,
                        changes
                    }
                });
            }
        },

        applyPreset: (preset: 'HautG' | 'HautD' | 'BasG' | 'BasD') => {
            if (!state.selectedElementId) return;

            const map = {
                'HautG': { scale: 1.25, x: 52, y: 52 },
                'HautD': { scale: 1.26, x: 48, y: 48 },
                'BasG': { scale: 1.26, x: 48, y: 53 },
                'BasD': { scale: 1.25, x: 52, y: 47 }
            };

            const p = map[preset];
            actions.updateSelected({ scale: p.scale });
        },

        uploadMedia: async (file: File) => {
            return new Promise<void>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const dataUrl = e.target?.result as string;
                    if (file.name.endsWith('.svgz')) {
                        alert('Format compressé .svgz non supporté');
                        return reject('SVGZ not supported');
                    }

                    const item: DBMediaItem = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        type: file.type,
                        data: dataUrl,
                        createdAt: Date.now()
                    };

                    await dbHelper.saveMedia(item);
                    dispatch({ type: 'LOAD_MEDIA', payload: await dbHelper.getMediaAll() });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
    };

    return (
        <LabelContext.Provider value={{ state, dispatch, actions }}>
            {children}
        </LabelContext.Provider>
    );
};
