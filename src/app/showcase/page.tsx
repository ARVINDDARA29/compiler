
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirebase, useCollection, errorEmitter, FirestorePermissionError, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Home, Loader2, ServerCrash, Heart } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DeployedSite {
  id: string;
  projectName: string;
  url: string;
  deployedAt: Timestamp;
  userId: string;
  isPublic: boolean;
  imageUrl?: string;
  likes: number;
}

interface Like {
    id: string;
    userId: string;
    siteId: string;
}

export default function ShowcasePage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, number>>({});
  const [likedByUser, setLikedByUser] = useState<Record<string, boolean>>({});

  const publicSitesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sites'),
      where('isPublic', '==', true)
    );
  }, [firestore]);

  const { data: sites, isLoading: isSitesLoading, error } = useCollection<DeployedSite>(publicSitesQuery);
  
  const userLikesQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'likes'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: userLikes } = useCollection<Like>(userLikesQuery);

  useEffect(() => {
      if (userLikes) {
          const likedMap = userLikes.reduce((acc, like) => {
              acc[like.siteId] = true;
              return acc;
          }, {} as Record<string, boolean>);
          setLikedByUser(likedMap);
      }
  }, [userLikes]);


  const sortedSites = useMemo(() => {
    if (!sites) return [];
    return [...sites].sort((a, b) => b.deployedAt.toMillis() - a.deployedAt.toMillis());
  }, [sites]);

  const handleLike = (siteId: string, currentLikes: number) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to like a project.',
      });
      return;
    }
    
    if (likedByUser[siteId]) {
        toast({
            title: "You've already liked this!",
        });
        return;
    }

    const siteRef = doc(firestore, 'sites', siteId);
    const likeRef = doc(firestore, 'likes', `${user.uid}_${siteId}`);
    
    // Optimistic update
    setOptimisticLikes(prev => ({ ...prev, [siteId]: (prev[siteId] ?? currentLikes) + 1 }));
    setLikedByUser(prev => ({...prev, [siteId]: true}));


    updateDoc(siteRef, { likes: increment(1) }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
          path: siteRef.path,
          operation: 'update',
          requestResourceData: { likes: 'increment(1)' }
      });
      errorEmitter.emit('permission-error', permissionError);
      
      // Revert optimistic update on error
      setOptimisticLikes(prev => ({ ...prev, [siteId]: currentLikes }));
      setLikedByUser(prev => ({...prev, [siteId]: false}));
    });

    const likeData = { userId: user.uid, siteId };
    setDoc(likeRef, likeData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
            path: likeRef.path,
            operation: 'create',
            requestResourceData: likeData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // Don't revert like button state here as updateDoc might still succeed.
    });
  };

  const isLoading = isUserLoading || (isSitesLoading && !sites);

  if (isLoading) {
    return <ShowcasePageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
        <ServerCrash className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 max-w-md">We couldn't load the showcase. This can happen due to a network or permissions issue.</p>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">Community Showcase</h1>
                <p className="text-muted-foreground mt-1">Explore creations from the RunAndDeploy community.</p>
            </div>
             <Button asChild variant="outline">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Back to Editor
                </Link>
            </Button>
        </div>

        {sortedSites && sortedSites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSites.map((site) => {
              const currentLikes = optimisticLikes[site.id] ?? site.likes;
              const isLiked = likedByUser[site.id];
              return (
              <Card key={site.id} className="flex flex-col group overflow-hidden">
                <CardHeader className="p-0">
                    <div className="aspect-video overflow-hidden relative">
                         <Image
                            src={site.imageUrl || `https://picsum.photos/seed/${site.id}/600/400`}
                            alt={site.projectName}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                         />
                    </div>
                </CardHeader>
                <CardContent className="pt-4 flex-grow">
                  <CardTitle className="truncate text-lg">{site.projectName}</CardTitle>
                  <CardDescription>
                    {site.deployedAt ? `Published ${formatDistanceToNow(site.deployedAt.toDate(), { addSuffix: true })}` : ''}
                  </CardDescription>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleLike(site.id, site.likes)} disabled={isLiked}>
                      <Heart className={cn("mr-2 h-4 w-4", isLiked && "fill-red-500 text-red-500")}/>
                      {currentLikes}
                  </Button>
                  <Button asChild size="sm">
                    <a href={site.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Site
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            )})}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">The Showcase is Empty!</h2>
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
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Skeleton className="h-10 w-36" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
            <Skeleton className="aspect-video w-full" />
          <CardContent className="pt-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
          <CardFooter className="justify-between">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
);
