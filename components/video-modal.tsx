'use client';

import { useEffect, useState } from 'react';

interface VideoModalProps {
  isOpen: boolean;
}

export default function VideoModal({ isOpen }: VideoModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden border-3 border-pink-500 shadow-2xl">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
          title="Rick Roll Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
