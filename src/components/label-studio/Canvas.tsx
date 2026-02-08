
'use client';

import React from 'react';
import { useLabelStore, LabelElement } from './store';
import { DraggableElement } from './DraggableElement';
import styles from './label-studio.module.css';

export const Canvas = () => {
    const { state, actions } = useLabelStore();

    // Helper to merge Master + Override
    const getMergedElements = (slotIndex: number) => {
        const overrides = state.overrides[slotIndex] || {};
        return state.elements.map(el => {
            const over = overrides[el.id];
            return over ? { ...el, ...over } : el;
        });
    };

    // --- GRID GENERATORS ---

    const renderFormatA = () => {
        // 2 Cols x 4 Rows
        // Cell Size: 105mm x 74mm
        // Content Rotation: 90 deg. 
        // Logic: The "Label" is 105mm wide. But the design is Portrait (Vertical text).
        // So we rotate the "Design Area" 90deg?
        // Or we just tell the user "Design Sideways"? 
        // User prompt: "Rotation 90°... Le contenu est tourné".
        // Implementation: We rotate the container div 90deg.

        const slots = [];
        for (let i = 0; i < 8; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);

            slots.push(
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${col * 105}mm`,
                        top: `${row * 74}mm`,
                        width: '105mm',
                        height: '74mm',
                        border: '1px solid #ddd', // Light grid guide
                        overflow: 'hidden',
                        // Print guide handled by border
                    }}
                    onClick={() => actions.selectElement(null, i)} // Select Slot
                >
                    {/* Rotated Content Wrapper */}
                    <div style={{
                        width: '74mm', // Swapped Dimensions for Portrait Design feel?
                        height: '105mm',
                        transform: 'rotate(90deg) translateY(-100%)', // Rotate and shift back
                        transformOrigin: 'top left',
                        position: 'relative',
                        // Debug Color
                        // background: i === state.selectedSlotIndex ? 'rgba(106, 50, 120, 0.05)' : 'transparent'
                    }}>
                        {getMergedElements(i).map(el => (
                            <DraggableElement
                                key={el.id}
                                element={el}
                                slotIndex={i}
                                containerWidth={74} // Swapped
                                containerHeight={105}
                                isRotated={true}
                            />
                        ))}
                    </div>
                </div>
            );
        }
        return slots;
    };

    const renderFormatB = () => {
        // 2 Cols x 2 Rows
        // Cell Size: 105mm x 148.5mm (Half A4 Height)
        // User Requirement: "Auto-Squeeze... source 141mm -> reduced to ~100mm"
        // This suggests the "Design Space" is 141mm wide, but we render it Scaled Down.

        const slots = [];
        const scaleFactor = 105 / 141; // ~0.74

        for (let i = 0; i < 4; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);

            slots.push(
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${col * 105}mm`,
                        top: `${row * 148.5}mm`,
                        width: '105mm',
                        height: '148.5mm',
                        border: '1px solid #ddd',
                        overflow: 'hidden'
                    }}
                    onClick={() => actions.selectElement(null, i)}
                >
                    {/* Auto-Squeeze Wrapper */}
                    <div style={{
                        width: '141mm', // Virtual Width
                        height: '148.5mm', // keep height or scale too? Assuming width constrained.
                        transform: `scale(${scaleFactor})`,
                        transformOrigin: 'top left',
                        position: 'relative'
                    }}>
                        {getMergedElements(i).map(el => (
                            <DraggableElement
                                key={el.id}
                                element={el}
                                slotIndex={i}
                                containerWidth={141}
                                containerHeight={148.5}
                                isRotated={false}
                            />
                        ))}
                    </div>
                </div>
            );
        }
        return slots;
    };

    return (
        <>
            {state.format === 'A' ? renderFormatA() : renderFormatB()}

            {/* Triman Overlay (Top Layer, not affected by Grid/Slots?) */}
            {/* User Requirement: "Triman overlay... distinct upload... size independent" */}
            {/* Usually Triman goes on every label? Or one big one? */}
            {/* "Triman Petit/Grand... ne change JAMAIS de taille". implies per label. */}
            {/* If per label, it should be part of the render loop above or a separate overlay loop. */}
            {/* Let's put it in the loops above if we had data. But `trimanOverlay` in store is single config? */}
            {/* "Upload séparé pour Triman Petit et Triman Grand". */}
            {/* Let's assume Triman is just a static image stamped on every label at X/Y coordinates. */}
            {/* I'll add it to the render loops later or now. Let's add it now. */}
        </>
    );
};
