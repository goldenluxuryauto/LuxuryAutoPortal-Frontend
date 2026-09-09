import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type RevealPreset = "lift" | "soft" | "hero" | "scale";

type ScrollRevealProps = HTMLMotionProps<"div"> & {
  preset?: RevealPreset;
  delay?: number;
  amount?: number;
  once?: boolean;
};

const ease = [0.22, 1, 0.36, 1] as const;

const presets: Record<RevealPreset, { hidden: HTMLMotionProps<"div">["initial"]; show: HTMLMotionProps<"div">["whileInView"]; duration: number }> = {
  lift: {
    hidden: { opacity: 0, y: 42, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)" },
    duration: 0.86,
  },
  soft: {
    hidden: { opacity: 0, y: 24, filter: "blur(7px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)" },
    duration: 0.72,
  },
  hero: {
    hidden: { opacity: 0, y: 54, scale: 0.985, filter: "blur(12px)" },
    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    duration: 1,
  },
  scale: {
    hidden: { opacity: 0, y: 30, scale: 0.975, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    duration: 0.78,
  },
};

export function ScrollReveal({
  children,
  className,
  preset = "lift",
  delay = 0,
  amount = 0.22,
  once = true,
  transition,
  ...props
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const selected = presets[preset];

  return (
    <motion.div
      className={cn("will-change-[opacity,transform,filter]", className)}
      initial={shouldReduceMotion ? false : selected.hidden}
      whileInView={shouldReduceMotion ? undefined : selected.show}
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: selected.duration,
        delay,
        ease,
        ...transition,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type StaggeredRevealProps = HTMLMotionProps<"div"> & {
  amount?: number;
  once?: boolean;
};

export function StaggeredReveal({
  children,
  className,
  amount = 0.04,
  once = true,
  ...props
}: StaggeredRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "show"}
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.075,
            delayChildren: 0.06,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredRevealItem({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("will-change-[opacity,transform,filter]", className)}
      variants={
        shouldReduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 34, filter: "blur(9px)" },
              show: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.76, ease },
              },
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
