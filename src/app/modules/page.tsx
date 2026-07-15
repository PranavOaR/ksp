import { redirect } from 'next/navigation';

/** Content now lives on the landing page as the #modules section. */
export default function ModulesPage() {
  redirect('/#modules');
}
