"use client";

import React, { useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam-core";

const Node = forwardRef<
  HTMLDivElement,
  { className?: string; label?: string }
>(({ className, label }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white/70 shadow-[0_0_20px_-12px_rgba(255,255,255,0.15)]",
        className
      )}
    >
      {label}
    </div>
  );
});

Node.displayName = "Node";

export function AnimatedBeamBuildInstall({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const crmRef = useRef<HTMLDivElement>(null);
  const automationRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const leadsRef = useRef<HTMLDivElement>(null);
  const reportingRef = useRef<HTMLDivElement>(null);
  const integrationsRef = useRef<HTMLDivElement>(null);

  const coreRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-[300px] w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      <div className="flex w-full max-w-xl flex-col justify-between gap-10">
        <div className="flex justify-between">
          <Node ref={crmRef} label="CRM" />
          <Node ref={automationRef} label="Automations" />
        </div>

        <div className="flex justify-between">
          <Node ref={workflowRef} label="Workflows" />

          <Node
            ref={coreRef}
            label="System Infrastructure"
            className="bg-[var(--accent)]/10 border-[var(--accent)] text-white px-4 py-3"
          />

          <Node ref={leadsRef} label="Lead Routing" />
        </div>

        <div className="flex justify-between">
          <Node ref={reportingRef} label="Reporting" />
          <Node ref={integrationsRef} label="Integrations" />
        </div>
      </div>

      {/* Incoming Connections */}

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={crmRef as React.RefObject<HTMLDivElement>}
        toRef={coreRef as React.RefObject<HTMLDivElement>}
        gradientStartColor="#F2613F"
        gradientStopColor="#F2613F"
        curvature={-40}
      />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={automationRef as React.RefObject<HTMLDivElement>}
        toRef={coreRef as React.RefObject<HTMLDivElement>}
        gradientStartColor="#F2613F"
        gradientStopColor="#F2613F"
        curvature={40}
      />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={workflowRef as React.RefObject<HTMLDivElement>}
        toRef={coreRef as React.RefObject<HTMLDivElement>}
        gradientStartColor="#F2613F"
        gradientStopColor="#F2613F"
      />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={leadsRef as React.RefObject<HTMLDivElement>}
        toRef={coreRef as React.RefObject<HTMLDivElement>}
        gradientStartColor="#F2613F"
        gradientStopColor="#F2613F"
      />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={reportingRef as React.RefObject<HTMLDivElement>}
        toRef={coreRef as React.RefObject<HTMLDivElement>}
        gradientStartColor="#F2613F"
        gradientStopColor="#F2613F"
        curvature={-40}
      />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={integrationsRef as React.RefObject<HTMLDivElement>}
        toRef={coreRef as React.RefObject<HTMLDivElement>}
        gradientStartColor="#F2613F"
        gradientStopColor="#F2613F"
        curvature={40}
      />
    </div>
  );
}
