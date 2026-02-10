"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, RotateCcw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type GradientType = "linear" | "radial";

interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export function GradientGenerator() {
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(90);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { id: "1", color: "#2A7B9B", position: 0 },
    { id: "2", color: "#57C785", position: 50 },
    { id: "3", color: "#EDDD53", position: 100 },
  ]);
  const [radialShape, setRadialShape] = useState<"circle" | "ellipse">("circle");
  const [radialSize, setRadialSize] = useState<string>("farthest-corner");
  const [radialPosition, setRadialPosition] = useState<string>("center");
  const [isCopied, setIsCopied] = useState(false);
  const [format, setFormat] = useState<"css" | "jsx">("css");

  // Generate CSS gradient string
  const generateGradient = useCallback(() => {
    const stops = colorStops
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(", ");

    if (gradientType === "linear") {
      return `linear-gradient(${angle}deg, ${stops})`;
    } else {
      const shape = radialShape === "circle" ? "circle" : "ellipse";
      return `radial-gradient(${shape} ${radialSize} at ${radialPosition}, ${stops})`;
    }
  }, [gradientType, angle, colorStops, radialShape, radialSize, radialPosition]);

  const gradientString = generateGradient();

  // Generate code output
  const generateCode = useCallback(() => {
    const gradient = gradientString;
    
    if (format === "jsx") {
      return `style={{ background: '${gradient}' }}`;
    } else {
      return `background: ${gradient};`;
    }
  }, [gradientString, format]);

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

  // Add color stop
  const handleAddColorStop = () => {
    const newPosition = colorStops.length > 0 
      ? Math.min(100, Math.max(0, colorStops[colorStops.length - 1].position + 10))
      : 50;
    
    setColorStops([
      ...colorStops,
      {
        id: Date.now().toString(),
        color: "#000000",
        position: newPosition,
      },
    ]);
  };

  // Remove color stop
  const handleRemoveColorStop = (id: string) => {
    if (colorStops.length <= 2) return; // Keep at least 2 stops
    setColorStops(colorStops.filter((stop) => stop.id !== id));
  };

  // Update color stop
  const handleUpdateColorStop = (id: string, updates: Partial<ColorStop>) => {
    setColorStops(
      colorStops.map((stop) =>
        stop.id === id ? { ...stop, ...updates } : stop
      )
    );
  };

  // Reset to default
  const handleReset = () => {
    setGradientType("linear");
    setAngle(90);
    setColorStops([
      { id: "1", color: "#2A7B9B", position: 0 },
      { id: "2", color: "#57C785", position: 50 },
      { id: "3", color: "#EDDD53", position: 100 },
    ]);
    setRadialShape("circle");
    setRadialSize("farthest-corner");
    setRadialPosition("center");
    setFormat("css");
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number = 1): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Generate CSS with fallback
  const generateFullCss = useCallback(() => {
    const stops = colorStops
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(", ");

    if (gradientType === "linear") {
      return `background: ${colorStops[0]?.color || "#000000"};
background: linear-gradient(${angle}deg, ${stops});`;
    } else {
      const shape = radialShape === "circle" ? "circle" : "ellipse";
      return `background: ${colorStops[0]?.color || "#000000"};
background: radial-gradient(${shape} ${radialSize} at ${radialPosition}, ${stops});`;
    }
  }, [gradientType, angle, colorStops, radialShape, radialSize, radialPosition]);

  const fullCss = generateFullCss();

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto p-4 gap-6">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold mb-1">CSS Gradient Generator</h1>
        <p className="text-sm text-muted-foreground">
          Create beautiful linear and radial gradients. Adjust colors, positions, and angles to create your perfect gradient.
        </p>
      </div>

      {/* Gradient Type Selector */}
      <div className="flex items-center gap-4 shrink-0">
        <Label className="text-sm font-medium">Gradient Type</Label>
        <Tabs value={gradientType} onValueChange={(v) => setGradientType(v as GradientType)}>
          <TabsList>
            <TabsTrigger value="linear">Linear</TabsTrigger>
            <TabsTrigger value="radial">Radial</TabsTrigger>
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
      <div className="w-full h-64 rounded-lg border border-border overflow-hidden shadow-lg">
        <div
          className="w-full h-full"
          style={{ background: gradientString }}
        />
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {/* Linear Gradient Controls */}
        {gradientType === "linear" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Angle: {angle}°</Label>
            <Slider
              value={[angle]}
              onValueChange={([value]) => setAngle(value)}
              min={0}
              max={360}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0°</span>
              <span>90°</span>
              <span>180°</span>
              <span>270°</span>
              <span>360°</span>
            </div>
          </div>
        )}

        {/* Radial Gradient Controls */}
        {gradientType === "radial" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Shape</Label>
              <Select value={radialShape} onValueChange={(v) => setRadialShape(v as "circle" | "ellipse")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="ellipse">Ellipse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Size</Label>
              <Select value={radialSize} onValueChange={setRadialSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closest-side">Closest Side</SelectItem>
                  <SelectItem value="farthest-side">Farthest Side</SelectItem>
                  <SelectItem value="closest-corner">Closest Corner</SelectItem>
                  <SelectItem value="farthest-corner">Farthest Corner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Select value={radialPosition} onValueChange={setRadialPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="top left">Top Left</SelectItem>
                  <SelectItem value="top right">Top Right</SelectItem>
                  <SelectItem value="bottom left">Bottom Left</SelectItem>
                  <SelectItem value="bottom right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Color Stops */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Color Stops</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddColorStop}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Color
            </Button>
          </div>

          <div className="space-y-3">
            {colorStops
              .sort((a, b) => a.position - b.position)
              .map((stop) => (
                <div key={stop.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative">
                      <input
                        type="color"
                        value={stop.color}
                        onChange={(e) =>
                          handleUpdateColorStop(stop.id, { color: e.target.value })
                        }
                        className="w-12 h-10 rounded border border-border cursor-pointer"
                      />
                    </div>
                    <Input
                      type="text"
                      value={stop.color}
                      onChange={(e) =>
                        handleUpdateColorStop(stop.id, { color: e.target.value })
                      }
                      className="flex-1 h-10 font-mono text-sm"
                      placeholder="#000000"
                    />
                    <div className="w-24">
                      <Input
                        type="number"
                        value={stop.position}
                        onChange={(e) =>
                          handleUpdateColorStop(stop.id, {
                            position: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                          })
                        }
                        min={0}
                        max={100}
                        className="h-10 text-sm"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">%</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveColorStop(stop.id)}
                    disabled={colorStops.length <= 2}
                    className="h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>

          {/* Visual Color Stop Bar */}
          <div className="relative h-8 rounded border border-border overflow-hidden">
            <div
              className="absolute inset-0"
              style={{ background: gradientString }}
            />
            {colorStops
              .sort((a, b) => a.position - b.position)
              .map((stop) => (
                <div
                  key={stop.id}
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm"
                  style={{ left: `${stop.position}%` }}
                >
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                    {stop.position}%
                  </div>
                </div>
              ))}
          </div>
        </div>
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
            {format === "css" ? fullCss : code}
          </pre>
        </div>
      </div>
    </div>
  );
}


