"use client";

import React, { useRef, useEffect, useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  className?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fromRef: React.RefObject<HTMLDivElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  curvature?: number;
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  delay?: number;
  duration?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

export const AnimatedBeam = forwardRef<SVGSVGElement, AnimatedBeamProps>(
  (
    {
      className,
      containerRef,
      fromRef,
      toRef,
      curvature = 0,
      reverse = false,
      duration = Math.random() * 3 + 2,
      delay = 0,
      pathColor = "gray",
      pathWidth = 2,
      pathOpacity = 0.2,
      gradientStartColor = "#ffaa40",
      gradientStopColor = "#c026d3",
      startXOffset = 0,
      startYOffset = 0,
      endXOffset = 0,
      endYOffset = 0,
    },
    ref
  ) => {
    const [pathD, setPathD] = useState("");
    const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
    const [svgPosition, setSvgPosition] = useState({ x: 0, y: 0 });
    const id = `gradient-${gradientStartColor}-${gradientStopColor}`;

    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();

        const fromX = fromRect.left - containerRect.left + fromRect.width / 2 + startXOffset;
        const fromY = fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
        const toX = toRect.left - containerRect.left + toRect.width / 2 + endXOffset;
        const toY = toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

        const controlX = (fromX + toX) / 2 + curvature;
        const controlY = (fromY + toY) / 2 + curvature;

        const minX = Math.min(fromX, toX, controlX);
        const maxX = Math.max(fromX, toX, controlX);
        const minY = Math.min(fromY, toY, controlY);
        const maxY = Math.max(fromY, toY, controlY);

        const svgX = minX - 50;
        const svgY = minY - 50;

        const adjustedFromX = fromX - svgX;
        const adjustedFromY = fromY - svgY;
        const adjustedToX = toX - svgX;
        const adjustedToY = toY - svgY;
        const adjustedControlX = controlX - svgX;
        const adjustedControlY = controlY - svgY;

        const path = `M ${adjustedFromX} ${adjustedFromY} Q ${adjustedControlX} ${adjustedControlY} ${adjustedToX} ${adjustedToY}`;
        setPathD(path);

        setSvgDimensions({
          width: maxX - minX + 100,
          height: maxY - minY + 100,
        });

        setSvgPosition({
          x: svgX,
          y: svgY,
        });
      }
    };

    useEffect(() => {
      updatePath();
      const resizeObserver = new ResizeObserver(updatePath);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      return () => resizeObserver.disconnect();
    }, [containerRef, fromRef, toRef, curvature]);

    const gradientCoordinates = reverse
      ? {
          x1: ["90%", "-10%"],
          x2: ["100%", "0%"],
          y1: ["0%", "0%"],
          y2: ["0%", "0%"],
        }
      : {
          x1: ["10%", "110%"],
          x2: ["0%", "100%"],
          y1: ["0%", "0%"],
          y2: ["0%", "0%"],
        };

    return (
      <svg
        fill="none"
        width={svgDimensions.width}
        height={svgDimensions.height}
        viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "pointer-events-none absolute transform-gpu stroke-2",
          className
        )}
        style={{
          left: `${svgPosition.x}px`,
          top: `${svgPosition.y}px`,
        }}
        ref={ref}
      >
        <path
          d={pathD}
          stroke={pathColor}
          strokeWidth={pathWidth}
          strokeOpacity={pathOpacity}
          fill="none"
        />
        <path
          d={pathD}
          strokeWidth={pathWidth}
          stroke={`url(#${id})`}
          strokeOpacity="1"
          fill="none"
        />
        <defs>
          <motion.linearGradient
            className="transform-gpu"
            id={id}
            gradientUnits={"userSpaceOnUse"}
            initial={{
              x1: "0%",
              x2: "0%",
              y1: "0%",
              y2: "0%",
            }}
            animate={{
              x1: gradientCoordinates.x1,
              x2: gradientCoordinates.x2,
              y1: gradientCoordinates.y1,
              y2: gradientCoordinates.y2,
            }}
            transition={{
              delay,
              duration,
              ease: [0.16, 1, 0.3, 1],
              repeat: Infinity,
              repeatDelay: 0,
            }}
          >
            <stop stopColor={gradientStartColor} stopOpacity="0" />
            <stop stopColor={gradientStartColor} />
            <stop offset="32.5%" stopColor={gradientStopColor} />
            <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
          </motion.linearGradient>
        </defs>
      </svg>
    );
  }
);

AnimatedBeam.displayName = "AnimatedBeam";
