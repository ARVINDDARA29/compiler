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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirebase } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  AuthError,
  User,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = 'login' | 'signup';

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const { firestore } = useFirebase();

  const handleAuthSuccess = async (user: User, isNewUser = false) => {
    if (isNewUser && firestore) {
      // Update profile and create user document
      try {
        await updateProfile(user, { displayName: name });
        const userDocRef = doc(firestore, 'users', user.uid);
        // Use standard setDoc for reliability
        await setDoc(userDocRef, {
          name: name,
          email: user.email,
          id: user.uid,
        }, { merge: true });
        toast({ title: 'Signup successful!', description: 'You can now deploy your project.' });
      } catch (error) {
        console.error("Failed to create user document:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save user profile.' });
      }
    } else {
      toast({ title: 'Login successful!', description: 'You can now deploy your project.' });
    }
    onOpenChange(false);
  };

  const handleAuthAction = async () => {
    if (!auth) {
        toast({variant: 'destructive', title: 'Auth service not available'});
        return;
    }
    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        if (!name) {
          toast({ variant: 'destructive', title: 'Name is required' });
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(userCredential.user, true);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(userCredential.user, false);
      }
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: authError.code === 'auth/email-already-in-use' 
          ? 'This email is already in use. Please log in.'
          : authError.message,
      });
      if (authError.code === 'auth/email-already-in-use') {
        setAuthMode('login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
    // Keep email and password fields for a smoother UX if they switch back and forth
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{authMode === 'signup' ? 'Create an Account' : 'Log In'}</DialogTitle>
          <DialogDescription>
            {authMode === 'signup'
              ? 'Sign up to deploy your projects and save your work.'
              : 'Log in to your account to continue.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {authMode === 'signup' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Your Name"
                autoComplete="name"
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>
        <DialogFooter className='sm:justify-between items-center'>
            <Button variant="link" size="sm" onClick={toggleAuthMode} className="p-0 h-auto">
              {authMode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Log in'}
            </Button>
            <Button type="submit" onClick={handleAuthAction} disabled={isLoading}>
                {isLoading ? 'Processing...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
