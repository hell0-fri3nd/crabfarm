import React, { useEffect, useState } from 'react';

type BubbleProps = {
  count?: number;
};

type BubbleData = {
  size: number;
  left: number;
  duration: number;
  delay: number;
};

const Bubbles = ({ count = 20 }: BubbleProps) => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);

  // Generate random bubbles only after client mounts
  useEffect(() => {
    const arr = Array.from({ length: count }).map(() => ({
      size: Math.random() * 50 + 20, // 20px to 70px
      left: Math.random() * 100,     // 0% to 100%
      duration: Math.random() * 10 + 5,
      delay: Math.random() * 10,
    }));
    setBubbles(arr);
  }, [count]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes float {
          from { opacity: 1; }
          to { transform: translateY(-100vh); opacity: 0; }
        }
      `}</style>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary/30 pointer-events-none"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            top: '100%',
            animation: `float ${b.duration}s infinite linear`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Bubbles;
