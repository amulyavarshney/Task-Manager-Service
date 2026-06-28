import { useState } from 'react';
import type { TaskTemplate } from '../types';

const STORAGE_KEY = 'task-templates';

function load(): TaskTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(templates: TaskTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(load);

  function addTemplate(t: Omit<TaskTemplate, 'id'>) {
    const next = [...templates, { ...t, id: crypto.randomUUID() }];
    setTemplates(next);
    persist(next);
  }

  function removeTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    persist(next);
  }

  return { templates, addTemplate, removeTemplate };
}
