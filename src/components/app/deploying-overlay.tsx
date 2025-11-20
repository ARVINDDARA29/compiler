'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const features = [
  "Powered by Arvind Dara Bishnoi",
  "Unlimited Free Hosting",
  "Get Unlimited Links",
  "One-Click Deployment",
  "Live Previews",
  "HTML, CSS, & JS Editor",
];

const DeployingOverlay = () => {
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 2500); // Change text every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
      <h2 className="text-2xl font-semibold text-white mb-4">Deploying...</h2>
      <div className="relative h-6 w-64 overflow-hidden">
        {features.map((feature, index) => (
            <p
              key={index}
              className={`absolute w-full text-center text-lg text-white transition-transform duration-500 ease-in-out ${
                index === currentFeatureIndex
                  ? 'transform translate-y-0 opacity-100'
                  : 'transform -translate-y-full opacity-0'
              }`}
            >
              {feature}
            </p>
        ))}
      </div>
    </div>
  );
};

export default DeployingOverlay;
