
'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center">
        <h1 className="text-2xl font-bold">Please log in</h1>
        <p className="text-muted-foreground mb-6">You need to be logged in to view analytics.</p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Site Analytics</h1>
             <Button asChild variant="outline">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Back to Editor
                </Link>
            </Button>
        </div>

        <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">Analytics Dashboard Coming Soon!</h2>
            <p className="text-muted-foreground mt-2 mb-6">
             I am currently building the data collection and dashboard features. Check back soon!
            </p>
          </div>

      </div>
    </div>
  );
}
