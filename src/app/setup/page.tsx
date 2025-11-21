
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

export default function SetupPage() {
  const { firestore } = useFirebase();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    if (!firestore) {
      setMessage('Firestore is not available.');
      return;
    }
    setIsLoading(true);
    setMessage('Initializing counter...');

    const counterRef = doc(firestore, 'app_state', 'deployment_counter');
    const counterData = {
      baseCount: 50000,
      startedAt: new Date(), // Use current time as the start time
      incrementRatePerSecond: 1, // Increment by 1 every second
    };

    try {
      await setDoc(counterRef, counterData);
      setMessage('Success! The deployment counter has been initialized. You can now go back to the homepage.');
    } catch (error: any) {
      console.error('Error initializing counter:', error);
      setMessage(`Failed to initialize counter: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <h1 className="text-2xl font-bold mb-4">One-Time Counter Setup</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Click the button below to initialize the global deployment counter in the database. This is a one-time action.
      </p>
      <Button onClick={handleSetup} disabled={isLoading}>
        {isLoading ? 'Initializing...' : 'Initialize Deployment Counter'}
      </Button>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}

    