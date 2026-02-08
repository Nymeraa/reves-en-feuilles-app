'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
      // Fallback redirect anyway
      router.push('/login');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={handleLogout}
    >
      Se déconnecter
    </Button>
  );
}
