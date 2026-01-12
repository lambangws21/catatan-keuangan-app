// export interface ImplantStockItem {
//     id: string;
//     no: number;
//     implant: string;
//     stockNumber: string;
//     batchNumber: string;
//     qty: number;
//     note: string;
//     createdAt: string;
//   }
  
//   export interface ImplantStockUploadResult {
//     meta: {
//       source: string;
//       fileName: string;
//       uploadedAt: string;
//       totalRows: number;
//     };
//     data: ImplantStockItem[];
//   }
  

export interface ImplantStockItem {
    id: string;
    no: number;
    stockNo: string;
    description: string;
    batch: string;
    qty: number;
    totalQty: number;
    used: number;
    refill: number;
    note: string;
    createdAt: string;
    updatedAt?: string;
  }
  

 // ✅ BASE DATA SESUAI HEADER EXCEL BARU
export interface ImplantStockItemBase {
    no: number;           // NO
    stockNo: string;     // No Stok
    description: string; // Deskripsi
    batch: string;       // Batch
    qty: number;         // Qty
    totalQty: number;   // Total Qty
    used: number;       // TERPAKAI
    refill: number;     // REFILL
    note: string;       // KET.
    createdAt: string;
    updatedAt?: string;
  }
  
  // ✅ FIRESTORE DOC
  export interface ImplantStockItem extends ImplantStockItemBase {
    id: string;
  }
  
  
  export interface ActivityLog {
    id: string;
    stockId: string;        // ID item yang diubah
    action: "CREATE" | "UPDATE" | "DELETE"; 
    message: string;        // Ringkasan aktivitas
    qtyBefore?: number;     // optional
    qtyAfter?: number;      // optional
    changedAt: string;      // ISO format
  }
  
  export type StockAction = "CREATE" | "UPDATE" | "DELETE";

export interface ImplantStockLog {
  id: string;
  stockId: string;
  action: StockAction;
  before: ImplantedFirestoreStock | null;
  after: ImplantedFirestoreStock | null;
  changedAt?: string;
}


export interface ImplantedFirestoreStock {
  no: number;
  noStok: string;
  deskripsi: string;
  description?: string;
  batch: string;
  qty: number;
  refill: number;
  terpakai: number;
  totalQty: number;
  keterangan: string;
  isDeleted?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}
