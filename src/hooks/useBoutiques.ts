import { useQuery } from "@tanstack/react-query";
import { fetchBoutiques } from "@/services/boutiques";

export function useBoutiques() {
  return useQuery({ queryKey: ["boutiques"], queryFn: fetchBoutiques });
}
