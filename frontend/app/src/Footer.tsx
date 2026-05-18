import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <Link to="/legal#terms">Terms of Service</Link>
      <Link to="/legal#privacy">Privacy Policy</Link>
    </footer>
  );
}