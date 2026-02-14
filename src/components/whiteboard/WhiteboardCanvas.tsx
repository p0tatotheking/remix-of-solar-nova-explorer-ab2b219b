import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Minus, Plus, Eraser, Trash2, Download, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
  userId?: string;
  username?: string;
}

interface WhiteboardCanvasProps {
  assignedColor?: string;
  strokes: Stroke[];
  onStroke: (stroke: Stroke) => void;
  onClear?: () => void;
  readOnly?: boolean;
}

const BRUSH_COLORS = [
  '#ffffff', '#ff4444', '#44ff44', '#4488ff', '#ffff44',
  '#ff44ff', '#44ffff', '#ff8844', '#8844ff', '#44ff88',
  '#ff4488', '#88ff44', '#000000',
];

export const WhiteboardCanvas = ({ assignedColor, strokes, onStroke, onClear, readOnly }: WhiteboardCanvasProps) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState(assignedColor || '#ffffff');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);

  // Use assigned color for community mode
  useEffect(() => {
    if (assignedColor) setBrushColor(assignedColor);
  }, [assignedColor]);

  // Redraw canvas when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...strokes, ...localStrokes];
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#1a1a2e' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.size * 3 : stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    // Draw current stroke
    if (currentStroke && currentStroke.points.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = currentStroke.tool === 'eraser' ? '#1a1a2e' : currentStroke.color;
      ctx.lineWidth = currentStroke.tool === 'eraser' ? currentStroke.size * 3 : currentStroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, localStrokes, currentStroke]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setCurrentStroke({
      points: [pos],
      color: tool === 'eraser' ? '#1a1a2e' : brushColor,
      size: brushSize,
      tool,
      userId: user?.id,
      username: user?.username,
    });
  }, [readOnly, getPos, brushColor, brushSize, tool, user]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke(prev => {
      if (!prev) return null;
      return { ...prev, points: [...prev.points, pos] };
    });
  }, [isDrawing, readOnly, getPos]);

  const handleEnd = useCallback(() => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    if (currentStroke.points.length >= 2) {
      onStroke(currentStroke);
      setLocalStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  }, [isDrawing, currentStroke, onStroke]);

  const handleUndo = () => {
    setLocalStrokes(prev => prev.slice(0, -1));
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 border-b border-border/30 flex-wrap">
        {/* Tool selection */}
        <Button
          variant={tool === 'pen' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('pen')}
        >
          ✏️ Pen
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('eraser')}
        >
          <Eraser className="w-4 h-4 mr-1" /> Eraser
        </Button>

        <div className="h-6 w-px bg-border/50 mx-1" />

        {/* Brush size */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Minus className="w-3 h-3 text-muted-foreground" />
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={1}
            max={30}
            step={1}
            className="w-20"
          />
          <Plus className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground w-6">{brushSize}</span>
        </div>

        <div className="h-6 w-px bg-border/50 mx-1" />

        {/* Colors - only show if no assigned color */}
        {!assignedColor && (
          <div className="flex items-center gap-1 flex-wrap">
            {BRUSH_COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setBrushColor(c); setTool('pen'); }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  brushColor === c && tool === 'pen' ? 'border-primary scale-125' : 'border-border/50'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {assignedColor && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Your color:</span>
            <div
              className="w-6 h-6 rounded-full border-2 border-primary"
              style={{ backgroundColor: assignedColor }}
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <Button variant="ghost" size="sm" onClick={handleUndo} title="Undo">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} title="Download">
          <Download className="w-4 h-4" />
        </Button>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} title="Clear All" className="text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="block"
        />
      </div>
    </div>
  );
};
