import { Link } from 'react-router';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
      <h2 className="text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
