
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (enableUserSpecificUrl: boolean) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onConfirm,
}: SettingsDialogProps) {
  const [enableUserSpecificUrl, setEnableUserSpecificUrl] = useState(true);

  const handleConfirm = () => {
    onConfirm(enableUserSpecificUrl);
    onOpenChange(false);
  };
  
  useEffect(() => {
    if (open) {
      // Default to 'true' if the value is not found in localStorage
      const storedValue = localStorage.getItem('enableUserSpecificUrl');
      if (storedValue !== null) {
        setEnableUserSpecificUrl(JSON.parse(storedValue));
      } else {
        setEnableUserSpecificUrl(true);
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Customize your experience.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
        <div className="flex items-center space-x-2 mt-2">
            <Checkbox 
                id="enable-user-specific-url" 
                checked={enableUserSpecificUrl}
                onCheckedChange={(checked) => {
                    const isChecked = checked as boolean;
                    setEnableUserSpecificUrl(isChecked);
                    localStorage.setItem('enableUserSpecificUrl', JSON.stringify(isChecked));
                }}
            />
            <Label
              htmlFor="enable-user-specific-url"
              className="text-sm font-normal"
            >
              Enable User-Specific URL (e.g., your-name-project-name)
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
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
