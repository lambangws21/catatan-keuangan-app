/**
 * Ini adalah halaman utama (Dashboard)
 * yang TERSINKRONISASI DENGAN FIREBASE FIRESTORE.
 */
'use client';

// 1. Impor state management dan hooks
import React, { useState, useEffect } from 'react';

// 2. Impor komponen shadcn/ui (termasuk yang baru)
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // BARU: Untuk form
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'; // BARU: Untuk modal

// 3. Impor komponen kalender Anda (path dari kode Anda) - DIPERBAIKI
import { CalendarWeekView, ManualEvent } from '../../components/calendar-view';

// 4. Impor koneksi database dan fungsi Firestore - DIPERBAIKI
import { db } from '@/lib/firebase/client'; // (File dari Canvas Anda)
import { collection, onSnapshot, addDoc, query, Timestamp } from 'firebase/firestore';

// Icon untuk Tombol Share (Sama seperti sebelumnya)
const ShareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.19.026.37.05.55.08m-3.46 16.511a2.25 2.25 0 0 1-3.376 0c-1.182-1.36-1.182-3.56 0-4.921l1.41-1.623a2.25 2.25 0 0 1 3.185 0l1.41 1.623c1.182 1.36 1.182 3.56 0 4.92zM3.823 8.685a2.25 2.25 0 0 1 0-2.186m0 2.186c-.19-.026-.37-.05-.55-.08m3.46-1.99a2.25 2.25 0 0 1 3.376 0c1.182 1.36 1.182 3.56 0 4.92l-1.41 1.623a2.25 2.25 0 0 1-3.185 0l-1.41-1.623c-1.182-1.36-1.182-3.56 0-4.921z"
    />
  </svg>
);

// --- Komponen Utama Halaman ---
export default function DashboardPage() {
  // 5. State untuk menampung data event dari database
  const [events, setEvents] = useState<ManualEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('0'); // 0 = Mon
  const [newStart, setNewStart] = useState('9'); // 9 AM
  const [newEnd, setNewEnd] = useState('10'); // 10 AM
  const [newColor, setNewColor] = useState('bg-blue-500');

  // 6. useEffect untuk mengambil (fetch) data secara real-time
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'jadwalVisit')); // Nama koleksi Anda

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedEvents: ManualEvent[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedEvents.push({
            id: doc.id,
            title: data.title,
            dayOfWeek: data.dayOfWeek,
            startHour: data.startHour,
            endHour: data.endHour,
            color: data.color,
          });
        });
        setEvents(fetchedEvents); // Update state
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching data: ', error);
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => unsubscribe();
  }, []); // [] = Jalankan sekali saat komponen dimuat

  // 7. Fungsi untuk menyimpan (save) data baru ke Firestore
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDay || !newStart || !newEnd) {
      alert('Harap isi semua field');
      return;
    }

    try {
      const newEventData = {
        title: newTitle,
        dayOfWeek: parseInt(newDay, 10),
        startHour: parseFloat(newStart), // parseFloat agar 9.5 (9:30) valid
        endHour: parseFloat(newEnd),
        color: newColor,
        createdAt: Timestamp.now(), // Tambahkan timestamp
      };

      await addDoc(collection(db, 'jadwalVisit'), newEventData);

      // Reset form dan tutup modal
      setNewTitle('');
      setNewDay('0');
      setNewStart('9');
      setNewEnd('10');
      setIsModalOpen(false); // Tutup modal
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Gagal menyimpan jadwal');
    }
  };

  const getWeekRange = () => 'Apr 22-28'; // Anda bisa buat ini dinamis

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-6xl p-4 md:p-6 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-lg">
        {/* Kolom Kiri: Kalender */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              {getWeekRange()}
            </h2>

            {/* Tombol-tombol di kanan atas */}
            <div className="flex gap-2">
              {/* Tombol untuk membuka Modal */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button>Buat Jadwal</Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddEvent}>
                    <DialogHeader>
                      <DialogTitle>Buat Jadwal Baru</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {/* Form Input */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Judul</Label>
                        <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" placeholder="Contoh: Visit Dr. Budi" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="day" className="text-right">Hari</Label>
                        <Select value={newDay} onValueChange={setNewDay}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih hari" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Senin</SelectItem>
                            <SelectItem value="1">Selasa</SelectItem>
                            <SelectItem value="2">Rabu</SelectItem>
                            <SelectItem value="3">Kamis</SelectItem>
                            <SelectItem value="4">Jumat</SelectItem>
                            <SelectItem value="5">Sabtu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start" className="text-right">Mulai (Jam)</Label>
                        <Input id="start" type="number" step="0.5" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="col-span-3" placeholder="9 atau 9.5" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end" className="text-right">Selesai (Jam)</Label>
                        <Input id="end" type="number" step="0.5" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="col-span-3" placeholder="10 atau 10.5" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">Warna</Label>
                        <Select value={newColor} onValueChange={setNewColor}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih warna" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bg-blue-500">Biru</SelectItem>
                            <SelectItem value="bg-green-500">Hijau</SelectItem>
                            <SelectItem value="bg-red-500">Merah</SelectItem>
                            <SelectItem value="bg-purple-500">Ungu</SelectItem>
                            <SelectItem value="bg-yellow-500">Kuning</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
                      <Button type="submit">Simpan</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Tombol Share (Sama seperti sebelumnya) */}
              <Button variant="outline" className="flex items-center gap-2 text-sm">
                <ShareIcon />
                Share
              </Button>
            </div>
          </div>

          {/* 8. Render Kalender dengan data dari state (bukan dummyEvents) */}
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              Memuat jadwal dari database...
            </div>
          ) : (
            <CalendarWeekView events={events} />
          )}
        </div>

        {/* Kolom Kanan: Sidebar (Tidak berubah) */}
        <div className="md:col-span-1 md:pl-6 md:border-l md:border-gray-200 space-y-6">
          {/* Akses */}
          <div>
            <Label
              htmlFor="access"
              className="text-base font-semibold text-gray-700"
            >
              Access
            </Label>
            <Select defaultValue="can_edit">
              <SelectTrigger id="access" className="w-full mt-2">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="can_edit">Can edit</SelectItem>
                <SelectItem value="can_view">Can view</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Track */}
          <div>
            <Label className="text-base font-semibold text-gray-700">
              Track
            </Label>
            <RadioGroup defaultValue="in_progress" className="mt-2 space-y-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="to_do" id="r1" />
                <Label
                  htmlFor="r1"
                  className="text-gray-700 font-normal cursor-pointer"
                >
                  To Do
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="in_progress" id="r2" />
                <Label
                  htmlFor="r2"
                  className="text-gray-700 font-normal cursor-pointer"
                >
                  In Progress
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="done" id="r3" />
                <Label
                  htmlFor="r3"
                  className="text-gray-700 font-normal cursor-pointer"
                >
                  Done
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Progress */}
          <div>
            <Label className="text-base font-semibold text-gray-700">
              Progress
            </Label>
            <div className="flex items-center gap-4 mt-2">
              <Progress value={50} className="w-full h-2 rounded-full" />
              <span className="text-sm font-medium text-gray-600">50%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

