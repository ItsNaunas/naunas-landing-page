'use client';

import { useState } from 'react';

interface AccordionItemProps {
  title: string;
  description: string;
  tags: string[];
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}

function AccordionItem({ title, description, tags, icon, isExpanded, onToggle, index }: AccordionItemProps) {
  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-[var(--card)] hover:bg-[var(--card-hover)] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-[var(--fg)]">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-[var(--muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-6 py-4 bg-[var(--background)] border-t border-[var(--border)]">
          <p className="text-[var(--muted)] mb-4">{description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <button className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium text-sm flex items-center gap-1 transition-colors">
            Learn more
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

interface AccordionProps {
  items: Array<{
    title: string;
    description: string;
    tags: string[];
    icon: string;
  }>;
}

export function Accordion({ items }: AccordionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          {...item}
          isExpanded={expandedIndex === index}
          onToggle={() => handleToggle(index)}
          index={index}
        />
      ))}
    </div>
  );
}
