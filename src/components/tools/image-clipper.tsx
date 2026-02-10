"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, RotateCcw, Plus, Trash2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type ClipPathType = "circle" | "ellipse" | "polygon" | "inset";

interface Point {
  x: number;
  y: number;
}

export function ImageClipper() {
  const [clipPathType, setClipPathType] = useState<ClipPathType>("polygon");
  const [isCopied, setIsCopied] = useState(false);
  const [format, setFormat] = useState<"css" | "jsx">("css");
  
  // Circle
  const [circleRadius, setCircleRadius] = useState(50);
  const [circleX, setCircleX] = useState(50);
  const [circleY, setCircleY] = useState(50);
  
  // Ellipse
  const [ellipseRX, setEllipseRX] = useState(50);
  const [ellipseRY, setEllipseRY] = useState(30);
  const [ellipseX, setEllipseX] = useState(50);
  const [ellipseY, setEllipseY] = useState(50);
  
  // Polygon
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([
    { x: 50, y: 0 },
    { x: 100, y: 50 },
    { x: 50, y: 100 },
    { x: 0, y: 50 },
  ]);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Inset
  const [insetTop, setInsetTop] = useState(10);
  const [insetRight, setInsetRight] = useState(10);
  const [insetBottom, setInsetBottom] = useState(10);
  const [insetLeft, setInsetLeft] = useState(10);
  const [insetRound, setInsetRound] = useState(0);

  // Generate clip-path CSS
  const generateClipPath = useCallback(() => {
    switch (clipPathType) {
      case "circle":
        return `circle(${circleRadius}% at ${circleX}% ${circleY}%)`;
      case "ellipse":
        return `ellipse(${ellipseRX}% ${ellipseRY}% at ${ellipseX}% ${ellipseY}%)`;
      case "polygon":
        const pointsStr = polygonPoints.map(p => `${p.x}% ${p.y}%`).join(", ");
        return `polygon(${pointsStr})`;
      case "inset":
        const insetStr = `${insetTop}% ${insetRight}% ${insetBottom}% ${insetLeft}%`;
        const roundStr = insetRound > 0 ? ` round ${insetRound}%` : "";
        return `inset(${insetStr}${roundStr})`;
      default:
        return "";
    }
  }, [clipPathType, circleRadius, circleX, circleY, ellipseRX, ellipseRY, ellipseX, ellipseY, polygonPoints, insetTop, insetRight, insetBottom, insetLeft, insetRound]);

  const clipPathString = generateClipPath();

  // Generate code output
  const generateCode = useCallback(() => {
    if (format === "jsx") {
      return `style={{ clipPath: '${clipPathString}' }}`;
    } else {
      return `clip-path: ${clipPathString};`;
    }
  }, [clipPathString, format]);

  const code = generateCode();

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Reset to default
  const handleReset = () => {
    setClipPathType("polygon");
    setCircleRadius(50);
    setCircleX(50);
    setCircleY(50);
    setEllipseRX(50);
    setEllipseRY(30);
    setEllipseX(50);
    setEllipseY(50);
    setPolygonPoints([
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ]);
    setInsetTop(10);
    setInsetRight(10);
    setInsetBottom(10);
    setInsetLeft(10);
    setInsetRound(0);
    setFormat("css");
  };

  // Polygon point management
  const handleAddPoint = () => {
    const lastPoint = polygonPoints[polygonPoints.length - 1];
    const newPoint: Point = {
      x: Math.min(100, lastPoint.x + 10),
      y: Math.min(100, lastPoint.y + 10),
    };
    setPolygonPoints([...polygonPoints, newPoint]);
  };

  const handleRemovePoint = (index: number) => {
    if (polygonPoints.length <= 3) return; // Keep at least 3 points
    setPolygonPoints(polygonPoints.filter((_, i) => i !== index));
    if (selectedPointIndex === index) {
      setSelectedPointIndex(null);
    } else if (selectedPointIndex !== null && selectedPointIndex > index) {
      setSelectedPointIndex(selectedPointIndex - 1);
    }
  };

  // Handle polygon point dragging
  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedPointIndex(index);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || selectedPointIndex === null || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setPolygonPoints((prev) =>
      prev.map((point, i) =>
        i === selectedPointIndex ? { x: clampedX, y: clampedY } : point
      )
    );
  }, [isDragging, selectedPointIndex]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Get preview dimensions
  const previewSize = 400;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto p-4 gap-6">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold mb-1">CSS Clip-Path Generator</h1>
        <p className="text-sm text-muted-foreground">
          Create custom clip-path shapes for your images and elements. Drag polygon points to customize shapes.
        </p>
      </div>

      {/* Shape Type Selector */}
      <div className="flex items-center gap-4 shrink-0">
        <Label className="text-sm font-medium">Shape Type</Label>
        <Tabs value={clipPathType} onValueChange={(v) => setClipPathType(v as ClipPathType)}>
          <TabsList>
            <TabsTrigger value="circle">Circle</TabsTrigger>
            <TabsTrigger value="ellipse">Ellipse</TabsTrigger>
            <TabsTrigger value="polygon">Polygon</TabsTrigger>
            <TabsTrigger value="inset">Inset</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="w-full flex items-center justify-center">
        <div
          ref={previewRef}
          className="relative border border-border rounded-lg overflow-hidden shadow-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
          style={{
            width: `${previewSize}px`,
            height: `${previewSize}px`,
            clipPath: clipPathString,
          }}
        >
          {/* Polygon point indicators */}
          {clipPathType === "polygon" && (
            <>
              {polygonPoints.map((point, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute w-4 h-4 rounded-full border-2 cursor-move transition-all",
                    selectedPointIndex === index
                      ? "bg-primary border-primary-foreground scale-125"
                      : "bg-background border-primary hover:scale-110"
                  )}
                  style={{
                    left: `calc(${point.x}% - 8px)`,
                    top: `calc(${point.y}% - 8px)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(index, e)}
                  title={`Point ${index + 1}: ${point.x.toFixed(1)}%, ${point.y.toFixed(1)}%`}
                />
              ))}
              {/* Draw lines between points */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%" }}
              >
                <polyline
                  points={polygonPoints
                    .map((p) => `${(p.x / 100) * previewSize},${(p.y / 100) * previewSize}`)
                    .join(" ")}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {/* Circle Controls */}
        {clipPathType === "circle" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Radius: {circleRadius}%</Label>
              <Slider
                value={[circleRadius]}
                onValueChange={([value]) => setCircleRadius(value)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">X Position: {circleX}%</Label>
                <Slider
                  value={[circleX]}
                  onValueChange={([value]) => setCircleX(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Y Position: {circleY}%</Label>
                <Slider
                  value={[circleY]}
                  onValueChange={([value]) => setCircleY(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ellipse Controls */}
        {clipPathType === "ellipse" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Radius X: {ellipseRX}%</Label>
                <Slider
                  value={[ellipseRX]}
                  onValueChange={([value]) => setEllipseRX(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Radius Y: {ellipseRY}%</Label>
                <Slider
                  value={[ellipseRY]}
                  onValueChange={([value]) => setEllipseRY(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">X Position: {ellipseX}%</Label>
                <Slider
                  value={[ellipseX]}
                  onValueChange={([value]) => setEllipseX(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Y Position: {ellipseY}%</Label>
                <Slider
                  value={[ellipseY]}
                  onValueChange={([value]) => setEllipseY(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Polygon Controls */}
        {clipPathType === "polygon" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Polygon Points ({polygonPoints.length})</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPoint}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Point
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {polygonPoints.map((point, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded border border-border bg-muted/30">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-medium w-16">Point {index + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">X</Label>
                        <Input
                          type="number"
                          value={point.x.toFixed(1)}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                            setPolygonPoints((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, x: value } : p))
                            );
                          }}
                          min={0}
                          max={100}
                          step={0.1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Y</Label>
                        <Input
                          type="number"
                          value={point.y.toFixed(1)}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                            setPolygonPoints((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, y: value } : p))
                            );
                          }}
                          min={0}
                          max={100}
                          step={0.1}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePoint(index)}
                    disabled={polygonPoints.length <= 3}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Drag the points on the preview to adjust the polygon shape
            </p>
          </div>
        )}

        {/* Inset Controls */}
        {clipPathType === "inset" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Top: {insetTop}%</Label>
                <Slider
                  value={[insetTop]}
                  onValueChange={([value]) => setInsetTop(value)}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Right: {insetRight}%</Label>
                <Slider
                  value={[insetRight]}
                  onValueChange={([value]) => setInsetRight(value)}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bottom: {insetBottom}%</Label>
                <Slider
                  value={[insetBottom]}
                  onValueChange={([value]) => setInsetBottom(value)}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Left: {insetLeft}%</Label>
                <Slider
                  value={[insetLeft]}
                  onValueChange={([value]) => setInsetLeft(value)}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Round Edges: {insetRound}%</Label>
              <Slider
                value={[insetRound]}
                onValueChange={([value]) => setInsetRound(value)}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Round edges may not be supported in all browsers
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Code Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Generated Code</Label>
          <div className="flex items-center gap-2">
            <Tabs value={format} onValueChange={(v) => setFormat(v as "css" | "jsx")}>
              <TabsList className="h-8">
                <TabsTrigger value="css" className="text-xs px-3">CSS</TabsTrigger>
                <TabsTrigger value="jsx" className="text-xs px-3">JSX</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleCopy} variant="default" size="sm">
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="bg-muted rounded-lg p-3 font-mono text-xs border border-border">
          <pre className="whitespace-pre-wrap text-foreground break-words overflow-wrap-anywhere">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}


