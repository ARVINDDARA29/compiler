'use client';

import { useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface DeployedSite {
  id: string;
  projectName: string;
  url: string;
  deployedAt: Date; // Changed from { seconds: number; nanoseconds: number; } to Date
}

export default function MySitesPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  const sitesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/deployedSites`),
      orderBy('deployedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: sites, isLoading } = useCollection<DeployedSite>(sitesQuery);

  const handleDelete = (siteId: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/deployedSites`, siteId);
    deleteDocumentNonBlocking(docRef);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Editor</span>
          </Link>
        </Button>
        <h1 className="text-lg font-semibold md:text-xl">My Deployed Sites</h1>
        <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Deployments</CardTitle>
            <CardDescription>Here is a list of all the sites you have deployed.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {!isLoading && sites && sites.length > 0 && (
              <ul className="divide-y">
                {sites.map((site) => (
                  <li key={site.id} className="flex items-center justify-between py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{site.projectName}</span>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {site.url}
                      </a>
                      <span className="text-xs text-muted-foreground mt-1">
                        Deployed on: {site.deployedAt instanceof Date ? site.deployedAt.toLocaleString() : new Date((site.deployedAt as any).seconds * 1000).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Visit
                        </Button>
                      </a>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(site.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {!isLoading && (!sites || sites.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">You haven&apos;t deployed any sites yet.</p>
                <Button asChild className="mt-4">
                  <Link href="/">Create a New Site</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
