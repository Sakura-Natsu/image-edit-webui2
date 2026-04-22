"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Brush, Eraser, RotateCcw } from "lucide-react";
import Button from "./ui/Button";
import Slider from "./ui/Slider";

interface Props {
  baseImageUrl: string;
  onChange: (maskDataUrl: string | null) => void;
}

type Tool = "brush" | "eraser";

export default function MaskCanvas({ baseImageUrl, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [tool, setTool] = useState<Tool>("brush");
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 512, h: 512 });
  const [hasDrawn, setHasDrawn] = useState(false);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = baseImageUrl;
  }, [baseImageUrl]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = dims.w;
    cv.height = dims.h;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    setHasDrawn(false);
    onChange(null);
  }, [dims, baseImageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  function toCanvasCoords(e: PointerEvent<HTMLCanvasElement>) {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * cv.width;
    const y = ((e.clientY - rect.top) / rect.height) * cv.height;
    return { x, y };
  }

  function strokeTo(x: number, y: number) {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = tool === "brush" ? "source-over" : "destination-out";
    ctx.strokeStyle = "rgba(204,106,63,0.9)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    if (lastRef.current) {
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
    } else {
      ctx.moveTo(x, y);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    lastRef.current = { x, y };
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    lastRef.current = null;
    const { x, y } = toCanvasCoords(e);
    strokeTo(x, y);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const { x, y } = toCanvasCoords(e);
    strokeTo(x, y);
  }

  function onUp() {
    drawingRef.current = false;
    lastRef.current = null;
    emitMask();
  }

  function emitMask() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
    let drawnPixels = 0;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 0) {
        drawnPixels++;
        if (drawnPixels > 10) break;
      }
    }
    if (drawnPixels === 0) {
      setHasDrawn(false);
      onChange(null);
      return;
    }
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = cv.width;
    exportCanvas.height = cv.height;
    const ex = exportCanvas.getContext("2d")!;
    ex.fillStyle = "#000000";
    ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    const maskData = ex.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const alpha = imgData.data[i + 3];
      if (alpha > 0) {
        maskData.data[i] = 0;
        maskData.data[i + 1] = 0;
        maskData.data[i + 2] = 0;
        maskData.data[i + 3] = 0;
      }
    }
    ex.putImageData(maskData, 0, 0);
    setHasDrawn(true);
    onChange(exportCanvas.toDataURL("image/png"));
  }

  function clearMask() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-alt)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={baseImageUrl}
          alt="原图"
          className="pointer-events-none block h-auto w-full select-none"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: tool === "brush" ? "crosshair" : "cell" }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3">
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] p-0.5">
          <button
            onClick={() => setTool("brush")}
            className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs ${
              tool === "brush"
                ? "bg-white text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-ink-mute)]"
            }`}
          >
            <Brush className="h-3.5 w-3.5" /> 画笔
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs ${
              tool === "eraser"
                ? "bg-white text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-ink-mute)]"
            }`}
          >
            <Eraser className="h-3.5 w-3.5" /> 橡皮
          </button>
        </div>
        <div className="min-w-40 flex-1">
          <Slider
            label="笔刷大小"
            value={brushSize}
            min={4}
            max={200}
            onChange={setBrushSize}
            suffix=" px"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={clearMask} disabled={!hasDrawn}>
          <RotateCcw className="h-3.5 w-3.5" /> 清除
        </Button>
      </div>
      <p className="text-xs text-[var(--color-ink-mute)]">
        涂抹的区域将被模型重绘；未涂抹区域保持不变。留空则模型可整体修改。
      </p>
    </div>
  );
}
