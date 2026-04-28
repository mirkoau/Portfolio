import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "motion/react";
import { ArrowRight } from "lucide-react";

export type ArtisticVariant = "blue" | "coral" | "mint" | "lavender" | "silver";

const variants: Record<ArtisticVariant, {
  casing: string;
  casingBorder: string;
  pool: string;
  text: string;
  arrowBg: string;
  arrowIcon: string;
  sweep: string;
  grid: string;
}> = {
  blue: {
    casing: "linear-gradient(180deg, #3C5BB6 0%, #1A3072 100%)",
    casingBorder: "rgba(115, 148, 230, 0.6)",
    pool: "linear-gradient(180deg, #11204D 0%, #0A1330 100%)",
    text: "rgba(255, 255, 255, 0.95)",
    arrowBg: "linear-gradient(180deg, #5B7CD6 0%, #2E4BA6 100%)",
    arrowIcon: "#ffffff",
    sweep: "linear-gradient(90deg, transparent, rgba(115, 148, 230, 0.4), transparent)",
    grid: "rgba(115, 148, 230, 0.3)",
  },
  coral: {
    casing: "linear-gradient(180deg, #BF4E36 0%, #7A2B1B 100%)",
    casingBorder: "rgba(240, 115, 90, 0.6)",
    pool: "linear-gradient(180deg, #4D180F 0%, #300C06 100%)",
    text: "rgba(255, 255, 255, 0.95)",
    arrowBg: "linear-gradient(180deg, #E6664A 0%, #A63821 100%)",
    arrowIcon: "#ffffff",
    sweep: "linear-gradient(90deg, transparent, rgba(240, 115, 90, 0.4), transparent)",
    grid: "rgba(240, 115, 90, 0.3)",
  },
  mint: {
    casing: "linear-gradient(180deg, #2D8C7B 0%, #144D42 100%)",
    casingBorder: "rgba(80, 204, 182, 0.6)",
    pool: "linear-gradient(180deg, #0A2E26 0%, #041A14 100%)",
    text: "rgba(255, 255, 255, 0.95)",
    arrowBg: "linear-gradient(180deg, #44A693 0%, #1F7363 100%)",
    arrowIcon: "#ffffff",
    sweep: "linear-gradient(90deg, transparent, rgba(80, 204, 182, 0.4), transparent)",
    grid: "rgba(80, 204, 182, 0.3)",
  },
  lavender: {
    casing: "linear-gradient(180deg, #6852B3 0%, #372866 100%)",
    casingBorder: "rgba(164, 140, 240, 0.6)",
    pool: "linear-gradient(180deg, #201540 0%, #120A26 100%)",
    text: "rgba(255, 255, 255, 0.95)",
    arrowBg: "linear-gradient(180deg, #8B74DB 0%, #513B99 100%)",
    arrowIcon: "#ffffff",
    sweep: "linear-gradient(90deg, transparent, rgba(164, 140, 240, 0.4), transparent)",
    grid: "rgba(164, 140, 240, 0.3)",
  },
  silver: {
    casing: "linear-gradient(180deg, #8A8A99 0%, #4D4D59 100%)",
    casingBorder: "rgba(210, 210, 220, 0.6)",
    pool: "linear-gradient(180deg, #2D2D36 0%, #1A1A20 100%)",
    text: "rgba(255, 255, 255, 0.95)",
    arrowBg: "linear-gradient(180deg, #A8A8B8 0%, #686878 100%)",
    arrowIcon: "#ffffff",
    sweep: "linear-gradient(90deg, transparent, rgba(210, 210, 220, 0.4), transparent)",
    grid: "rgba(210, 210, 220, 0.3)",
  },
};

interface ArtisticButtonProps {
  variant?: ArtisticVariant;
  label?: string;
}

export function ArtisticButton({ variant = "blue", label = "Let's Talk" }: ArtisticButtonProps) {
  const v = variants[variant];
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 24 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 24 });

  const sheenX = useTransform(mx, [-0.5, 0.5], [0, 100]);
  const sheenY = useTransform(my, [-0.5, 0.5], [0, 100]);

  function handleMouseMove(e: React.MouseEvent) {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mx.set(0);
    my.set(0);
    setIsHovered(false);
  }

  return (
    <div className="relative" style={{ perspective: "800px" }}>
      <motion.button
        ref={buttonRef}
        className="relative flex items-center p-2 pr-[10px] rounded-full cursor-pointer outline-none select-none"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          background: v.casing,
          boxShadow: isPressed
            ? `
              inset 0 4px 8px rgba(0,0,0,0.6),
              inset 0 2px 4px rgba(0,0,0,0.4),
              0 2px 4px rgba(0,0,0,0.2)
            `
            : `
              inset 0 2px 2px ${v.casingBorder},
              inset 0 -4px 8px rgba(0,0,0,0.5),
              0 16px 32px rgba(0,0,0,0.4),
              0 8px 16px rgba(0,0,0,0.3),
              0 4px 8px rgba(0,0,0,0.2)
            `,
          border: "1px solid rgba(0,0,0,0.6)",
          transition: "box-shadow 0.2s ease",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95, y: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {/* Responsive Casing Sheen */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{
            background: useTransform(
              [sheenX, sheenY],
              ([sx, sy]) =>
                `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
            ),
          }}
        />

        {/* Inner Recessed Pool */}
        <div
          className="absolute inset-[6px] rounded-full pointer-events-none overflow-hidden"
          style={{
            background: v.pool,
            boxShadow:
              "inset 0 4px 8px rgba(0,0,0,0.6), inset 0 2px 4px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {/* Grid Texture */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, ${v.grid} 1px, transparent 0)`,
              backgroundSize: "8px 8px",
            }}
          />

          {/* Sweeping Light Beam */}
          <motion.div
            className="absolute inset-0"
            style={{ background: v.sweep }}
            initial={{ x: "-100%", skewX: -20 }}
            animate={{ x: isHovered ? "200%" : "-100%" }}
            transition={{
              duration: isHovered ? 0.8 : 0,
              ease: "easeInOut",
              repeat: isHovered ? Infinity : 0,
              repeatDelay: 1.2,
            }}
          />
        </div>

        {/* Text */}
        <motion.span
          className="relative z-10 pl-6 pr-5 font-['Public_Sans',sans-serif] font-bold uppercase tracking-widest"
          style={{
            fontSize: "13px",
            color: v.text,
            textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            transform: "translateZ(8px)",
          }}
          animate={{
            letterSpacing: isHovered ? "0.22em" : "0.14em",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {label}
        </motion.span>

        {/* Sliding Physical Puck */}
        <motion.div
          className="relative z-10 size-[38px] rounded-full flex items-center justify-center overflow-hidden shrink-0"
          style={{
            background: v.arrowBg,
            boxShadow: `
              inset 0 2px 3px rgba(255,255,255,0.4),
              inset 0 -2px 4px rgba(0,0,0,0.3),
              0 6px 10px rgba(0,0,0,0.5)
            `,
            border: "1px solid rgba(0,0,0,0.4)",
            transform: "translateZ(12px)",
          }}
        >
          {/* Conveyor Belt Arrows */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: isHovered ? 40 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute flex items-center justify-center"
          >
            <ArrowRight
              size={18}
              color={v.arrowIcon}
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.4))" }}
            />
          </motion.div>
          <motion.div
            initial={{ x: -40 }}
            animate={{ x: isHovered ? 0 : -40 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute flex items-center justify-center"
          >
            <ArrowRight
              size={18}
              color={v.arrowIcon}
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.4))" }}
            />
          </motion.div>
        </motion.div>
      </motion.button>
    </div>
  );
}
