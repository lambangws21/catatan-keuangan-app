'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
// PERBAIKAN: Impor tipe dasar dan tipe data yang benar
import { ContainerType as BaseContainerType, VisitData } from '@/lib/dnd-kit';
import { ItemCard } from './ItemCard';

// PERBAIKAN: Tentukan tipe prop yang benar
// 'container.items' sekarang harus bertipe VisitData[]
interface ContainerColumnProps {
  container: Omit<BaseContainerType, 'items'> & {
    items: VisitData[];
  };
}

export const ContainerColumn: React.FC<ContainerColumnProps> = ({ container }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: container.id,
    data: {
      type: 'Container',
      container,
    },
  });

  const itemIds = container.items.map(item => item.id);

  // PERBAIKAN: Ganti warna label/badge agar konsisten dengan status
  const getBadgeColor = () => {
    switch (container.id) {
      case 'Terjadwal': return 'bg-indigo-200 text-indigo-800';
      case 'Terkunjungi': return 'bg-green-200 text-green-800';
      case 'Batal': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        w-80 p-4 rounded-xl shadow-xl flex flex-col flex-shrink-0 max-h-[80vh]
        ${isOver ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100 dark:bg-gray-800'}
        transition-colors duration-200 ease-in-out
      `}
    >
      <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200 flex justify-between items-center sticky top-0 bg-gray-100 dark:bg-gray-800 py-2">
        {container.title} 
        <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${getBadgeColor()}`}>
          {container.items.length}
        </span>
      </h3>
      
      {/* Area yang bisa di-scroll */}
      <div className="overflow-y-auto h-full">
        <SortableContext 
          items={itemIds} 
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3 min-h-[50px] p-1">
            {container.items.map(item => (
              // Ini sekarang aman karena 'item' adalah VisitData dan ItemCard mengharapkan VisitData
              <ItemCard key={item.id} item={item} />
            ))}
            {container.items.length === 0 && (isOver ? (
              <p className="text-sm text-blue-500 text-center py-4 border-2 border-dashed border-blue-300 rounded-lg">Lepaskan di sini</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Seret item ke sini</p>
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};