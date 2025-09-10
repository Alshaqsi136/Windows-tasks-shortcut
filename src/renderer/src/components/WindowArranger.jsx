import React from 'react';
import { getTranslation } from '../translations';
import { MoveHorizontal, MoveVertical, Square } from 'lucide-react';

const WindowArranger = ({ language, isRTL }) => {
  const handleArrange = async (arrangement) => {
    try {
      const result = await window.electronAPI.arrangeWindows(arrangement);
      if (result.success) {
        console.log('Windows arranged successfully');
      } else {
        console.error('Failed to arrange windows:', result.message);
      }
    } catch (error) {
      console.error('Error arranging windows:', error);
    }
  };

  const arrangementOptions = [
    { key: 'split-horizontal', icon: <MoveHorizontal size={24} />, label: 'splitHorizontal' },
    { key: 'split-vertical', icon: <MoveVertical size={24} />, label: 'splitVertical' },
    { key: 'quadrant', icon: <Square size={24} />, label: 'quadrant' }
  ];

  return (
    <div className="window-arranger">
      <h3>{getTranslation('arrangeWindows', language)}</h3>
      <div className="arrangement-buttons">
        {arrangementOptions.map(option => (
          <button
            key={option.key}
            className="arrangement-btn"
            onClick={() => handleArrange(option.key)}
            title={getTranslation(option.label, language)}
          >
            <span className="arrangement-icon">{option.icon}</span>
            <span className="arrangement-label">
              {getTranslation(option.label, language)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WindowArranger;
