import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div className="animate-fade-up">
        <div className="text-gradient text-7xl font-extrabold tracking-tight">404</div>
        <p className="mt-3 text-ink-muted">This page drifted out of orbit.</p>
        <Link to="/">
          <Button className="mt-6">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
