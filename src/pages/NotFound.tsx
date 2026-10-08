import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { buttonClasses } from '../components/ui/Button';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="That page doesn't exist, or the link has expired." />
      <Link to="/" className={buttonClasses('primary')}>
        Back to Quick Log
      </Link>
    </>
  );
}
