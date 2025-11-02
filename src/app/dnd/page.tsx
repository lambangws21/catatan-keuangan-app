'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { 
    // DndData, // Kita tidak akan gunakan DndData dari dnd-kit jika salah
    VisitData, 
    // ItemType, // Kita tidak akan gunakan ItemType, ini sumber masalahnya
    KANBAN_CONTAINERS,
    VisitStatus,
    ContainerType as DndKitContainer, // Ambil tipe dasar container
} from '@/lib/dnd-kit'; // Pastikan path impor sudah benar
import { ContainerColumn } from '@/components/dnd/ContainerColumn';
import { ItemCard } from '@/components/dnd/ItemCard'; 

// --- PERBAIKAN: Tentukan tipe DndData lokal yang BENAR ---
// Komponen Anda mengharapkan items bertipe VisitData[], bukan ItemType[]
// Kita buat tipe lokal untuk DndData yang menggunakan VisitData[]
type AppContainerType = Omit<DndKitContainer, 'items'> & { items: VisitData[] };
type AppDndData = Record<string, AppContainerType>;
// --- Akhir Perbaikan Tipe ---

// --- Logika State Awal ---
// PERBAIKAN: Gunakan tipe AppDndData yang baru
const initialEmptyData: AppDndData = KANBAN_CONTAINERS.reduce((acc, container) => {
    acc[container.id] = { ...container, items: [] }; 
    return acc;
}, {} as AppDndData); 
// --- Akhir Logika State Awal ---

// --- Komponen Form Input (Tidak Berubah) ---
interface NewItemFormProps {
    onAddItem: (item: Omit<VisitData, 'id' | 'orderIndex'>) => void;
}

const NewItemForm: React.FC<NewItemFormProps> = ({ onAddItem }) => {
    // ... (Tidak ada perubahan di sini)
    const [namaDokter, setNamaDokter] = useState('');
    const [rumahSakit, setRumahSakit] = useState('');
    const [waktuVisit, setWaktuVisit] = useState('');
    const [note, setNote] = useState('');
    const [status, setStatus] = useState<VisitStatus>('Terjadwal'); 

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddItem({
            namaDokter,
            rumahSakit,
            waktuVisit: new Date(waktuVisit).toISOString(),
            note,
            status,
        });
        setNamaDokter('');
        setRumahSakit('');
        setWaktuVisit('');
        setNote('');
        setStatus('Terjadwal');
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-xl shadow-lg mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <h2 className="col-span-full text-xl font-semibold mb-2 text-gray-800 border-b pb-2">Tambah Jadwal Kunjungan Baru</h2>
            
            <input 
                type="text" 
                placeholder="Nama Dokter" 
                value={namaDokter} 
                onChange={(e) => setNamaDokter(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
            />
            <input 
                type="text" 
                placeholder="Rumah Sakit" 
                value={rumahSakit} 
                onChange={(e) => setRumahSakit(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
            />
            <input 
                type="datetime-local" 
                value={waktuVisit} 
                onChange={(e) => setWaktuVisit(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
            />
            <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as VisitStatus)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
            >
                {KANBAN_CONTAINERS.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                ))}
            </select>
            <textarea 
                placeholder="Catatan (Note)" 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                className="col-span-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            <button 
                type="submit" 
                className="col-span-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-200"
            >
                Tambah Jadwal
            </button>
        </form>
    );
};
// --- Akhir Komponen Form Input ---


// --- Logika Mapping Data ---
// PERBAIKAN: Fungsi ini harus mengembalikan AppDndData
const mapVisitDataToDnd = (visits: VisitData[]): AppDndData => {
  // PERBAIKAN: Gunakan tipe AppDndData
  const initialDndData: AppDndData = KANBAN_CONTAINERS.reduce((acc, container) => {
      acc[container.id] = { ...container, items: [] };
      return acc;
  }, {} as AppDndData);

  visits.forEach(visit => {
      // PERBAIKAN: Jangan hapus properti 'status'
      const { status } = visit; 
      // const item: ItemType = itemProps; // INI SUMBER MASALAHNYA

      if (initialDndData[status as VisitStatus]) { 
          // PERBAIKAN: Push seluruh objek 'visit' (tipe VisitData), bukan 'item' (tipe ItemType)
          initialDndData[status as VisitStatus].items.push(visit); 
      }
  });

  KANBAN_CONTAINERS.forEach(container => {
      initialDndData[container.id].items.sort((a, b) => 
          a.orderIndex - b.orderIndex
      );
  });

  return initialDndData;
};
// --- Akhir Logika Mapping Data ---


export default function KanbanBoard() {
  // PERBAIKAN: Gunakan tipe state AppDndData
  const [data, setData] = useState<AppDndData>(initialEmptyData); 
  const [isLoading, setIsLoading] = useState(true);
  // PERBAIKAN: State activeItem harus VisitData, bukan ItemType
  const [activeItem, setActiveItem] = useState<VisitData | null>(null); 

  // --- FUNGSI HELPER FIREBASE: BATCH UPDATE ORDER INDEX ---
  // PERBAIKAN: Parameter harus VisitData[]
  const updateOrderIndexBatch = async (items: VisitData[]) => {
      const orderUpdates = items.map((item, index) => ({
          id: item.id,
          orderIndex: index, // Index baru
      }));

      try {
          await fetch('/api/dnd', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderUpdates }),
          });
          console.log('Order index batch updated successfully.');
      } catch (error) {
          console.error("Gagal melakukan batch update API:", error);
          fetchVisitData(); 
      }
  }
  // --- END BATCH UPDATE HELPER ---

  // --- LOGIKA FETCH DATA DARI API ---
  const fetchVisitData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dnd'); 
      if (!response.ok) throw new Error('Gagal mengambil data dari API');
      
      const visits: VisitData[] = await response.json();
      const dndData = mapVisitDataToDnd(visits);
      setData(dndData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData(mapVisitDataToDnd([])); 
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitData();
  }, []);
  // --- END LOGIKA FETCH DATA ---

  // --- LOGIKA DND ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findContainerId = (id: UniqueIdentifier): VisitStatus | undefined => {
    for (const key in data) {
        const containerKey = key as VisitStatus; 
        // Tipenya sekarang sudah benar (VisitData memiliki 'id')
        if (data[containerKey].items.some(item => item.id === id)) {
            return containerKey;
        }
    }
    if (KANBAN_CONTAINERS.some(c => c.id === id)) {
        return id as VisitStatus;
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeContainerId = findContainerId(event.active.id);
    if (!activeContainerId) return;
    
    // Tipe 'item' sekarang adalah VisitData, yang cocok dengan state 'activeItem'
    const item = data[activeContainerId].items.find(i => i.id === event.active.id);
    setActiveItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;

    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;

    const activeContainerId = findContainerId(activeId) as VisitStatus;
    const overContainerId = (findContainerId(overId) || overId) as VisitStatus; 

    if (!activeContainerId || !overContainerId || activeContainerId === overContainerId && activeId === overId) return;
    
    const activeIndex = data[activeContainerId].items.findIndex(item => item.id === activeId);
    let overIndex = data[overContainerId].items.findIndex(item => item.id === overId);

    if (overIndex === -1 && activeContainerId !== overContainerId) {
        overIndex = data[overContainerId].items.length;
    } 

    if (activeContainerId === overContainerId) {
      // 1. Memindahkan di dalam kontainer yang sama (Reordering)
      // PERBAIKAN: Tipe array harus VisitData[]
      let newItems: VisitData[] = []; 

      setData(prevData => {
        newItems = arrayMove(
          prevData[activeContainerId].items,
          activeIndex,
          overIndex
        ).map((item, index) => ({ 
            ...item,
            orderIndex: index
        }));

        return {
          ...prevData,
          [activeContainerId]: {
            ...prevData[activeContainerId],
            items: newItems,
          },
        };
      });

      await updateOrderIndexBatch(newItems);

    } else {
      // 2. Memindahkan antar kontainer (Move between Containers)
      
      // 'activeItem' sekarang bertipe VisitData
      const activeItem = data[activeContainerId].items[activeIndex];
      const newStatus = overContainerId;

      setData(prevData => {
        const newActiveContainerItems = prevData[activeContainerId].items.filter(i => i.id !== activeId);
        
        // PERBAIKAN: 'activeItem' sudah memiliki 'status', kita hanya perlu
        // memperbarui 'orderIndex'. Kita juga perlu *memperbarui statusnya* di state lokal
        // agar konsisten sebelum API call selesai.
        const movedItemWithNewOrder = { 
            ...activeItem, 
            status: newStatus, // Set status baru di state lokal
            orderIndex: overIndex 
        }; 

        const newOverContainerItems = [
          ...prevData[overContainerId].items.slice(0, overIndex),
          movedItemWithNewOrder, 
          ...prevData[overContainerId].items.slice(overIndex),
        ];

        updateOrderIndexBatch(newActiveContainerItems);
        
        return {
          ...prevData,
          [activeContainerId]: { ...prevData[activeContainerId], items: newActiveContainerItems },
          [overContainerId]: { ...prevData[overContainerId], items: newOverContainerItems },
        };
      });

      try {
        await fetch('/api/visit-dokter', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeId, status: newStatus }),
        });
        console.log(`Status item ${activeId} berhasil diubah ke ${newStatus}`);
      } catch (error) {
        console.error("Gagal update API status:", error);
        fetchVisitData(); 
      }
    }
  };
  // --- AKHIR LOGIKA DND ---

  // --- Logika Menambah Item Baru (Tidak Berubah) ---
  const handleAddItem = async (item: Omit<VisitData, 'id' | 'orderIndex'>) => {
    try {
        const itemWithDefaultOrder = { ...item, orderIndex: 0 }; 

        const response = await fetch('/api/visit-dokter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemWithDefaultOrder),
        });
        const newItem: VisitData = await response.json();

        const targetStatus = newItem.status as VisitStatus; 

        setData(prevData => ({
            ...prevData,
            [targetStatus]: {
                ...prevData[targetStatus],
                // newItem adalah VisitData, cocok dengan state 'items' (VisitData[])
                items: [newItem, ...prevData[targetStatus].items], 
            },
        }));
    } catch (error) {
        console.error("Gagal menambahkan item:", error);
        alert('Gagal menambahkan jadwal kunjungan.');
    }
  };

  if (isLoading) { 
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-xl font-medium">Mengambil Data Kunjungan...</p>
        </div>
    );
  }

  const containerIds = Object.keys(data) as VisitStatus[];
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
          Aplikasi Manajemen Kunjungan Dokter 🩺
        </h1>
        
        <NewItemForm onAddItem={handleAddItem} />

        <div className="flex gap-6 overflow-x-auto pb-4 justify-center">
          <SortableContext items={containerIds}>
            {containerIds.map((id) => (
              <ContainerColumn 
                key={id} 
                container={data[id]} 
              />
            ))}
          </SortableContext>
        </div>
      </div>
      <DragOverlay>
        {activeItem ? (
          <ItemCard 
            item={activeItem} 
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}