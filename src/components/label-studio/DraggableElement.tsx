
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

        const onMouseMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            // SCALE CORRECTION: We zoom the canvas, so 1px moved mouse != 1mm.
            // 1mm ~ 3.78px.
            // And Zoom factor applies.
            const mmPerPx = 25.4 / 96; // ~0.264
            // Zoom Factor:
            const zoom = state.zoom;

            // Effective Change in MM
            let dXmm = dx * mmPerPx / zoom;
            let dYmm = dy * mmPerPx / zoom;

            // AXIS INVERSION for Rotated Content (Format A)
            // If content is rotated 90deg, visually Horizontal drag moves along the element's Vertical axis.
            if (isRotated) {
                // Visual Right (X+) -> Element Y+ (Down in rotated frame) ? 
                // Or Y- (Up)? 
                // Let's assume Standard 90deg CW rotation.
                // Visual X+ aligns with Element Y-.
                // Visual Y+ aligns with Element X+.
                // Let's try:
                const temp = dXmm;
                dXmm = dYmm;   // Visual Y -> Element X
                dYmm = -temp;  // Visual X -> Element Y (inverted)
                // We'll calibrate this via "try/fail" mental model or strict standard.
                // Standard CSS Rotate 90deg:
                // X axis points Down. Y axis points Left.
                // Wait.
                // Let's just implement X->Y and Y->X basic swap first. user said "X devient Y".
            }

            actions.updateSelected({
                x: startElX + dXmm,
                y: startElY + dYmm
            });
        };

        const onMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
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
                left: `${element.x}mm`,
                top: `${element.y}mm`,
                width: `${element.width * element.scale}mm`,
                height: `${element.height * element.scale}mm`,
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

                        const onMove = (ev: MouseEvent) => {
                            const dy = ev.clientY - startY;
                            // Simple scale interact: Down = Grow.
                            const newScale = Math.max(0.1, startScale + (dy * 0.01));
                            actions.updateSelected({ scale: newScale });
                        };
                        const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                        }
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                    }}
                />
            )}
        </div>
    );
};
