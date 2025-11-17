'use client';

import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy, where, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// This interface defines the structure of the site data we expect from Firestore.
interface DeployedSite {
  id: string; // The useCollection hook automatically adds the document ID here.
  projectName: string;
  url: string;
  deployedAt: Timestamp; // Data from Firestore will be a Timestamp object.
  userId: string;
}

export default function MySitesPage() {
  const { user } = useUser();
  const { firestore } = useFirestore();
  const { toast } = useToast();

  // We use useMemoFirebase to create a stable query object.
  // This query fetches documents from the 'sites' collection...
  // ...where the 'userId' matches the logged-in user's ID...
  // ...and orders them by deployment date, newest first.
  const sitesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'sites'),
      where('userId', '==', user.uid),
      orderBy('deployedAt', 'desc')
    );
  }, [firestore, user]);

  // The useCollection hook subscribes to the query in real-time.
  const { data: sites, isLoading, error } = useCollection<DeployedSite>(sitesQuery);

  // This function handles deleting a site.
  const handleDelete = async (siteId: string, projectName: string) => {
    if (!firestore) return;
    
    const docRef = doc(firestore, 'sites', siteId);
    
    try {
      await deleteDoc(docRef);
      toast({
        title: "Site Deleted",
        description: `"${projectName}" has been removed.`,
      });
    } catch (e) {
      console.error("Error deleting document: ", e);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the site. Please try again.",
      });
    }
  };

  // This function safely formats the date from a Firestore Timestamp.
  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return 'Date not available';
    // The .toDate() method converts the Firestore Timestamp to a standard JS Date.
    return timestamp.toDate().toLocaleString();
  };
  
  // If there's an error fetching data, we display it.
  if (error) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-destructive">Error Loading Sites</h2>
                <p className="text-muted-foreground">{error.message}</p>
                 <Button asChild className="mt-4">
                  <Link href="/">Back to Editor</Link>
                </Button>
            </div>
        </div>
    )
  }

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
            <CardDescription>A list of all the sites you have deployed.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {!isLoading && sites && sites.length > 0 && (
              <ul className="divide-y">
                {sites.map((site) => (
                  <li key={site.id} className="flex items-center justify-between py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{site.projectName}</span>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {site.url}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        Deployed on: {formatDate(site.deployedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                         <a href={site.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit
                         </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(site.id, site.projectName)}
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
                <h3 className="text-lg font-semibold">No sites yet!</h3>
                <p className="text-muted-foreground mt-2">You haven&apos;t deployed any sites. Let&apos;s change that.</p>
                <Button asChild className="mt-4">
                  <Link href="/">Create Your First Site</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
