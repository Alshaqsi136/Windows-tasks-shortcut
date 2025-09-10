import React from 'react';
import { getTranslation, setLanguage } from '../translations';

const LanguageSwitcher = ({ currentLanguage, onLanguageChange }) => {
  const handleLanguageChange = (language) => {
    setLanguage(language);
    onLanguageChange(language);
  };

  return (
    <div className="language-switcher">
      <label>{getTranslation('language', currentLanguage)}:</label>
      <select
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="language-select"
      >
        <option value="en">{getTranslation('english', currentLanguage)}</option>
        <option value="ar">{getTranslation('arabic', currentLanguage)}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
