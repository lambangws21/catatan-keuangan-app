// hooks/use-visits.ts
import useSWR, { MutatorOptions } from 'swr';
import { VisitDokter } from '@/lib/types';

// Definisikan fetcher global
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Definisikan tipe return untuk hook
interface UseVisitDokterResult {
  visits: VisitDokter[] | undefined;
  isLoading: boolean;
  // FIXED: Mengganti 'any' dengan tipe yang lebih spesifik. 
  // Error yang dikembalikan fetcher biasanya berupa Error atau null/undefined.
  isError: Error | unknown | undefined; 
  
  mutate: (
    data?: VisitDokter[] | Promise<VisitDokter[]> | undefined, 
    opts?: MutatorOptions<VisitDokter[]>
  ) => Promise<VisitDokter[] | undefined>;
}

export function useVisitDokter(): UseVisitDokterResult {
  // Dapatkan 'mutate' langsung dari useSWR
  const { data, error, isLoading, mutate } = useSWR<VisitDokter[]>('/api/visit-dokter', fetcher);

  return {
    visits: data,
    isLoading,
    isError: error, // 'error' dari SWR secara default bertipe any, tetapi kita men-cast tipe return hook
    mutate, 
  };
}