import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  opacity: number;
}

export function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Create snowflakes - not too many to avoid being intrusive
    const flakes: Snowflake[] = [];
    const count = 35; // Subtle amount

    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 8 + Math.random() * 12, // 8-20s fall time
        animationDelay: Math.random() * -20, // Staggered start
        size: 2 + Math.random() * 4, // 2-6px
        opacity: 0.3 + Math.random() * 0.4, // 0.3-0.7 opacity
      });
    }

    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        @keyframes snowSway {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(20px);
          }
        }
      `}</style>
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 text-white"
          style={{
            left: `${flake.left}%`,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
          }}
        >
          <div
            className="w-full h-full rounded-full bg-white/80"
            style={{
              animation: `snowSway ${3 + Math.random() * 2}s ease-in-out infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
