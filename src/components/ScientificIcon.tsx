import React from 'react';
import dnaIcon from '../assets/icons/dna_3d.svg';
import proteinIcon from '../assets/icons/protein_3d.svg';
import flowIcon from '../assets/icons/flow_3d.svg';

export type IconType = 'gene' | 'protein' | 'cell' | string;

interface ScientificIconProps {
    icon: IconType;
    size?: number;
    className?: string;
}

export const ScientificIcon: React.FC<ScientificIconProps> = ({ icon, size = 24, className = '' }) => {
    // Map keywords to image assets
    if (icon === 'protein' || icon === 'Proteomics' || icon === '🧪' || icon === '🧬' && className.includes('protein')) {
        return <img src={proteinIcon} alt="Protein Structure" style={{ width: size, height: size, objectFit: 'contain' }} className={className} />;
    }

    if (icon === 'cell' || icon === 'Flow Cytometry' || icon === '🩸' || icon === '🧫') {
        return <img src={flowIcon} alt="Flow Cytometry" style={{ width: size, height: size, objectFit: 'contain' }} className={className} />;
    }

    // Default fallbacks based on type keyword
    if (icon === 'gene') return <img src={dnaIcon} alt="DNA Helix" style={{ width: size, height: size, objectFit: 'contain' }} className={className} />;

    // Fallback for other emojis or types
    // Check if it's already an emoji string
    const isEmoji = (str: string) => /\p{Emoji}/u.test(str);

    if (isEmoji(icon)) {
        return <span style={{ fontSize: size, lineHeight: 1 }} className={className}>{icon}</span>;
    }

    // Default fallbacks based on type keyword
    if (icon === 'gene') return <span style={{ fontSize: size, lineHeight: 1 }} className={className}>🧬</span>;

    return <span style={{ fontSize: size, lineHeight: 1 }} className={className}>{icon}</span>;
};
