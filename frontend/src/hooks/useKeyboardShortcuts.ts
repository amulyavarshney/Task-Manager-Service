import { useEffect } from 'react';

export interface Shortcuts {
  onNew: () => void;
  onFocusSearch: () => void;
  onRefresh: () => void;
  onEscape: () => void;
  onToggleDark: () => void;
  onHelp: () => void;
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        shortcuts.onEscape();
        return;
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'n': e.preventDefault(); shortcuts.onNew(); break;
        case '/': e.preventDefault(); shortcuts.onFocusSearch(); break;
        case 'r': e.preventDefault(); shortcuts.onRefresh(); break;
        case 'd': e.preventDefault(); shortcuts.onToggleDark(); break;
        case '?': e.preventDefault(); shortcuts.onHelp(); break;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
