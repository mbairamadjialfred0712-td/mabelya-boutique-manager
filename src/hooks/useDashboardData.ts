import { useQuery } from "@tanstack/react-query";
import { fetchCountries } from "@/services/boutiques";
import { fetchSalesToday, fetchSalesMonth, fetchTopProducts, fetchRevenueByCountry } from "@/services/sales";
import { fetchTotalProducts, fetchLowStockCount } from "@/services/products";

export function useCountries() {
  return useQuery({ queryKey: ["countries"], queryFn: fetchCountries });
}

export function useSalesToday(countryId?: string | null) {
  return useQuery({
    queryKey: ["sales-today", countryId],
    queryFn: () => fetchSalesToday(countryId),
  });
}

export function useSalesMonth(countryId?: string | null) {
  return useQuery({
    queryKey: ["sales-month", countryId],
    queryFn: () => fetchSalesMonth(countryId),
  });
}

export function useTotalProducts(countryId?: string | null) {
  return useQuery({
    queryKey: ["total-products", countryId],
    queryFn: () => fetchTotalProducts(countryId),
  });
}

export function useLowStockCount(countryId?: string | null) {
  return useQuery({
    queryKey: ["low-stock-count", countryId],
    queryFn: () => fetchLowStockCount(countryId),
  });
}

export function useTopProducts() {
  return useQuery({ queryKey: ["top-products"], queryFn: fetchTopProducts });
}

export function useRevenueByCountry() {
  return useQuery({ queryKey: ["revenue-country"], queryFn: fetchRevenueByCountry });
}
