import React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled = false,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent
        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${checked ? "bg-blue-600" : "bg-gray-200"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg 
          transform transition-transform 
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}
