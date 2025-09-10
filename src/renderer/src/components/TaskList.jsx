import React, { useState, useEffect } from 'react';
import { getTranslation } from '../translations';
import { SquareTerminal, Globe, LayoutGrid, Save, ClipboardList, X, Trash2, Link, Clock, Rocket, Play, Pencil, CheckSquare, XCircle, Lightbulb, PlayCircle } from 'lucide-react';

const TaskList = ({ tasks, onEditTask, onDeleteTask, onExecuteTask, language, isRTL }) => {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showTaskGroups, setShowTaskGroups] = useState(false);
  const [taskGroups, setTaskGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isRunningMultiple, setIsRunningMultiple] = useState(false);

  useEffect(() => {
    // Load task groups from localStorage
    const savedGroups = localStorage.getItem('taskGroups');
    if (savedGroups) {
      setTaskGroups(JSON.parse(savedGroups));
    }
  }, []);

  const saveTaskGroups = (groups) => {
    localStorage.setItem('taskGroups', JSON.stringify(groups));
    setTaskGroups(groups);
  };

  const handleTaskSelect = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAll = () => {
    setSelectedTasks(new Set(tasks.map(task => task.id)));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  const handleRunMultiple = async () => {
    if (selectedTasks.size === 0) return;
    
    setIsRunningMultiple(true);
    try {
      const selectedTaskObjects = tasks.filter(task => selectedTasks.has(task.id));
      console.log('Running multiple tasks:', selectedTaskObjects);
      
      const result = await window.electronAPI.executeMultipleTasks(selectedTaskObjects);
      console.log('Multi-task execution result:', result);
      
      if (result.success) {
        console.log(`✅ Successfully executed ${result.successfulTasks} tasks`);
      } else {
        console.log('❌ Some tasks failed to execute');
      }
    } catch (error) {
      console.error('Error running multiple tasks:', error);
    } finally {
      setIsRunningMultiple(false);
    }
  };

  const saveAsTaskGroup = () => {
    if (!newGroupName.trim() || selectedTasks.size === 0) return;
    
    const selectedTaskObjects = tasks.filter(task => selectedTasks.has(task.id));
    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      tasks: selectedTaskObjects,
      createdAt: new Date().toISOString()
    };
    
    const updatedGroups = [...taskGroups, newGroup];
    saveTaskGroups(updatedGroups);
    setNewGroupName('');
    setSelectedTasks(new Set());
    setShowTaskGroups(false);
  };

  const loadTaskGroup = (group) => {
    const groupTaskIds = new Set(group.tasks.map(task => task.id));
    setSelectedTasks(groupTaskIds);
    setShowTaskGroups(false);
  };

  const deleteTaskGroup = (groupId) => {
    const updatedGroups = taskGroups.filter(group => group.id !== groupId);
    saveTaskGroups(updatedGroups);
  };

  const createTaskGroupShortcut = async (group) => {
    try {
      const result = await window.electronAPI.createTaskGroupShortcut(group);
      if (result.success) {
        console.log('✅ Shortcut created successfully:', result.message);
        alert(result.message + '\n\n' + result.instructions);
      } else {
        console.error('❌ Failed to create shortcut:', result.message);
        alert('Failed to create shortcut: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating shortcut:', error);
      alert('Error creating shortcut: ' + error.message);
    }
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'app': return <LayoutGrid size={16} />;
      case 'website': return <Globe size={16} />;
      case 'command': return <span style={{ color: '#0AD8BD', fontWeight: 'bold' }}>&gt;</span>;
      case 'server': return <SquareTerminal size={16} />;
      default: return <LayoutGrid size={16} />;
    }
  };

  const getTaskTypeColor = (type) => {
    switch (type) {
      case 'app': return '';
      case 'website': return '';
      case 'command': return '';
      case 'server': return '';
      default: return '';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="no-tasks">
        <h3>{getTranslation('noTasks', language)}</h3>
        <p>{getTranslation('noTasksDescription', language)}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header">
        <h2>{getTranslation('addTask', language)}</h2>
        
        {selectedTasks.size > 0 && (
          <div className="multi-select-controls">
            <span className="selected-count">
              {selectedTasks.size} {getTranslation('runMultiple', language).toLowerCase()}
            </span>
            <button
              className="run-multiple-btn"
              onClick={handleRunMultiple}
              disabled={isRunningMultiple}
            >
              {isRunningMultiple ? <Clock size={16} /> : <Rocket size={16} />} {getTranslation('runMultiple', language)}
            </button>
            <button
              className="save-group-btn"
              onClick={() => setShowTaskGroups(true)}
            >
              <Save size={16} /> {getTranslation('saveAsGroup', language)}
            </button>
          </div>
        )}
        
        <div className="header-actions">
          <button
            className="task-groups-btn"
            onClick={() => setShowTaskGroups(!showTaskGroups)}
          >
            <ClipboardList size={16} /> {getTranslation('taskGroups', language)}
          </button>
          <button className="select-all-btn" onClick={selectAll}>
            <CheckSquare size={16} /> {getTranslation('selectAll', language)}
          </button>
          <button className="clear-selection-btn" onClick={clearSelection}>
            <XCircle size={16} /> {getTranslation('clearSelection', language)}
          </button>
        </div>
      </div>

      {selectedTasks.size > 0 && (
        <div className="multi-task-summary">
          <div className="summary-content">
            <h4><ClipboardList size={16} /> {getTranslation('saveCurrentSelection', language)}</h4>
            <div className="selected-tasks-preview">
              {tasks.filter(task => selectedTasks.has(task.id)).map(task => (
                <div key={task.id} className="selected-task-preview">
                  {getTaskTypeIcon(task.type)} {task.name}
                </div>
              ))}
            </div>
            <p className="summary-tip">
              <Lightbulb size={16} /> {getTranslation('saveAsGroup', language)} to reuse this selection later!
            </p>
          </div>
        </div>
      )}

      {showTaskGroups && (
        <div className="task-groups-panel">
          <div className="task-groups-header">
            <h3><ClipboardList size={16} /> {getTranslation('taskGroups', language)}</h3>
            <button 
              className="close-btn"
              onClick={() => setShowTaskGroups(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="save-group-section">
            <h4><Save size={16} /> {getTranslation('saveCurrentSelection', language)}</h4>
            <div className="save-group-form">
              <input
                type="text"
                placeholder={getTranslation('groupNamePlaceholder', language)}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="group-name-input"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
                             <button
                 className="save-group-btn"
                 onClick={saveAsTaskGroup}
                 disabled={!newGroupName.trim() || selectedTasks.size === 0}
               >
                 <Save size={16} /> {getTranslation('saveGroup', language)}
               </button>
            </div>
          </div>

          <div className="existing-groups-section">
            <h4><ClipboardList size={16} /> {getTranslation('existingGroups', language)}</h4>
            {taskGroups.length === 0 ? (
              <div className="no-groups">
                {getTranslation('noTaskGroups', language)}
              </div>
            ) : (
              <div className="task-groups-list">
                {taskGroups.map(group => (
                  <div key={group.id} className="task-group-item">
                    <div className="group-info">
                      <h5>{group.name}</h5>
                      <div className="group-count">
                        {group.tasks.length} {getTranslation('runTask', language).toLowerCase()}
                      </div>
                      <div className="group-date">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="group-tasks-preview">
                      {group.tasks.slice(0, 3).map(task => (
                        <div key={task.id} className="group-task-preview">
                          {getTaskTypeIcon(task.type)} {task.name}
                        </div>
                      ))}
                      {group.tasks.length > 3 && (
                        <div className="more-tasks">
                          +{group.tasks.length - 3} more
                        </div>
                      )}
                    </div>
                    
                    <div className="group-actions">
                                             <button
                         className="run-group-btn"
                         onClick={() => loadTaskGroup(group)}
                       >
                         <PlayCircle size={16} /> {getTranslation('runGroup', language)}
                       </button>
                                             <button
                         className="create-shortcut-btn"
                         onClick={() => createTaskGroupShortcut(group)}
                       >
                         <Link size={16} /> {getTranslation('createShortcut', language)}
                       </button>
                                             <button
                         className="delete-group-btn"
                         onClick={() => deleteTaskGroup(group.id)}
                       >
                         <Trash2 size={16} /> {getTranslation('deleteGroup', language)}
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tasks-container">
        {tasks.map(task => (
          <div key={task.id} className="task-item">
            <div className="task-checkbox">
              <input
                type="checkbox"
                id={`task-${task.id}`}
                checked={selectedTasks.has(task.id)}
                onChange={() => handleTaskSelect(task.id)}
                className="task-checkbox-input"
              />
              <label htmlFor={`task-${task.id}`} className="task-checkbox-label">
                Select
              </label>
            </div>
            
            <div className="task-info">
              <div className="task-header">
                <div className="task-name">{task.name}</div>
                <span 
                  className="task-type-badge"
                  style={{ backgroundColor: getTaskTypeColor(task.type),border:"1px solid #0AD8BD",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}
                >
                  {getTaskTypeIcon(task.type)} {getTranslation(task.type, language)}
                </span>
              </div>
              <div className="task-command">{task.command}</div>
            </div>
            
            <div className="task-actions">
                             <button
                 className="btn-run"
                 onClick={() => onExecuteTask(task)}
                 title={getTranslation('runTask', language)}
               >
                 <Play size={16} />
               </button>
               <button
                 className="btn-edit"
                 onClick={() => onEditTask(task)}
                 title={getTranslation('editTaskBtn', language)}
               >
                 <Pencil size={16} />
               </button>
               <button
                 className="btn-delete"
                 onClick={() => onDeleteTask(task.id)}
                 title={getTranslation('deleteTaskBtn', language)}
               >
                 <Trash2 size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
