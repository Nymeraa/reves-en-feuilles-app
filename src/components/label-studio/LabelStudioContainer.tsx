
'use client';

import React, { useState } from 'react';
import styles from './label-studio.module.css';
import { LabelStoreProvider, useLabelStore } from './store';
import { Canvas } from './Canvas';

const StudioLayout = () => {
    const { state, actions, dispatch } = useLabelStore();
    const [activeTab, setActiveTab] = useState<'lots' | 'media' | 'config' | 'layers'>('config');

    return (
        <div className={`${styles.container} tls-root`}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                {/* ... Sidebar Content ... */}
                <div className={styles.sidebarTabs}>
                    {['lots', 'media', 'config', 'layers'].map((tab) => (
                        <div
                            key={tab}
                            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab as any)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </div>
                    ))}
                </div>

                <div className={styles.sidebarContent}>
                    {activeTab === 'config' && (
                        <div>
                            <div className={styles.sectionTitle}>Format Étiquette</div>
                            <div className={styles.row}>
                                <button
                                    className={`${styles.btn} ${state.format === 'A' ? styles.btnPrimary : ''}`}
                                    onClick={() => dispatch({ type: 'SET_FORMAT', payload: 'A' })}
                                >
                                    Petit (2x4)
                                </button>
                                <button
                                    className={`${styles.btn} ${state.format === 'B' ? styles.btnPrimary : ''}`}
                                    onClick={() => dispatch({ type: 'SET_FORMAT', payload: 'B' })}
                                >
                                    Grand (2x2)
                                </button>
                            </div>

                            <div className={styles.sectionTitle}>Ajouter</div>
                            <div className={styles.row}>
                                <button className={styles.btn} onClick={() => actions.addElement('text')}>Texte</button>
                                {/* Media upload handled in media tab usually, but quick action here */}
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div>
                            <div className={styles.sectionTitle}>Médiathèque</div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) actions.uploadMedia(e.target.files[0]);
                                }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                                {state.mediaLibrary.map(item => (
                                    <div
                                        key={item.id}
                                        style={{ aspectRatio: '1', background: '#eee', padding: 4, cursor: 'pointer' }}
                                        onClick={() => actions.addElement('image', item.data)}
                                    >
                                        <img src={item.data} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <div style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className={styles.canvasArea}>
                <div className={`${styles.canvasWrapper} ${styles.a4Page}`} style={{
                    width: '210mm',
                    height: '297mm',
                    transform: `scale(${state.zoom})`,
                    transformOrigin: 'center center'
                }}>
                    <Canvas />
                </div>

                {/* Zoom Controls */}

                {/* Zoom Controls */}
                <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'white', padding: 8, borderRadius: 4, display: 'flex', gap: 4 }}>
                    <button className={styles.btn} onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, state.zoom - 0.1) })}>-</button>
                    <span style={{ padding: '0 8px', alignSelf: 'center' }}>{Math.round(state.zoom * 100)}%</span>
                    <button className={styles.btn} onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(2.0, state.zoom + 0.1) })}>+</button>
                </div>
            </div>

            {/* Inspector */}
            <div className={styles.inspector}>
                <div className={styles.sectionTitle}>Propriétés</div>
                {state.selectedElementId ? (
                    <div>
                        Element: {state.selectedElementId.substr(0, 5)}...
                        {/* Properties Form will go here */}
                    </div>
                ) : (
                    <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                        Aucune sélection.<br />
                        Les modifications s'appliquent à <b>toutes les étiquettes</b> (Global-First).
                    </div>
                )}
            </div>
        </div>
    );
};

export default function LabelStudioContainer() {
    return (
        <LabelStoreProvider>
            <StudioLayout />
        </LabelStoreProvider>
    );
}
