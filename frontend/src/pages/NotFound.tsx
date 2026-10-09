import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Page Not Found</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
        The page or file path you requested does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" size="md">
            <Home className="w-4 h-4 mr-2" />
            Back to Dulal Mahato Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}
