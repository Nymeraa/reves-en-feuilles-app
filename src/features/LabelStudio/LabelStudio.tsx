'use client';
import React from 'react';
import { LabelProvider } from './context/LabelContext';
import SidebarLeft from './components/SidebarLeft';
import MainCanvas from './components/MainCanvas';
import CreateBatchModal from './components/CreateBatchModal';
import RightSidebar from './components/RightSidebar';
import styles from './LabelStudio.module.css';

const LabelStudioLayout: React.FC = () => {
  return (
    <div className={styles.labelStudioContainer}>
      <SidebarLeft />
      <MainCanvas />
      {/* Right Sidebar Placeholder */}
      <RightSidebar />

      <CreateBatchModal />
    </div>
  );
};

const LabelStudio: React.FC = () => {
  return (
    <LabelProvider>
      <LabelStudioLayout />
    </LabelProvider>
  );
};

export default LabelStudio;
