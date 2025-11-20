
'use client';

import type { FC } from 'react';
import { Loader2, Rocket, Play, Code, User as UserIcon, LogOut, MessageSquarePlus, LayoutGrid, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';

interface AppHeaderProps {
  isDeploying: boolean;
  onDeploy: () => void;
  onRun: () => void;
  onImport: () => void;
  mobileView: 'editor' | 'preview';
  onSwitchToCode: () => void;
  onFeedbackClick: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({ isDeploying, onDeploy, onRun, onImport, mobileView, onSwitchToCode, onFeedbackClick }) => {
  const isMobile = useIsMobile();
  const { user } = useUser();
  const auth = useAuth();


  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };
  
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold md:text-xl font-headline">RunAndDeploy</h1>
      </div>
      <div className="flex items-center gap-2">
        

        {isMobile && mobileView === 'preview' && (
           <Button onClick={onSwitchToCode} variant="outline" size="sm">
            <Code className="mr-2 h-4 w-4" />
            Code
          </Button>
        )}
        <Button onClick={onImport} variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button onClick={onRun} variant="outline" size="sm">
          <Play className="mr-2 h-4 w-4" />
          Run
        </Button>
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

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                  <AvatarFallback>{user.displayName?.[0]?.toUpperCase() ?? <UserIcon className='h-4 w-4' />}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
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
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
