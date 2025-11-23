
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Rocket } from "lucide-react";

interface V2AnnouncementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function V2AnnouncementDialog({ open, onOpenChange }: V2AnnouncementDialogProps) {
    
    const handleConfirm = () => {
        localStorage.setItem('hasSeenV2Announcement', 'true');
        onOpenChange(false);
    }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Rocket className="h-6 w-6 text-primary" />
            </div>
          <AlertDialogTitle className="text-center text-xl">Hooray! Deployments are Faster!</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your sites now deploy in under 5 seconds. Enjoy the speed boost!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm} className="w-full">
            Awesome!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
