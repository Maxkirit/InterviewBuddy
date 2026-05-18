import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full py-4 text-center text-xs text-gray-400 border-t border-gray-100">
      <Link to="/legal#terms">Terms of Service</Link>
      <span className="mx-2">·</span>
      <Link to="/legal#privacy">Privacy Policy</Link>
    </footer>
  );
}