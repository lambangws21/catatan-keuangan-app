// src/components/dnd/ItemCard.tsx

'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemType } from '@/lib/dnd';

interface ItemCardProps {
  item: ItemType;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { type: 'Item', item } });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 10 : 0, 
    opacity: isDragging ? 0.8 : 1,
  };
  
  const formattedTime = item.waktuVisit ? new Date(item.waktuVisit).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-4 mb-3 rounded-lg shadow-md transition-all duration-150 ease-in-out
        ${isDragging ? 'bg-indigo-200 ring-2 ring-indigo-500 transform rotate-1' : 'bg-white hover:bg-gray-50'}
        cursor-grab active:cursor-grabbing border-l-4 border-indigo-500
      `}
    >
      <p className="text-sm font-bold text-indigo-600 mb-1">{item.namaDokter}</p>
      <p className="text-xs text-gray-500 mb-1">{item.rumahSakit}</p>
      <p className="text-xs text-gray-600 mb-2 italic">Visit: {formattedTime}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.note}</p>
    </div>
  );
};