import { redirect } from 'next/navigation';

/** Content now lives on the landing page as the #platform section. */
export default function PlatformPage() {
  redirect('/#platform');
}
