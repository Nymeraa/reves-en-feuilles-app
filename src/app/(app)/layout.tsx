import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainSidebar } from '@/components/main-sidebar';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 md:block fixed inset-y-0 z-50">
        <MainSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-end px-6 shadow-sm">
          <LogoutButton />
        </header>

        <main className="flex-1 container max-w-7xl mx-auto p-6">{children}</main>
      </div>
    </div>
  );
}
