import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  data: number[];
  color: string; // Tailwind bg/stroke color class name root, e.g. 'emerald-500'
  width?: number;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color, width = 100, height = 30 }) => {
  // If data is empty or all zeros, render a flat line
  const { pathData, dotPosition } = useMemo(() => {
    if (!data || data.length === 0) {
      return { pathData: `M 0,${height} L ${width},${height}`, dotPosition: { x: width, y: height } };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // Prevent division by zero

    const stepX = width / (data.length - 1 || 1);
    
    // Generate curved path using bezier commands or simple lines
    const points = data.map((val, i) => {
      const x = i * stepX;
      // Invert Y because SVG 0 is at top
      const y = height - ((val - min) / range) * height * 0.8 - (height * 0.1); 
      return { x, y };
    });

    // Create a smooth curve
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        // Simple smoothing (Cubic Bezier)
        const p0 = points[i - 1];
        const p1 = points[i];
        const cx = (p0.x + p1.x) / 2;
        path += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }

    return { 
      pathData: path, 
      dotPosition: points[points.length - 1] 
    };
  }, [data, width, height]);

  // Extract raw color to use directly in stroke if not tailwind classes
  const isTextClass = color.startsWith('text-');
  const rawColorClass = isTextClass ? color : `text-${color}`;

  return (
    <div className="relative overflow-visible" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Glow behind line */}
        <defs>
          <filter id={`glow-${color}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <motion.path
          d={pathData}
          fill="none"
          className={`stroke-current ${rawColorClass} opacity-80`}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Animated dot at the end */}
        <motion.circle
          cx={dotPosition.x}
          cy={dotPosition.y}
          r="3"
          className={`fill-current ${rawColorClass}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        />
      </svg>
    </div>
  );
};

export default Sparkline;
