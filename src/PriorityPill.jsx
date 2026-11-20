// src/PriorityPill.jsx
// Priority pill with fixed colors: Low slate, Medium amber, High orange, Urgent red

import React from 'react';
import { PRIORITY_CONFIG } from './taskHelpers';

export default function PriorityPill({ priority }) {
  const key = String(priority || 'medium').toLowerCase();
  const config = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

