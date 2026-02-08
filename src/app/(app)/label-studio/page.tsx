
import LabelStudioContainer from '@/components/label-studio/LabelStudioContainer';

export default function LabelStudioPage() {
    return (
        <div style={{ height: 'calc(100vh - 64px - 48px)', margin: '-24px' }}>
            {/* 
                Hack: Negate the padding from Layout (p-6 = 24px).
                We want the Studio to be edge-to-edge in the content area.
            */}
            <LabelStudioContainer />
        </div>
    );
}
