import React, { useState, useEffect } from 'react';
import { getTranslation } from '../translations';
import { Save, Zap, Link, LayoutGrid, Monitor, Star, Palette, FolderOpen, Clock, RefreshCw, Bug, ChevronDown, Play } from 'lucide-react';

const ProgramPicker = ({ onSelect, language }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInstalled, setShowInstalled] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');

  useEffect(() => {
    if (showInstalled) {
      loadPrograms();
    }
  }, [showInstalled]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.getInstalledPrograms();
      
      if (response.success && response.programs) {
        setPrograms(response.programs);
      } else {
        console.error('Failed to load programs:', response.message);
        setPrograms([]);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const response = await window.electronAPI.browseForExecutable();
      
      if (response && response.success && response.path) {
        const pathToSelect = response.path;
        
        setSelectedPath(pathToSelect);
        onSelect(pathToSelect);
      }
    } catch (error) {
      console.error('Error browsing for file:', error);
    }
  };

  const handleProgramSelect = (program) => {
    // Ensure we're passing a string path, not an object
    const pathToSelect = typeof program === 'string' ? program : program.path;
    
    console.log('Program selected:', program);
    console.log('Path to select:', pathToSelect);
    console.log('Calling onSelect with:', pathToSelect);
    
    setSelectedPath(pathToSelect);
    onSelect(pathToSelect);
  };

  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgramTypeIcon = (type) => {
    switch (type) {
      case 'executable': return <Zap size={16} />;
      case 'shortcut': return <Link size={16} />;
      case 'application': return <LayoutGrid size={16} />;
      case 'modern-app': return <Monitor size={16} />;
      case 'popular-app': return <Star size={16} />;
      case 'portable-app': return <Save size={16} />;
      case 'design-app': return <Palette size={16} />;
      default: return <FolderOpen size={16} />;
    }
  };

  const getProgramTypeLabel = (type) => {
    return getTranslation(type, language);
  };

  const isRTL = language === 'ar';

  return (
    <div className={`program-picker ${isRTL ? 'rtl' : ''}`}>
      <div className="picker-controls">
        <button
          type="button"
          onClick={() => setShowInstalled(!showInstalled)}
          className="show-installed-btn"
        >
                     {showInstalled ? <ChevronDown size={16} /> : <Play size={16} />} {getTranslation('showInstalled', language)}
        </button>
        
        <button
          type="button"
          onClick={handleBrowse}
          className="browse-btn"
        >
          <FolderOpen size={16} /> {getTranslation('browseForFile', language)}
        </button>
        
        <button
          onClick={() => {
            console.log('Current programs state:', programs);
            console.log('Current loading state:', loading);
            console.log('Current showInstalled state:', showInstalled);
          }}
          className="debug-btn"
          style={{fontSize: '10px', padding: '2px 6px', marginLeft: '5px'}}
        >
                     <Bug size={14} /> Debug
        </button>
      </div>

      {showInstalled && (
        <div className="programs-section">
          <div className="programs-header">
            <input
              type="text"
              placeholder={getTranslation('searchPrograms', language)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            
            <button
              onClick={loadPrograms}
              className="refresh-btn"
              disabled={loading}
            >
                             {loading ? <Clock size={16} /> : <RefreshCw size={16} />} {getTranslation('refreshPrograms', language)}
            </button>
          </div>

          {programs.length > 0 && (
            <div className="programs-summary">
              <p>{getTranslation('totalPrograms', language)}: {programs.length}</p>
              <p>{getTranslation('programTypes', language)}: {Array.from(new Set(programs.map(p => p.type))).length}</p>
            </div>
          )}

          {loading ? (
            <div className="loading-programs">
                             <div><Clock size={16} /> Loading programs...</div>
              <div style={{fontSize: '12px', color: '#666'}}>This may take a few seconds on first load</div>
            </div>
          ) : filteredPrograms.length > 0 ? (
            <div className="programs-list">
              {filteredPrograms.map((program, index) => (
                <div
                  key={index}
                  className={`program-item ${selectedPath === program.path ? 'selected' : ''}`}
                  onClick={() => handleProgramSelect(program)}
                >
                  <div className="program-icon">
                    {getProgramTypeIcon(program.type)}
                  </div>
                  <div className="program-info">
                    <div className="program-name">{program.name}</div>
                    <div className="program-path">{program.path}</div>
                    <span className="program-type">
                      {getProgramTypeIcon(program.type)} {getProgramTypeLabel(program.type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-programs">
              {searchTerm ? 
                `No programs found matching "${searchTerm}"` : 
                getTranslation('noProgramsFound', language)
              }
              {programs.length === 0 && !loading && (
                <div style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
                  Try clicking the refresh button above to reload programs
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramPicker;
