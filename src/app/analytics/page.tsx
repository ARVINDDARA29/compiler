
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirebase, useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  userId: string;
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

  const [selectedSiteProjectName, setSelectedSiteProjectName] = useState<string | null>(null);

  // 1. Fetch the user's sites for the dropdown
  const sitesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'sites'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: sites, isLoading: isSitesLoading, error: sitesError } = useCollection<DeployedSite>(sitesQuery);

  // 2. Set the first site as default when sites load
  useEffect(() => {
    if (!selectedSiteProjectName && sites && sites.length > 0) {
      setSelectedSiteProjectName(sites[0].projectName);
    }
  }, [sites, selectedSiteProjectName]);

  // 3. Fetch analytics for the *selected* site in real-time
  const analyticsQuery = useMemo(() => {
    if (!firestore || !selectedSiteProjectName || !user) return null;
    // The security rule now enforces the userId, so we only need to query by siteId
    return query(
        collection(firestore, 'analytics'), 
        where('siteId', '==', selectedSiteProjectName)
    );
  }, [firestore, selectedSiteProjectName, user]);

  const { data: analyticsEvents, isLoading: isAnalyticsLoading, error: analyticsError } = useCollection<AnalyticsEvent>(analyticsQuery);

  // 4. Process the real-time analytics data
  const processedAnalytics = useMemo((): SiteAnalytics | null => {
    if (!analyticsEvents) return null;

    const totalViews = analyticsEvents.length;
    const uniqueVisitors = new Set(analyticsEvents.map(e => e.userAgent)).size;

    const viewsByPath = analyticsEvents.reduce((acc, event) => {
        const path = event.path || '/';
        acc[path] = (acc[path] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const viewsByDate = analyticsEvents.reduce((acc, event) => {
        const date = format(event.timestamp.toDate(), 'MMM d');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const viewsOverTime = Object.entries(viewsByDate)
        .map(([date, views]) => ({ date, views }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return { totalViews, uniqueVisitors, viewsByPath, viewsOverTime };

  }, [analyticsEvents]);


  const isLoading = isUserLoading || isSitesLoading;
  const error = sitesError || analyticsError;

  if (isLoading && !sites) { // Show main skeleton only on initial load
    return <AnalyticsSkeleton />;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
        <ServerCrash className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 max-w-md">We couldn't load your analytics. It might be a permission issue. Please try again later.</p>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Site Analytics</h1>
             <Button asChild variant="outline">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Back to Editor
                </Link>
            </Button>
        </div>

        {sites && sites.length > 0 ? (
          <div className="space-y-8">
            <div className="max-w-sm">
              <Select
                value={selectedSiteProjectName ?? ""}
                onValueChange={setSelectedSiteProjectName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.projectName}>
                      {site.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAnalyticsLoading && <SiteAnalyticsSkeleton />}

            {!isAnalyticsLoading && processedAnalytics && (
               processedAnalytics.totalViews > 0 ? (
                   <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{processedAnalytics.totalViews}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{processedAnalytics.uniqueVisitors}</div></CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tracked Pages</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{Object.keys(processedAnalytics.viewsByPath).length}</div></CardContent>
                        </Card>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-5">
                       <Card className="md:col-span-3">
                        <CardHeader>
                            <CardTitle>Views Over Time</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            {processedAnalytics.viewsOverTime.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <RechartsBarChart data={processedAnalytics.viewsOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
                                    {Object.entries(processedAnalytics.viewsByPath).sort(([,a],[,b]) => b-a).map(([path, count]) => (
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
                        <p className="text-muted-foreground mt-1">Visit your deployed site to start collecting data for '{selectedSiteProjectname}'.</p>
                    </div>
               )
            )}
            
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
        <div className="max-w-sm mb-8">
          <Skeleton className="h-10 w-full" />
        </div>
        <SiteAnalyticsSkeleton />
    </div>
);

const SiteAnalyticsSkeleton = () => (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-24"/><Skeleton className="h-4 w-4"/></CardHeader><CardContent><Skeleton className="h-7 w-12 mt-2"/></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-24"/><Skeleton className="h-4 w-4"/></CardHeader><CardContent><Skeleton className="h-7 w-12 mt-2"/></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-24"/><Skeleton className="h-4 w-4"/></CardHeader><CardContent><Skeleton className="h-7 w-12 mt-2"/></CardContent></Card>
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
            </card>
        </div>
    </div>
);
    