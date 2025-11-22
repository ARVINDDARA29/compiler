'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirebase, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleClose = () => {
    setRating(0);
    setComment('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to submit feedback.',
      });
      return;
    }
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating Required',
        description: 'Please select a star rating.',
      });
      return;
    }
    if (!firestore) return;

    setIsLoading(true);

    const feedbackData = {
      userId: user.uid,
      userName: user.displayName,
      rating,
      comment,
      submittedAt: serverTimestamp(),
    };

    try {
      const feedbackCollection = collection(firestore, 'feedbacks');
      await addDoc(feedbackCollection, feedbackData).catch(err => {
         const permissionError = new FirestorePermissionError({
            path: 'feedbacks',
            operation: 'create',
            requestResourceData: feedbackData
         });
         errorEmitter.emit('permission-error', permissionError);
         throw permissionError;
      });

      toast({
        title: 'Feedback Submitted!',
        description: 'Thank you for helping us improve.',
      });
      handleClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your feedback. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            We'd love to hear what you think about RunAndDeploy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-8 w-8 cursor-pointer transition-colors',
                  (hoverRating >= star || rating >= star)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground'
                )}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more about your experience (optional)..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || rating === 0}>
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
