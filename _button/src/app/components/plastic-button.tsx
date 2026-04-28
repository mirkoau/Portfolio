import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "motion/react";
import { ArrowUpRight } from "lucide-react";

export type PlasticVariant = "blue" | "coral" | "mint" | "lavender" | "silver";

const variants: Record<PlasticVariant, {
  bg: string;
  bgHover: string;
  bgPressed: string;
  borderColor: string;
  borderHover: string;
  shadowRest: string;
  shadowPressed: string;
  textColor: string;
  reflectionColor: string;
}> = {
  blue: {
    bg: "linear-gradient(180deg, #6B8AE0 0%, #4A68C4 55%, #5070CC 100%)",
    bgHover: "linear-gradient(180deg, #7A98F0 0%, #536FD0 55%, #5D7CD8 100%)",
    bgPressed: "linear-gradient(180deg, #4A62B0 0%, #3A52A0 55%, #4058A8 100%)",
    borderColor: "rgba(50,60,120,0.5)",
    borderHover: "rgba(70,85,160,0.6)",
    shadowRest: "0 4px 12px rgba(50,70,140,0.35), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
    shadowPressed: "0 1px 4px rgba(50,70,140,0.2), inset 0 2px 4px rgba(0,0,0,0.2)",
    textColor: "#ffffff",
    reflectionColor: "rgba(255,255,255,0.12)",
  },
  coral: {
    bg: "linear-gradient(180deg, #E87B60 0%, #CC5A42 55%, #D46350 100%)",
    bgHover: "linear-gradient(180deg, #F08A70 0%, #D8654E 55%, #E07060 100%)",
    bgPressed: "linear-gradient(180deg, #C45A40 0%, #A84530 55%, #B04E3A 100%)",
    borderColor: "rgba(140,50,30,0.5)",
    borderHover: "rgba(170,65,40,0.6)",
    shadowRest: "0 4px 12px rgba(180,70,40,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
    shadowPressed: "0 1px 4px rgba(180,70,40,0.2), inset 0 2px 4px rgba(0,0,0,0.2)",
    textColor: "#ffffff",
    reflectionColor: "rgba(255,255,255,0.10)",
  },
  mint: {
    bg: "linear-gradient(180deg, #5CC4B0 0%, #3A9E8C 55%, #48A898 100%)",
    bgHover: "linear-gradient(180deg, #6CD4C0 0%, #44AC98 55%, #52B6A4 100%)",
    bgPressed: "linear-gradient(180deg, #3A9A86 0%, #2A8070 55%, #328878 100%)",
    borderColor: "rgba(30,100,80,0.5)",
    borderHover: "rgba(40,130,105,0.6)",
    shadowRest: "0 4px 12px rgba(40,120,100,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
    shadowPressed: "0 1px 4px rgba(40,120,100,0.2), inset 0 2px 4px rgba(0,0,0,0.2)",
    textColor: "#ffffff",
    reflectionColor: "rgba(255,255,255,0.10)",
  },
  lavender: {
    bg: "linear-gradient(180deg, #9B88E0 0%, #7A64C4 55%, #846ECC 100%)",
    bgHover: "linear-gradient(180deg, #AA98F0 0%, #8672D0 55%, #907CD8 100%)",
    bgPressed: "linear-gradient(180deg, #7A64B0 0%, #6050A0 55%, #6858A8 100%)",
    borderColor: "rgba(80,50,140,0.5)",
    borderHover: "rgba(100,65,170,0.6)",
    shadowRest: "0 4px 12px rgba(90,60,150,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
    shadowPressed: "0 1px 4px rgba(90,60,150,0.2), inset 0 2px 4px rgba(0,0,0,0.2)",
    textColor: "#ffffff",
    reflectionColor: "rgba(255,255,255,0.10)",
  },
  silver: {
    bg: "linear-gradient(180deg, #C8C8D2 0%, #A0A0B0 55%, #AAABB8 100%)",
    bgHover: "linear-gradient(180deg, #D4D4DE 0%, #ACACBC 55%, #B4B5C2 100%)",
    bgPressed: "linear-gradient(180deg, #A0A0AE 0%, #888898 55%, #90909E 100%)",
    borderColor: "rgba(100,100,120,0.5)",
    borderHover: "rgba(120,120,145,0.6)",
    shadowRest: "0 4px 12px rgba(80,80,100,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)",
    shadowPressed: "0 1px 4px rgba(80,80,100,0.2), inset 0 2px 4px rgba(0,0,0,0.15)",
    textColor: "#3a3a4a",
    reflectionColor: "rgba(255,255,255,0.15)",
  },
};

interface PlasticButtonProps {
  variant?: PlasticVariant;
  label?: string;
}

export function PlasticButton({ variant = "blue", label = "Let's Talk" }: PlasticButtonProps) {
  const v = variants[variant];
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 300, damping: 24 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 300, damping: 24 });

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
    <div className="relative" style={{ perspective: "600px" }}>
      <motion.button
        ref={buttonRef}
        className="relative cursor-pointer overflow-hidden rounded-[10px] px-7 py-[13px] outline-none select-none"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          background: isPressed ? v.bgPressed : isHovered ? v.bgHover : v.bg,
          boxShadow: isPressed ? v.shadowPressed : v.shadowRest,
          border: `1px solid ${isHovered ? v.borderHover : v.borderColor}`,
          transition: "background 0.2s ease, border-color 0.25s ease, box-shadow 0.2s ease",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.96, y: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        {/* Subtle top-edge specular line */}
        <div
          className="absolute top-0 left-[8%] right-[8%] h-[1px] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            opacity: isPressed ? 0.1 : 1,
          }}
        />

        {/* Soft reflection — not the big dome, just a gentle diagonal */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[9px]"
          style={{
            background: useTransform(
              [sheenX, sheenY],
              ([sx, sy]) =>
                `radial-gradient(ellipse at ${sx}% ${sy}%, ${v.reflectionColor} 0%, transparent 60%)`
            ),
          }}
        />

        {/* Hover: crisp edge-to-edge light sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[9px]"
          style={{
            background: "linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.22) 50%, transparent 62%)",
          }}
          initial={{ x: "-150%" }}
          animate={{ x: isHovered ? "150%" : "-150%" }}
          transition={{
            duration: isHovered ? 0.55 : 0,
            ease: [0.4, 0, 0.2, 1],
            repeat: isHovered ? Infinity : 0,
            repeatDelay: 2.2,
          }}
        />

        {/* Text + icon */}
        <motion.span
          className="relative z-10 flex items-center gap-[10px]"
          style={{ transform: "translateZ(3px)" }}
        >
          <motion.span
            className="font-['Public_Sans',sans-serif] tracking-[-0.01em]"
            style={{
              fontWeight: 800,
              fontSize: "18px",
              lineHeight: 1.4,
              color: v.textColor,
              textShadow: "0 1px 1px rgba(0,0,0,0.15)",
            }}
            animate={{ x: isHovered ? -2 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            {label}
          </motion.span>

          <motion.span
            className="flex items-center justify-center overflow-hidden"
            animate={{
              width: isHovered ? 18 : 0,
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <motion.span
              animate={{
                x: isHovered ? 0 : -14,
                y: isHovered ? 0 : 14,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 14, delay: isHovered ? 0.05 : 0 }}
            >
              <ArrowUpRight
                size={18}
                strokeWidth={2.5}
                style={{
                  color: v.textColor,
                  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
                }}
              />
            </motion.span>
          </motion.span>
        </motion.span>
      </motion.button>
    </div>
  );
}
