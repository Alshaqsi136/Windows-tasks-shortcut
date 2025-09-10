import React, { useState, useEffect } from 'react';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import WindowArranger from './components/WindowArranger';
import LanguageSwitcher from './components/LanguageSwitcher';
import { getTranslation, setLanguage, getCurrentLanguage } from './translations';
import { Plus } from 'lucide-react';
import './assets/main.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [language, setLanguageState] = useState(getCurrentLanguage());
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    // Update language when it changes
    const currentLang = getCurrentLanguage();
    if (currentLang !== language) {
      setLanguageState(currentLang);
    }
  }, [language]);

  const loadTasks = async () => {
    try {
      const loadedTasks = await window.electronAPI.loadTasks();
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setMessage(getTranslation('errorLoadingTasks', language));
    }
  };

  const saveTasks = async (tasksToSave) => {
    try {
      await window.electronAPI.saveTasks(tasksToSave);
      setTasks(tasksToSave);
      return { success: true };
    } catch (error) {
      console.error('Error saving tasks:', error);
      setMessage(getTranslation('errorSavingTasks', language));
      return { success: false, message: error.message };
    }
  };

  const addTask = async (task) => {
    const newTask = {
      ...task,
      id: Date.now().toString()
    };
    const updatedTasks = [...tasks, newTask];
    const result = await saveTasks(updatedTasks);
    if (result.success) {
      setMessage(getTranslation('taskAdded', language));
      setShowTaskForm(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateTask = async (updatedTask) => {
    const updatedTasks = tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    const result = await saveTasks(updatedTasks);
    if (result.success) {
      setMessage(getTranslation('taskUpdated', language));
      setEditingTask(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteTask = async (taskId) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    const result = await saveTasks(updatedTasks);
    if (result.success) {
      setMessage(getTranslation('taskDeleted', language));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const executeTask = async (task) => {
    try {
      const result = await window.electronAPI.executeTask(task);
      if (result.success) {
        setMessage(getTranslation('taskExecuted', language));
      } else {
        setMessage(getTranslation('errorExecutingTask', language) + ': ' + result.message);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error executing task:', error);
      setMessage(getTranslation('errorExecutingTask', language));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setLanguageState(newLanguage);
  };

  const isRTL = language === 'ar';

  return (
    <div className={`app ${isRTL ? 'rtl' : ''}`}>
      <div className="app-header">
        <div className="header-content">
          <h1>{getTranslation('appTitle', language)}</h1>
          <div className="header-controls">
            <LanguageSwitcher 
              currentLanguage={language} 
              onLanguageChange={handleLanguageChange} 
            />
            <WindowArranger language={language} isRTL={isRTL} />
          </div>
        </div>
      </div>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      <div className="app-main">
        {!showTaskForm && !editingTask ? (
          <>
            <button 
              className="add-task-btn"
              onClick={() => setShowTaskForm(true)}
            >
              <Plus size={16} /> {getTranslation('addTask', language)}
            </button>
            <TaskList 
              tasks={tasks}
              onEditTask={setEditingTask}
              onDeleteTask={deleteTask}
              onExecuteTask={executeTask}
              language={language}
              isRTL={isRTL}
            />
          </>
        ) : (
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? updateTask : addTask}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            language={language}
            isRTL={isRTL}
          />
        )}
      </div>
    </div>
  );
}

export default App;
