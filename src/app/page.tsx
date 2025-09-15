import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/transaction-manager');
  return null;
}