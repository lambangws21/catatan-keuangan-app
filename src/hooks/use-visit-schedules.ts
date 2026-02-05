import useSWR, { type MutatorOptions } from "swr";
import type { Schedule } from "@/types/visit-dokter";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseVisitSchedulesResult {
  schedules: Schedule[] | undefined;
  isLoading: boolean;
  isError: Error | unknown | undefined;
  mutate: (
    data?: Schedule[] | Promise<Schedule[]> | undefined,
    opts?: MutatorOptions<Schedule[]>
  ) => Promise<Schedule[] | undefined>;
}

export function useVisitSchedules(): UseVisitSchedulesResult {
  const { data, error, isLoading, mutate } = useSWR<Schedule[]>(
    "/api/visit-dokter",
    fetcher
  );

  return {
    schedules: data,
    isLoading,
    isError: error,
    mutate,
  };
}

