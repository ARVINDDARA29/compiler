
'use client';

import { useMemo } from 'react';
import { useUser, useFirebase, useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Home, Loader2, ServerCrash } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Define the shape of a DeployedSite document
interface DeployedSite {
  id: string;
  projectName: string;
  url: string;
  deployedAt: Timestamp;
  userId: string;
}

export default function MySitesPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  // Create a memoized query to fetch sites for the current user.
  const sitesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'sites'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  // Use the useCollection hook to get real-time data
  const { data: sites, isLoading: isSitesLoading, error } = useCollection<DeployedSite>(sitesQuery);

  // Memoize the sorted sites to prevent re-sorting on every render
  const sortedSites = useMemo(() => {
    if (!sites) return [];
    // Sort on the client-side to avoid needing a composite index in Firestore
    return [...sites].sort((a, b) => b.deployedAt.toMillis() - a.deployedAt.toMillis());
  }, [sites]);


  const isLoading = isUserLoading || (isSitesLoading && !sites);

  if (isLoading) {
    return <SitesPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
        <ServerCrash className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 max-w-md">We couldn't load your sites. This can sometimes happen due to a network or permissions issue.</p>
        <p className="text-sm text-muted-foreground/50 break-all max-w-full">{error.message}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" /> Go back Home
          </Link>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center">
        <h1 className="text-2xl font-bold">Please log in</h1>
        <p className="text-muted-foreground mb-6">You need to be logged in to view your deployed sites.</p>
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
            <h1 className="text-3xl font-bold tracking-tight">My Deployed Sites</h1>
             <Button asChild variant="outline">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Back to Editor
                </Link>
            </Button>
        </div>

        {sortedSites && sortedSites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSites.map((site) => (
              <Card key={site.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{site.projectName}</CardTitle>
                  <CardDescription>
                    {site.deployedAt ? `Deployed ${formatDistanceToNow(site.deployedAt.toDate(), { addSuffix: true })}` : 'Deployment date not available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                   <p className="text-sm text-muted-foreground break-all">
                     <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                        {site.url}
                     </a>
                   </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <a href={site.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Site
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">No sites deployed yet!</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              Go back to the editor and deploy your first project.
            </p>
            <Button asChild>
              <Link href="/">Create a New Site</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const SitesPageSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="flex justify-between items-center mb-8">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-36" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
);
