import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useUIStore } from "@/stores/useUIStore";

export function useUseCase(id: string | undefined) {
  const setActiveUseCaseId = useUIStore((s) => s.setActiveUseCaseId);
  const query = useQuery({
    queryKey: ["use-case", id],
    queryFn: () => api.getUseCase(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (id) setActiveUseCaseId(id);
  }, [id, setActiveUseCaseId]);

  return query;
}
