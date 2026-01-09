'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface EditableContentProps {
  value: string;
  onSave: (newValue: string) => void;
  isEditable?: boolean;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export default function EditableContent({
  value,
  onSave,
  isEditable = false,
  className = '',
  as: Component = 'span',
}: EditableContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditable) {
    return <Component className={className}>{value}</Component>;
  }

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:bg-green-100 rounded"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-600 hover:bg-red-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 group">
      <Component className={className}>{value}</Component>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}
