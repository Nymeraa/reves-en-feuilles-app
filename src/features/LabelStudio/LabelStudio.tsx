import React from 'react';
import { LabelProvider } from './context/LabelContext';
import SidebarLeft from './components/SidebarLeft';
import MainCanvas from './components/MainCanvas';
import CreateBatchModal from './components/CreateBatchModal';
import styles from './LabelStudio.module.css';

const LabelStudioLayout: React.FC = () => {
  return (
    <div className={styles.labelStudioContainer}>
      <SidebarLeft />
      <MainCanvas />
      {/* Right Sidebar Placeholder */}
      <div
        style={{
          width: '250px',
          borderLeft: '1px solid #e5e7eb',
          backgroundColor: 'white',
          flexShrink: 0,
        }}
      >
        {/* Helper/Inspector will go here */}
      </div>

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
