import { redirect } from 'next/navigation';

/** Content now lives on the landing page as the #security section. */
export default function SecurityPage() {
  redirect('/#security');
}
