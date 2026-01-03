import { cn } from "@/lib/utils";

type BolaStatus = "NEGRA" | "ROJA" | "AMARILLA" | "VERDE";

interface BolaProps {
    status: BolaStatus;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    onClick?: () => void;
    selected?: boolean;
}

const COLOR_MAP = {
    NEGRA: "shadow-[inset_-2px_-2px_6px_rgba(255,255,255,0.1),inset_2px_2px_6px_rgba(0,0,0,0.8)] bg-neutral-800",
    ROJA: "shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.3),inset_2px_2px_8px_rgba(255,255,255,0.4)] bg-gradient-to-br from-red-400 to-red-600",
    AMARILLA: "shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.3),inset_2px_2px_8px_rgba(255,255,255,0.4)] bg-gradient-to-br from-yellow-300 to-yellow-500",
    VERDE: "shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.3),inset_2px_2px_8px_rgba(255,255,255,0.4)] bg-gradient-to-br from-emerald-400 to-emerald-600",
};

const SIZE_MAP = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
};

export const Bola = ({ status, size = "md", className, onClick, selected }: BolaProps) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-full bg-gradient-to-br shadow-sm transition-all duration-200 ease-in-out cursor-pointer hover:scale-110",
                COLOR_MAP[status],
                SIZE_MAP[size],
                selected && "ring-4 scale-110 shadow-lg",
                className
            )}
            aria-label={`Bola estado ${status}`}
        />
    );
};
