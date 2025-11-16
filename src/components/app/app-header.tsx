'use client';

import type { FC } from 'react';
import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  isDeploying: boolean;
  onDeploy: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({ isDeploying, onDeploy }) => {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold md:text-xl font-headline">CodeDeploy</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onDeploy} disabled={isDeploying} size="sm">
          {isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            'Deploy'
          )}
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
