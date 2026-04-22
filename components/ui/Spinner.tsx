import { cn } from "@/lib/utils";

export default function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin-slow",
        className,
      )}
      aria-label="loading"
    />
  );
}
