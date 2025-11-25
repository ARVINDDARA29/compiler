
'use client';

import { Button } from '@/components/ui/button';
import { Award, Star, Zap, Infinity } from 'lucide-react';
import { motion } from 'framer-motion';

interface UltraPrimeWelcomeProps {
  onConfirm: () => void;
}

const features = [
  { icon: Award, text: 'Unlimited Free Deployments' },
  { icon: Star, text: 'Priority Feature Access' },
  { icon: Zap, text: 'Exclusive "Prime" Profile Badge' },
  { icon: Infinity, text: 'All Future Features, Free Forever' },
];

export function UltraPrimeWelcome({ onConfirm }: UltraPrimeWelcomeProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="m-4 max-w-2xl rounded-2xl border-2 border-primary/50 bg-card p-8 text-center shadow-2xl shadow-primary/20"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Award className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Congratulations!
          </h1>
          <p className="mt-2 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-lg font-semibold text-transparent">
            You've Won an Ultra Prime Subscription!
          </p>
        </motion.div>

        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
        >
            <p className="mt-4 text-muted-foreground">
                You are one of our lucky first users! Enjoy these exclusive benefits, forever.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <feature.icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-card-foreground">{feature.text}</span>
                    </div>
                ))}
            </div>

            <Button onClick={onConfirm} size="lg" className="mt-10 w-full">
                Claim My Benefits & Enjoy!
            </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
