import React, { useState } from 'react';
import type { Task } from '../types';
import { useTracker } from '../context/TrackerContext';
import { Trash2, Plus, CheckSquare } from 'lucide-react';

interface TaskListProps {
  courseId: string;
  tasks: Task[];
}

export const TaskList: React.FC<TaskListProps> = ({ courseId, tasks }) => {
  const { addTask, toggleTask, deleteTask } = useTracker();
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    addTask(courseId, newTaskText.trim(), newTaskDueDate || undefined);
    setNewTaskText('');
    setNewTaskDueDate('');
  };

  return (
    <div className="space-y-4">
      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Добавить задачу..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          className="sm:col-span-2 ide-input text-xs"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            className="ide-input text-xs p-1.5 flex-1 cursor-pointer"
            title="Срок выполнения"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-[#21262d] border border-[#30363d] text-white hover:bg-[#30363d] rounded text-xs transition-colors shrink-0 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Tasks checklist */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2.5 rounded border transition-colors ${
                task.done
                  ? 'bg-slate-900/10 border-[#24262c] text-[#8b949e] opacity-60'
                  : 'bg-[#17181c] border-[#24262c] text-white hover:border-[#30363d]'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(courseId, task.id)}
                  className="rounded border-[#30363d] bg-slate-900 text-[#58a6ff] focus:ring-[#58a6ff]/50 w-4 h-4 cursor-pointer"
                />
                <span className={`text-xs ${task.done ? 'line-through text-[#8b949e]' : ''}`}>
                  {task.text}
                </span>
              </label>

              <div className="flex items-center gap-2">
                {task.dueDate && (
                  <span className="text-[9px] font-mono bg-slate-950 border border-[#24262c] px-2 py-0.5 rounded text-[#8b949e]">
                    до {task.dueDate.split('-').reverse().slice(0, 2).join('.')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask(courseId, task.id)}
                  className="p-1 rounded text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="h-40 rounded border border-dashed border-[#24262c] flex flex-col items-center justify-center text-center p-4 text-[#8b949e] space-y-1.5">
            <CheckSquare className="w-6 h-6 text-[#535962] animate-pulse" />
            <p className="text-xs">Задач в этом курсе нет</p>
            <p className="text-[10px] text-[#535962] max-w-xs">
              Запишите первые шаги обучения в поле ввода выше.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
