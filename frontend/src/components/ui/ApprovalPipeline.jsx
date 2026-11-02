"use client";
import { useEffect, useRef } from "react";
import { animate } from "animejs";

/**
 * ApprovalPipeline — horizontal step tracker showing the article workflow stages.
 * Reusable: pass any steps array.
 *
 * Props:
 *  - steps: { id, label, done, active?, count? }[]
 */
export default function ApprovalPipeline({ steps = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Subtle continuous flowing animation on the completed green lines
    animate(containerRef.current.querySelectorAll('.pipeline-line-active'), {
      backgroundPosition: ['200% 0', '-200% 0'],
      loop: true,
      easing: 'linear',
      duration: 3000
    });
  }, [steps]);

  return (
    <div ref={containerRef} className="bg-brand-card border border-brand-border rounded px-6 py-4 flex items-center gap-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {/* Circle */}
              {step.done ? (
                /* Completed — green circle with checkmark */
                <div className="w-[25px] h-[25px] rounded-full bg-brand-green flex items-center justify-center">
                  <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : step.active ? (
                /* Active — red solid circle with count */
                <div className="w-[25px] h-[25px] rounded-full bg-brand-red flex items-center justify-center">
                  <span className="font-inter text-[14px] text-white tracking-[0.03em]">
                    {step.count ?? step.id}
                  </span>
                </div>
              ) : (
                /* Pending — outlined circle with number */
                <div className="w-[25px] h-[25px] rounded-full border border-brand-border flex items-center justify-center bg-white">
                  <span className="font-inter text-[14px] text-brand-black tracking-[0.03em]">{step.id}</span>
                </div>
              )}

              {/* Label */}
              <span className="font-inter text-[14px] tracking-[0.03em] text-brand-black whitespace-nowrap">
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 ${
                  step.done 
                    ? "pipeline-line-active bg-[length:200%_100%] bg-gradient-to-r from-brand-green via-[#34D399] to-brand-green" 
                    : "bg-brand-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
