"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, LayoutGrid, Bell } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import ProfileSettings from "@/components/setting/profilSetting";
import NotificationSettings from "@/components/setting/NotifikasiSetting";
import PlaceholderTab from "@/components/setting/placeHolderSetting";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabContent = {
    profile: <ProfileSettings />,
    categories: (
      <PlaceholderTab
        title="Manajemen Kategori"
        description="Tambah, edit, atau hapus kategori pengeluaran Anda."
      />
    ),
    notifications: <NotificationSettings />,
  };

  return (
    <motion.div
      className="space-y-6 text-white"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-gray-400">
          Kelola informasi profil dan preferensi aplikasi Anda.
        </p>
      </header>

      <Tabs
        defaultValue="profile"
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col md:flex-row gap-8"
      >
        {/* Sidebar */}
        <TabsList className="flex flex-row justify-start md:flex-col md:items-stretch bg-transparent p-0 md:w-1/4">
          <TabsTrigger
            value="profile"
            className="justify-start gap-3 px-4 py-2 data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
          >
            <UserCircle className="h-5 w-5" /> Profil
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="justify-start gap-3 px-4 py-2 data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
          >
            <LayoutGrid className="h-5 w-5" /> Kategori
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="justify-start gap-3 px-4 py-2 data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
          >
            <Bell className="h-5 w-5" /> Notifikasi
          </TabsTrigger>
        </TabsList>

        {/* Konten */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tabContent[activeTab as keyof typeof tabContent]}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </motion.div>
  );
}
