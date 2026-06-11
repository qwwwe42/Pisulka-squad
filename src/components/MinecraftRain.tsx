import React, { useEffect, useRef } from 'react';

type Intensity = 'lite' | 'normal' | 'storm';

interface MinecraftRainProps {
  intensity?: Intensity;
}

export const MinecraftRain: React.FC<MinecraftRainProps> = ({ intensity = 'normal' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    interface Drop {
      x: number;
      y: number;
      speed: number;
      length: number;
      width: number;
      opacity: number;
    }

    let drops: Drop[] = [];

    const getIntensityParams = (intensity: Intensity, containerWidth: number) => {
      let baseCount = 200;
      switch (intensity) {
        case 'lite': baseCount = 100; break;
        case 'normal': baseCount = 250; break;
        case 'storm': baseCount = 500; break;
      }
      return Math.floor(baseCount * (containerWidth / 1920));
    };

    const initDrops = (count: number) => {
      drops = [];
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height) - height,
          speed: 4 + Math.random() * 5,
          length: 10 + Math.floor(Math.random() * 8),
          width: 2 + Math.floor(Math.random() * 2),
          opacity: 0.3 + Math.random() * 0.4
        });
      }
    };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;
      
      initDrops(getIntensityParams(intensity, width));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        
        ctx.fillStyle = `rgba(150, 170, 200, ${drop.opacity})`;
        
        const drawX = Math.floor(drop.x);
        const drawY = Math.floor(drop.y);
        const drawW = Math.floor(drop.width);
        const drawH = Math.floor(drop.length);
        
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate((8 * Math.PI) / 180); // 8 degrees tilt
        ctx.fillRect(0, 0, drawW, drawH);
        ctx.restore();

        drop.y += drop.speed;
        drop.x += drop.speed * Math.tan((8 * Math.PI) / 180);

        if (drop.y > height) {
          drop.y = -drop.length;
          // Spawn near the top with some offset to avoid sudden pop-ins
          drop.x = Math.floor(Math.random() * (width + 100)) - 50; // offset for tilt spawning
          drop.speed = 4 + Math.random() * 5;
          drop.length = 10 + Math.floor(Math.random() * 8);
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};
