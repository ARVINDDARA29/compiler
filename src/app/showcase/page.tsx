
'use client';

import { useMemo } from 'react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Home, ServerCrash, GalleryHorizontal } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface DeployedSite {
  id: string;
  projectName: string;
  url: string;
  deployedAt: Timestamp;
  userId: string;
  isPublic: boolean;
}

export default function ShowcasePage() {
  const { firestore } = useFirebase();

  const publicSitesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sites'),
      where('isPublic', '==', true),
      orderBy('deployedAt', 'desc'),
      limit(50) // Limit to the 50 most recent public sites
    );
  }, [firestore]);

  const { data: sites, isLoading: isSitesLoading, error } = useCollection<DeployedSite>(publicSitesQuery);
  
  if (isSitesLoading) {
    return <ShowcasePageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
        <ServerCrash className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 max-w-md">We couldn't load the showcase. This can sometimes happen due to a network or permissions issue.</p>
        <p className="text-sm text-muted-foreground/50 break-all max-w-full">{error.message}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" /> Go back Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className='space-y-1'>
                <h1 className="text-3xl font-bold tracking-tight">Community Showcase</h1>
                <p className='text-muted-foreground'>Check out what other users have created!</p>
            </div>
             <Button asChild variant="outline">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Back to Editor
                </Link>
            </Button>
        </div>

        {sites && sites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <Card key={site.id} className="flex flex-col">
                 <CardHeader>
                  <CardTitle className="truncate">{site.projectName}</CardTitle>
                  <CardDescription>
                    {site.deployedAt ? `Deployed ${formatDistanceToNow(site.deployedAt.toDate(), { addSuffix: true })}` : 'Deployment date not available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow aspect-video bg-muted rounded-md -mt-4 mx-6 mb-6 overflow-hidden">
                    <iframe
                        src={site.url}
                        title={site.projectName}
                        sandbox="allow-scripts"
                        className="w-full h-full border-0 pointer-events-none scale-[0.5] origin-top-left"
                    />
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
            <GalleryHorizontal className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold mt-4">The Showcase is Empty!</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              Be the first to add a project to the showcase.
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

const ShowcasePageSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="flex justify-between items-center mb-8">
      <div className='space-y-2'>
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-10 w-36" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className='mx-6 mb-6 -mt-4'>
            <Skeleton className="h-full w-full aspect-video" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
);
