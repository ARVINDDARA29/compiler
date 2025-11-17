'use client';

import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, Timestamp, where, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface DeployedSite {
  id: string; // The useCollection hook adds this 'id' property from the document ID
  projectName: string;
  url: string;
  deployedAt: Timestamp;
  userId: string;
}

export default function MySitesPage() {
  const { user } = useUser();
  const { firestore } = useFirestore();
  const { toast } = useToast();

  const sitesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'sites'),
      where('userId', '==', user.uid),
      orderBy('deployedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: sites, isLoading } = useCollection<DeployedSite>(sitesQuery, {
    snapshotListenOptions: { includeMetadataChanges: true },
  });

  const handleDelete = async (siteId: string, projectName: string) => {
    if (!user || !firestore) return;
    
    const docRef = doc(firestore, `sites`, siteId);
    
    // We are not using non-blocking delete here to give immediate feedback.
    try {
        await deleteDoc(docRef);
        toast({
            title: "Site Deleted",
            description: `${projectName} has been removed from your list.`
        });
    } catch(e) {
        console.error("Error deleting document: ", e);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the site. Please check permissions or try again."
        });
    }
  };

  const formatDate = (timestamp: Timestamp | Date) => {
    if (!timestamp) return 'Invalid date';
    // The value can be a Firebase Timestamp or a JS Date object depending on the state
    const date = (timestamp as Timestamp).toDate ? (timestamp as Timestamp).toDate() : (timestamp as Date);
    return date.toLocaleString();
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
                        Deployed on: {formatDate(site.deployedAt)}
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
