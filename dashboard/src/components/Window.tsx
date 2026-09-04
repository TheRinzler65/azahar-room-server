import React from "react";

export const Window = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="border border-border bg-panel rounded-sm shadow-none">
    <div className="bg-title px-2 py-1 border-b border-border flex justify-between items-center text-xs text-neutral-300">
      <span className="font-mono">{title}</span>
    </div>
    <div className="p-2">{children}</div>
  </div>
);
