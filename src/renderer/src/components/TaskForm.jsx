import React, { useState, useEffect } from 'react';
import ProgramPicker from './ProgramPicker';
import { getTranslation } from '../translations';
import { LayoutGrid, Globe, SquareTerminal, Monitor, FileText, ClipboardList, Trash2, Save, Plus, X, Rocket } from 'lucide-react';

const TaskForm = ({ task, onSubmit, onCancel, language, isRTL }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'app',
    command: ''
  });
  const [isMultiTaskMode, setIsMultiTaskMode] = useState(false);
  const [multiTasks, setMultiTasks] = useState([{
    name: '',
    type: 'app',
    command: ''
  }]);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        type: task.type || 'app',
        command: task.command || ''
      });
    }
  }, [task]);

  const handleInputChange = (field, value) => {
    console.log('handleInputChange called with field:', field, 'value:', value);
    console.log('Previous formData:', formData);
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('New formData will be:', newData);
      return newData;
    });
  };

  const handleMultiTaskChange = (index, field, value) => {
    console.log('handleMultiTaskChange called with index:', index, 'field:', field, 'value:', value);
    console.log('Previous multiTasks:', multiTasks);
    
    const updatedTasks = [...multiTasks];
    updatedTasks[index] = {
      ...updatedTasks[index],
      [field]: value
    };
    
    console.log('Updated multiTasks will be:', updatedTasks);
    setMultiTasks(updatedTasks);
  };

  const addMultiTask = () => {
    setMultiTasks([...multiTasks, {
      name: '',
      type: 'app',
      command: ''
    }]);
  };

  const removeMultiTask = (index) => {
    if (multiTasks.length > 1) {
      setMultiTasks(multiTasks.filter((_, i) => i !== index));
    }
  };

  const clearMultiTasks = () => {
    setMultiTasks([{
      name: '',
      type: 'app',
      command: ''
    }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isMultiTaskMode) {
      // Submit multiple tasks
      const validTasks = multiTasks.filter(task => 
        task.name.trim() && task.command.trim()
      );
      
      if (validTasks.length === 0) {
        alert('Please add at least one valid task');
        return;
      }
      
      validTasks.forEach(taskData => {
        const newTask = {
          ...taskData,
          name: taskData.name.trim() || getTranslation('unnamedTask', language),
          command: taskData.command.trim()
        };
        onSubmit(newTask);
      });
      
      // Reset form
      clearMultiTasks();
      setIsMultiTaskMode(false);
    } else {
      // Submit single task
      if (!formData.name.trim() || !formData.command.trim()) {
        alert('Please fill in all fields');
        return;
      }
      
      const newTask = {
        ...formData,
        name: formData.name.trim(),
        command: formData.command.trim()
      };
      
      onSubmit(newTask);
      setFormData({ name: '', type: 'app', command: '' });
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'app': return <LayoutGrid size={16} />;
      case 'website': return <Globe size={16} />;
      case 'command': return <span style={{ color: '#0AD8BD', fontWeight: 'bold' }}>&gt;</span>;
      case 'server': return <Monitor size={16} />;
      default: return <LayoutGrid size={16} />;
    }
  };

  return (
    <div className="task-form-container">
      <div className="form-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${!isMultiTaskMode ? 'active' : ''}`}
          onClick={() => setIsMultiTaskMode(false)}
        >
          <FileText size={16} /> {getTranslation('singleTask', language)}
        </button>
        <button
          type="button"
          className={`mode-btn ${isMultiTaskMode ? 'active' : ''}`}
          onClick={() => setIsMultiTaskMode(true)}
        >
          <ClipboardList size={16} /> {getTranslation('multipleTasks', language)}
        </button>
      </div>

      {isMultiTaskMode ? (
        <form className="multi-task-form" onSubmit={handleSubmit}>
          <div className="multi-task-header">
            <h2><ClipboardList size={16} /> {getTranslation('createMultipleTasks', language)}</h2>
            <p className="multi-task-description">
              {getTranslation('multiTaskDescription', language)}
            </p>
          </div>

          {multiTasks.map((taskData, index) => (
            <div key={index} className="multi-task-item">
              <div className="multi-task-item-header">
                <span className="task-number">#{index + 1}</span>
                <button
                  type="button"
                  className="remove-task-btn"
                  onClick={() => removeMultiTask(index)}
                  disabled={multiTasks.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="form-row">
                <input
                  type="text"
                  placeholder={getTranslation('taskNamePlaceholder', language)}
                  value={taskData.name}
                  onChange={(e) => handleMultiTaskChange(index, 'name', e.target.value)}
                  className="task-name-input"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                
                <select
                  value={taskData.type}
                  onChange={(e) => handleMultiTaskChange(index, 'type', e.target.value)}
                  className="task-type-select"
                >
                  <option value="app">{getTranslation('application', language)}</option>
                  <option value="website">{getTranslation('website', language)}</option>
                  <option value="command">{getTranslation('command', language)}</option>
                  <option value="server">{getTranslation('server', language)}</option>
                </select>
              </div>
              
              <div className="form-row">
                <input
                  type="text"
                  placeholder={getTranslation('taskCommandPlaceholder', language)}
                  value={taskData.command}
                  onChange={(e) => handleMultiTaskChange(index, 'command', e.target.value)}
                  className="task-command-input"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                
                {taskData.type === 'app' && (
                  <ProgramPicker
                    onSelect={(path) => {
                      console.log('Multi-task TaskForm received path from ProgramPicker:', path);
                      console.log('Current taskData.command before update:', taskData.command);
                      handleMultiTaskChange(index, 'command', path);
                      console.log('After handleMultiTaskChange, taskData.command should be:', path);
                    }}
                    language={language}
                  />
                )}
              </div>
              
              <div className="task-preview">
                <div className="preview-icon">
                  {getTaskTypeIcon(taskData.type)}
                </div>
                <div className="preview-name">
                  {taskData.name || getTranslation('unnamedTask', language)}
                </div>
                <div className="preview-type">
                  {getTranslation(taskData.type, language)}
                </div>
              </div>
            </div>
          ))}
          
          <div className="multi-task-controls">
            <button
              type="button"
              className="add-task-btn"
              onClick={addMultiTask}
            >
                               <Plus size={16} /> {getTranslation('addAnotherTask', language)}
            </button>
            <button
              type="button"
              className="clear-tasks-btn"
              onClick={clearMultiTasks}
            >
                             <Trash2 size={16} /> {getTranslation('clearAllTasks', language)}
            </button>
            <button
              type="submit"
              className="create-all-tasks-btn"
            >
                               <Rocket size={16} /> {getTranslation('createAllTasks', language)}
            </button>
          </div>
        </form>
      ) : (
        <form className="task-form" onSubmit={handleSubmit}>
          <h2>{task ? getTranslation('editTask', language) : getTranslation('addTask', language)}</h2>
          
          <div className="form-row">
            <input
              type="text"
              placeholder={getTranslation('taskNamePlaceholder', language)}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="task-name-input"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="task-type-select"
            >
              <option value="app">{getTranslation('application', language)}</option>
              <option value="website">{getTranslation('website', language)}</option>
              <option value="command">{getTranslation('command', language)}</option>
              <option value="server">{getTranslation('server', language)}</option>
            </select>
          </div>
          
          <div className="form-row">
            <input
              type="text"
              placeholder={getTranslation('taskCommandPlaceholder', language)}
              value={formData.command}
              onChange={(e) => handleInputChange('command', e.target.value)}
              className="task-command-input"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            
            {formData.type === 'app' && (
              <ProgramPicker
                onSelect={(path) => {
                  console.log('TaskForm received path from ProgramPicker:', path);
                  console.log('Current formData.command before update:', formData.command);
                  handleInputChange('command', path);
                  console.log('After handleInputChange, formData.command should be:', path);
                }}
                language={language}
              />
            )}
          </div>
          
          <div className="task-preview">
            <div className="preview-icon">
              {getTaskTypeIcon(formData.type)}
            </div>
            <div className="preview-name">
              {formData.name || getTranslation('unnamedTask', language)}
            </div>
            <div className="preview-type">
              {getTranslation(formData.type, language)}
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              {getTranslation('cancel', language)}
            </button>
            <button type="submit" className="btn-primary">
              {task ? getTranslation('save', language) : getTranslation('addTask', language)}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TaskForm;
