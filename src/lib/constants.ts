// Shared constants

export const EXPENSE_CATEGORIES = ["Loyer", "Facture", "Transport", "Fournitures", "Salaires", "Marketing", "Autre"] as const;

export const STAFF_ROLES = ["Vendeur", "Caissier", "Gérant", "Styliste", "Autre"] as const;

export const AD_PLATFORMS = ["Facebook", "Instagram", "TikTok", "Google Ads"] as const;

export const formatCurrency = (val: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " FCFA";

export const getMonthStart = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

export const getToday = () => new Date().toISOString().split("T")[0];
