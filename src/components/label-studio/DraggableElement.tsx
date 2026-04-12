
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { LabelElement, useLabelStore } from './store';

interface DraggableProps {
    element: LabelElement;
    slotIndex: number | null; // Null if Master Template view, but we are always in a slot in this design.
    containerWidth: number;
    containerHeight: number;
    isRotated: boolean; // For Format A content
}

export const DraggableElement: React.FC<DraggableProps> = ({ element, slotIndex, containerWidth, containerHeight, isRotated }) => {
    const { state, actions } = useLabelStore();
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Performance: État local pour le glisser/redimensionner afin d'éviter 
    // de redessiner toutes les étiquettes 60 fois par seconde pendant l'action
    const [localOffset, setLocalOffset] = useState({ x: 0, y: 0 });
    const [localScaleOffset, setLocalScaleOffset] = useState(0);

    // Selection State
    const isSelected = state.selectedElementId === element.id && (state.selectedSlotIndex === slotIndex || state.selectedSlotIndex === null);

    // Style Merging (Master + Override)
    // NOTE: The element passed as prop SHOULD already be the merged version from Canvas logic.
    // So we just use `element`.

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (element.locked) return;

        actions.selectElement(element.id, slotIndex);
        setIsDragging(true);

        const startX = e.clientX;
        const startY = e.clientY;
        const startElX = element.x;
        const startElY = element.y;

        let finalDXmm = 0;
        let finalDYmm = 0;

        const onMouseMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            // SCALE CORRECTION: We zoom the canvas, so 1px moved mouse != 1mm.
            const mmPerPx = 25.4 / 96; // ~0.264
            const zoom = state.zoom;

            let dXmm = dx * mmPerPx / zoom;
            let dYmm = dy * mmPerPx / zoom;

            // AXIS INVERSION for Rotated Content (Format A)
            if (isRotated) {
                const temp = dXmm;
                dXmm = dYmm;   // Visual Y -> Element X
                dYmm = -temp;  // Visual X -> Element Y (inverted)
            }

            finalDXmm = dXmm;
            finalDYmm = dYmm;

            // PERFORMANCE: On met à jour uniquement l'état local pour fluidifier le rendu
            // Sans causer de redessin global de toutes les autres étiquettes.
            setLocalOffset({ x: dXmm, y: dYmm });
        };

        const onMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            
            // On envoie le changement au Store Global SEULEMENT quand le clic est relaché.
            if (finalDXmm !== 0 || finalDYmm !== 0) {
                actions.updateSelected({
                    x: startElX + finalDXmm,
                    y: startElY + finalDYmm
                });
                setLocalOffset({ x: 0, y: 0 }); // On réinitialise l'offset local
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Render Content
    const contentStyle: React.CSSProperties = {
        ...element.style,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Pass events to container
        userSelect: 'none'
    };

    return (
        <div
            ref={ref}
            onMouseDown={handleMouseDown}
            style={{
                position: 'absolute',
                left: `${element.x + localOffset.x}mm`,
                top: `${element.y + localOffset.y}mm`,
                width: `${element.width * Math.max(0.1, element.scale + localScaleOffset)}mm`,
                height: `${element.height * Math.max(0.1, element.scale + localScaleOffset)}mm`,
                // Rotation is usually internal to element logic or visual.
                // If isRotated is true (Format A), the whole SLOT is rotated? 
                // No, the user said "Content is rotated".
                // If I am inside a rotated slot, I don't need to rotate this div.
                // If I am in a straight slot but need to render sideways text:
                transform: `rotate(${element.rotation}deg)`,
                // Interaction Styles
                cursor: element.locked ? 'default' : (isDragging ? 'grabbing' : 'grab'),
                outline: isSelected ? '2px solid #6a3278' : '1px dashed transparent',
                zIndex: isSelected ? 100 : 1,
            }}
        >
            {element.type === 'text' && (
                <div style={contentStyle}>{element.content}</div>
            )}
            {element.type === 'image' && (
                <img src={element.content} style={{ ...contentStyle, objectFit: 'contain' }} draggable={false} />
            )}

            {/* Resize Handles (Only if selected and not locked) */}
            {isSelected && !element.locked && (
                <div
                    style={{ position: 'absolute', right: 0, bottom: 0, width: 10, height: 10, background: '#6a3278', cursor: 'se-resize' }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        // Implement scaling logic here (Simplified for now)
                        // ...
                        const startY = e.clientY;
                        const startScale = element.scale;
                        
                        let finalScaleOffset = 0;

                        const onMove = (ev: MouseEvent) => {
                            const dy = ev.clientY - startY;
                            // Simple scale interact: Down = Grow.
                            finalScaleOffset = dy * 0.01;
                            setLocalScaleOffset(finalScaleOffset);
                        };
                        const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                            
                            if (finalScaleOffset !== 0) {
                                const finalNewScale = Math.max(0.1, startScale + finalScaleOffset);
                                actions.updateSelected({ scale: finalNewScale });
                                setLocalScaleOffset(0);
                            }
                        }
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                    }}
                />
            )}
        </div>
    );
};
