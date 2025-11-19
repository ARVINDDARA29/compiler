
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirebase, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Home, Loader2, ServerCrash, BarChart, Eye, Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { format } from 'date-fns';

interface DeployedSite {
  id: string;
  projectName: string;
  url: string;
  deployedAt: Timestamp;
  userId: string;
}

interface AnalyticsEvent {
  id: string;
  siteId: string;
  path: string;
  userAgent: string;
  timestamp: Timestamp;
}

interface SiteAnalytics {
  totalViews: number;
  uniqueVisitors: number;
  viewsByPath: Record<string, number>;
  viewsOverTime: { date: string; views: number }[];
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();

  // 1. Fetch the user's sites
  const sitesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'sites'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: sites, isLoading: isSitesLoading, error: sitesError } = useCollection<DeployedSite>(sitesQuery);

  const [analyticsData, setAnalyticsData] = useState<Record<string, SiteAnalytics | null>>({});
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // 2. Fetch analytics for each site individually when they are loaded
  useEffect(() => {
    if (sites && sites.length > 0 && firestore) {
      const fetchAnalytics = async () => {
        setIsAnalyticsLoading(true);
        setAnalyticsError(null);
        
        const allProcessedData: Record<string, SiteAnalytics> = {};

        for (const site of sites) {
            try {
                const analyticsQuery = query(collection(firestore, 'analytics'), where('siteId', '==', site.projectName));
                const querySnapshot = await getDocs(analyticsQuery);
                const events = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as AnalyticsEvent[];
                
                const totalViews = events.length;
                const uniqueVisitors = new Set(events.map(e => e.userAgent)).size;

                const viewsByPath = events.reduce((acc, event) => {
                    const path = event.path || '/';
                    acc[path] = (acc[path] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const viewsByDate = events.reduce((acc, event) => {
                    const date = format(event.timestamp.toDate(), 'MMM d');
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const viewsOverTime = Object.entries(viewsByDate)
                    .map(([date, views]) => ({ date, views }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                allProcessedData[site.projectName] = {
                    totalViews,
                    uniqueVisitors,
                    viewsByPath,
                    viewsOverTime,
                };
            } catch (error) {
                 const permissionError = new FirestorePermissionError({
                    path: `analytics where siteId == ${site.projectName}`,
                    operation: 'list',
                });
                errorEmitter.emit('permission-error', permissionError);
                setAnalyticsError(`Could not load analytics for ${site.projectName}.`);
                // Stop fetching on first error
                break;
            }
        }
        setAnalyticsData(allProcessedData);
        setIsAnalyticsLoading(false);
      };
      fetchAnalytics();
    } else if (sites && sites.length === 0) {
       setAnalyticsData({});
    }
  }, [sites, firestore]);

  const isLoading = isUserLoading || isSitesLoading;
  const error = sitesError || (analyticsError ? new Error(analyticsError) : null);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center">
        <ServerCrash className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">We couldn't load your analytics. Please try again later.</p>
        <p className="text-sm text-muted-foreground/50">{error.message}</p>
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

        {sites && sites.length > 0 ? (
          <div className="space-y-12">
            {sites.map(site => {
                const data = analyticsData[site.projectName];
                const isLoadingAnalyticsForSite = isAnalyticsLoading || !data;
                return (
                    <div key={site.id}>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4 border-b pb-2">{site.projectName}</h2>
                        {isLoadingAnalyticsForSite && !analyticsData.hasOwnProperty(site.projectName) ? (
                           <SiteAnalyticsSkeleton />
                        ) : data && data.totalViews > 0 ? (
                           <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{data.totalViews}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{data.uniqueVisitors}</div></CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tracked Pages</CardTitle>
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{Object.keys(data.viewsByPath).length}</div></CardContent>
                                </Card>
                            </div>
                            
                            <div className="grid gap-6 md:grid-cols-5">
                               <Card className="md:col-span-3">
                                <CardHeader>
                                    <CardTitle>Views Over Time</CardTitle>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    {data.viewsOverTime.length > 0 ? (
                                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                        <RechartsBarChart data={data.viewsOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                            <YAxis allowDecimals={false} />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="views" fill="var(--color-views)" radius={4} />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                    ) : <p className="text-muted-foreground text-sm text-center py-10">Not enough data for chart.</p>
                                    }
                                </CardContent>
                               </Card>
                               <Card className="md:col-span-2">
                                <CardHeader><CardTitle>Views by Path</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Path</TableHead>
                                                <TableHead className="text-right">Views</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(data.viewsByPath).sort(([,a],[,b]) => b-a).map(([path, count]) => (
                                                <TableRow key={path}>
                                                    <TableCell className="font-medium truncate max-w-48">{path}</TableCell>
                                                    <TableCell className="text-right">{count}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                               </Card>
                            </div>
                           </div>
                        ) : (
                           <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                <h3 className="text-lg font-semibold">No Analytics Data Yet</h3>
                                <p className="text-muted-foreground mt-1">Visit your deployed site to start collecting data.</p>
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold mt-4">No sites deployed yet!</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              Deploy a site to start tracking its analytics.
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

const AnalyticsSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-10 w-36" />
        </div>
        <SiteAnalyticsSkeleton />
    </div>
);

const SiteAnalyticsSkeleton = () => (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><Skeleton className="h-5 w-24 mb-2"/><Skeleton className="h-7 w-12"/></CardHeader></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24 mb-2"/><Skeleton className="h-7 w-12"/></CardHeader></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24 mb-2"/><Skeleton className="h-7 w-12"/></CardHeader></Card>
        </div>
        <div className="grid gap-6 md:grid-cols-5">
            <Card className="md:col-span-3">
                <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                </CardContent>
            </Card>
        </div>
    </div>
);
