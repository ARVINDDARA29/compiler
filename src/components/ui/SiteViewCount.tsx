
'use client';

import { useFirebase, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';

interface View {
  id: string;
  timestamp: any;
}

export function SiteViewCount({ siteId }: { siteId: string }) {
  const { firestore } = useFirebase();

  const viewsQuery = useMemo(() => {
    if (!firestore || !siteId) return null;
    return query(
      collection(firestore, 'views'),
      where('siteId', '==', siteId)
    );
  }, [firestore, siteId]);

  const { data: views, isLoading, error } = useCollection<View>(viewsQuery);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">Error</div>;
  }

  return (
    <div className="text-sm text-muted-foreground">
      {views?.length ?? 0} views
    </div>
  );
}
