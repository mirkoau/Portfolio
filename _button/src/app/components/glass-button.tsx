import { useState, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";

export type ButtonVariant =
  | "silver"
  | "coral"
  | "mint"
  | "lavender"
  | "blue";

const variants: Record<
  ButtonVariant,
  {
    text: string;
    textShadow: string;
    borderTop: string;
    borderDefault: string;
    hoverFill: string;
    sweepColor: string;
    rippleColor: string;
    iconColor: string;
  }
> = {
  silver: {
    text: "rgba(255,255,255,0.92)",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    borderTop: "rgba(255,255,255,0.3)",
    borderDefault: "rgba(255,255,255,0.14)",
    hoverFill:
      "linear-gradient(180deg, rgba(220,225,235,0.14) 0%, rgba(200,210,225,0.08) 100%)",
    sweepColor: "rgba(255,255,255,0.20)",
    rippleColor: "rgba(255,255,255,0.25)",
    iconColor: "rgba(255,255,255,0.85)",
  },
  coral: {
    text: "rgba(255,130,100,0.95)",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    borderTop: "rgba(255,140,110,0.35)",
    borderDefault: "rgba(255,120,90,0.18)",
    hoverFill:
      "linear-gradient(180deg, rgba(255,120,90,0.14) 0%, rgba(255,100,70,0.06) 100%)",
    sweepColor: "rgba(255,140,110,0.22)",
    rippleColor: "rgba(255,120,90,0.2)",
    iconColor: "rgba(255,140,110,0.85)",
  },
  mint: {
    text: "rgba(132,255,249,0.92)",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    borderTop: "rgba(132,255,249,0.3)",
    borderDefault: "rgba(132,255,249,0.15)",
    hoverFill:
      "linear-gradient(180deg, rgba(132,255,249,0.12) 0%, rgba(100,220,215,0.05) 100%)",
    sweepColor: "rgba(132,255,249,0.18)",
    rippleColor: "rgba(132,255,249,0.2)",
    iconColor: "rgba(132,255,249,0.85)",
  },
  lavender: {
    text: "rgba(180,160,255,0.95)",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    borderTop: "rgba(180,160,255,0.3)",
    borderDefault: "rgba(180,160,255,0.15)",
    hoverFill:
      "linear-gradient(180deg, rgba(180,160,255,0.12) 0%, rgba(150,130,230,0.05) 100%)",
    sweepColor: "rgba(180,160,255,0.20)",
    rippleColor: "rgba(180,160,255,0.2)",
    iconColor: "rgba(180,160,255,0.85)",
  },
  blue: {
    text: "rgba(132,161,255,0.95)",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    borderTop: "rgba(132,161,255,0.3)",
    borderDefault: "rgba(132,161,255,0.15)",
    hoverFill:
      "linear-gradient(180deg, rgba(132,161,255,0.12) 0%, rgba(100,130,230,0.05) 100%)",
    sweepColor: "rgba(132,161,255,0.20)",
    rippleColor: "rgba(132,161,255,0.2)",
    iconColor: "rgba(132,161,255,0.85)",
  },
};

interface GlassButtonProps {
  variant?: ButtonVariant;
  label?: string;
}

export function GlassButton({
  variant = "silver",
  label = "Let's Talk",
}: GlassButtonProps) {
  const v = variants[variant];
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(y, [-0.5, 0.5], [8, -8]),
    { stiffness: 250, damping: 20 },
  );
  const rotateY = useSpring(
    useTransform(x, [-0.5, 0.5], [-8, 8]),
    { stiffness: 250, damping: 20 },
  );

  const sheenX = useTransform(x, [-0.5, 0.5], [0, 100]);
  const sheenY = useTransform(y, [-0.5, 0.5], [0, 100]);

  function handleMouseMove(e: React.MouseEvent) {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  }

  function handleClick(e: React.MouseEvent) {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const id = rippleId.current++;
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(
      () =>
        setRipples((prev) => prev.filter((r) => r.id !== id)),
      600,
    );
  }

  return (
    <div className="relative" style={{ perspective: "600px" }}>
      <motion.button
        ref={buttonRef}
        className="relative cursor-pointer overflow-hidden rounded-[14px] px-7 py-[14px] border-0 outline-none select-none"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          background: `
            linear-gradient(135deg,
              rgba(255,255,255,0.18) 0%,
              rgba(255,255,255,0.06) 40%,
              rgba(255,255,255,0.02) 60%,
              rgba(255,255,255,0.10) 100%)
          `,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: isPressed
            ? `inset 0 2px 6px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)`
            : `inset 0 1px 0 rgba(150,180,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.12), 0 1px 3px rgba(80,120,255,0.10), 0 6px 20px rgba(60,100,255,0.12), 0 12px 40px rgba(60,100,255,0.08)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={handleClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 18,
        }}
      >
        {/* Glass edge highlight - top */}
        <div
          className="absolute top-0 left-[10%] right-[10%] h-[1px] rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${v.borderTop}, transparent)`,
          }}
        />

        {/* Inner glass layer */}
        <div
          className="absolute inset-[1px] rounded-[13px] pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.04) 100%)`,
          }}
        />

        {/* Hover: fill brightening */}
        <motion.div
          className="absolute inset-0 rounded-[14px] pointer-events-none"
          style={{ background: v.hoverFill }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        />

        {/* Hover: light sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[14px]"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${v.sweepColor} 50%, transparent 60%)`,
          }}
          initial={{ x: "-120%" }}
          animate={{ x: isHovered ? "120%" : "-120%" }}
          transition={{
            duration: isHovered ? 0.7 : 0,
            ease: [0.4, 0, 0.2, 1],
            repeat: isHovered ? Infinity : 0,
            repeatDelay: 1.5,
          }}
        />

        {/* Moving sheen following cursor */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[14px]"
          style={{
            background: useTransform(
              [sheenX, sheenY],
              ([sx, sy]) =>
                `radial-gradient(circle at ${sx}% ${sy}%, ${v.sweepColor} 0%, transparent 50%)`,
            ),
          }}
        />

        {/* Skeuomorphic inner bevel */}
        <div
          className="absolute inset-0 rounded-[14px] pointer-events-none"
          style={{
            border: `1px solid ${v.borderDefault}`,
            borderTopColor: v.borderTop,
            borderBottomColor: "rgba(0,0,0,0.08)",
          }}
        />

        {/* Ripples */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              background: `radial-gradient(circle, ${v.rippleColor} 0%, transparent 70%)`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 260, height: 260, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}

        {/* Text + icon */}
        <motion.span
          className="relative z-10 flex items-center gap-[10px]"
          style={{ transform: "translateZ(4px)" }}
        >
          <motion.span
            className="font-['Public_Sans',sans-serif] tracking-[-0.01em]"
            style={{
              fontWeight: 800,
              fontSize: "18px",
              lineHeight: 1.4,
              color: v.text,
              textShadow: v.textShadow,
            }}
            animate={{ x: isHovered ? -2 : 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 18,
            }}
          >
            {label}
          </motion.span>

          <motion.span
            className="flex items-center justify-center overflow-hidden"
            animate={{
              width: isHovered ? 18 : 0,
              opacity: isHovered ? 1 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
          >
            <motion.span
              animate={{
                x: isHovered ? 0 : -14,
                y: isHovered ? 0 : 14,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 14,
                delay: isHovered ? 0.05 : 0,
              }}
            >
              <ArrowUpRight
                size={18}
                strokeWidth={2.5}
                style={{
                  color: v.iconColor,
                  filter:
                    "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
                }}
              />
            </motion.span>
          </motion.span>
        </motion.span>
      </motion.button>
    </div>
  );
}