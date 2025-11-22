
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Rocket } from 'lucide-react';

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectName: string, addWatermark: boolean) => void;
  isDeploying?: boolean;
}

export function DeployDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeploying,
}: DeployDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [addWatermark, setAddWatermark] = useState(true);

  const handleConfirm = () => {
    onConfirm(projectName, addWatermark);
  };
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!open) {
      setProjectName('');
      setAddWatermark(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="text-primary" />
            Deploy Project
          </DialogTitle>
          <DialogDescription>
            Enter a name for your project to deploy it to a public URL.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., my-awesome-site"
              autoComplete="off"
            />
             <p className="text-xs text-muted-foreground pt-1">
              Use lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox 
                id="add-watermark" 
                checked={addWatermark}
                onCheckedChange={(checked) => setAddWatermark(checked as boolean)}
            />
            <Label
              htmlFor="add-watermark"
              className="text-sm font-normal text-muted-foreground"
            >
              Add a "Powered by RunAndDeploy" watermark.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!projectName || isDeploying}
          >
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
