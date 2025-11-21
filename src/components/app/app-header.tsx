
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Rocket, Play, Code, User as UserIcon, LogOut, MessageSquarePlus, LayoutGrid, Upload, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser, useAuth, useFirebase, useDoc } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '../ui/dropdown-menu';
import Link from 'next/link';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { doc, Timestamp } from 'firebase/firestore';

interface AppHeaderProps {
  isDeploying: boolean;
  isRunning: boolean;
  onDeploy: () => void;
  onRun: () => void;
  onImport: () => void;
  mobileView: 'editor' | 'preview';
  onSwitchToCode: () => void;
  onFeedbackClick: () => void;
}

interface AppState {
    id: string;
    baseCount: number;
    startedAt: Timestamp;
    incrementRatePerSecond: number;
}

function useDeploymentCounter() {
    const { firestore } = useFirebase();
    const counterDocRef = useMemo(() => firestore ? doc(firestore, 'app_state', 'deployment_counter') : null, [firestore]);
    const { data: counterData, isLoading: isDocLoading } = useDoc<AppState>(counterDocRef);
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        // Don't do anything until the document is loaded and exists
        if (isDocLoading || !counterData) {
            return;
        }
        
        const calculateCount = () => {
            const now = Date.now();
            const startTime = counterData.startedAt.toMillis();
            const secondsElapsed = Math.floor((now - startTime) / 1000);
            const increment = secondsElapsed * counterData.incrementRatePerSecond;
            // Use requestAnimationFrame to batch updates for smoother rendering
            requestAnimationFrame(() => {
                setCount(Math.floor(counterData.baseCount + increment));
            });
        };

        // Calculate immediately on load
        calculateCount();

        // Then update every 5 seconds
        const interval = setInterval(calculateCount, 5000);

        // Cleanup interval on component unmount or when dependencies change
        return () => clearInterval(interval);
    }, [counterData, isDocLoading]);

    return {count, isLoading: isDocLoading && count === null };
}


const AppHeader: FC<AppHeaderProps> = ({ isDeploying, isRunning, onDeploy, onRun, onImport, mobileView, onSwitchToCode, onFeedbackClick }) => {
  const isMobile = useIsMobile();
  const { user } = useUser();
  const auth = useAuth();
  const { count: deploymentCount, isLoading: isCounterLoading } = useDeploymentCounter();


  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };
  
  const UserMenuItems = () => (
    <>
      {user && (
        <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                </p>
            </div>
        </DropdownMenuLabel>
      )}
       <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/sites">
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>My Sites</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFeedbackClick}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            <span>Feedback</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
    </>
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-2 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="text-base font-semibold md:text-xl font-headline">RunAndDeploy</h1>
            <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm">
                <span className="text-muted-foreground font-medium">Total Deploys</span>
                <span className="font-semibold text-primary">
                    {isCounterLoading || deploymentCount === null ? '...' : new Intl.NumberFormat().format(deploymentCount)}
                </span>
            </div>
        </div>
        <div className="flex items-center justify-end gap-1 md:gap-2">
            <TooltipProvider delayDuration={0}>
                {isMobile ? (
                    <>
                        {mobileView === 'preview' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={onSwitchToCode} variant="outline" size="sm" className="flex-shrink-0">
                                        <Code className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Back to Code</p></TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onRun} variant="outline" size="sm" className="flex-shrink-0" disabled={isRunning}>
                                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Run Code</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onDeploy} disabled={isDeploying} size="sm" className="flex-shrink-0">
                                    {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isDeploying ? <p>Deploying...</p> : <p>Deploy Project</p>}</TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuItem onClick={onImport}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    <span>Import Files</span>
                                </DropdownMenuItem>
                                {user ? (
                                <UserMenuItems />
                                ) : (
                                    <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onFeedbackClick}>
                                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                                            <span>Feedback</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onImport} variant="outline" size="sm" className="flex-shrink-0">
                                    <Upload className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">Import</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Import Files</p>
                            </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onRun} variant="outline" size="sm" className="flex-shrink-0" disabled={isRunning}>
                                    {isRunning ? (
                                        <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                                    ) : (
                                        <Play className="h-4 w-4 md:mr-2" />
                                    )}
                                    <span className="hidden md:inline">{isRunning ? 'Running...' : 'Run'}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Run Code</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onDeploy} disabled={isDeploying} size="sm" className="flex-shrink-0">
                                    {isDeploying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="hidden md:inline ml-2">Deploying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="inline">Deploy</span>
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isDeploying ? <p>Deploying...</p> : <p>Deploy Project</p>}
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </TooltipProvider>

            {user && !isMobile && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full flex-shrink-0">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                                <AvatarFallback>{user.displayName?.[0]?.toUpperCase() ?? <UserIcon className='h-4 w-4' />}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <UserMenuItems />
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    </header>
  );
};

export default AppHeader;
