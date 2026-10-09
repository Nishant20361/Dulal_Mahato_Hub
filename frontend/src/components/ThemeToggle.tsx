import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={toggleTheme}
      title={`Current theme: ${theme}. Click to switch theme`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-95 shrink-0"
    >
      {theme === 'light' ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : theme === 'dark' ? (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Laptop className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">System</span>
        </>
      )}
    </button>
  );
}
