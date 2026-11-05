import "server-only";
import { CACHE_TAGS, cached } from "@/server/cache";
import * as pricing from "./pricing.repository";
import * as products from "./product.repository";

// Public reads are cached (tag "products") and cleared when a product, its pricing or a review changes.
// The booking flow reads the repositories directly, so a guest is never priced from a stale cache.
const tags = [CACHE_TAGS.products];

export const getFeatured = cached(products.getFeatured, "products:featured", { tags });
export const getByCategory = cached(products.getByCategory, "products:by-category", { tags });
export const getProductBySlug = cached(products.getProductBySlug, "products:by-slug", { tags });
export const getRelated = cached(products.getRelated, "products:related", { tags });
export const searchProducts = cached(products.searchProducts, "products:search", {
  tags,
  revalidateSeconds: 600,
});
export const categoryCounts = cached(products.categoryCounts, "products:category-counts", { tags });
export const getAvailability = cached(products.getAvailability, "products:availability-map", { tags });
export const getPricingExtras = cached(pricing.getPricingExtras, "products:pricing-extras", { tags });

// Admin and one-off reads: always fresh
export {
  getProductsByIds,
  getProductTitle,
  getProductById,
  listForAdmin as listProductsForAdmin,
  listTitles as listProductTitles,
  listForSitemap as listProductsForSitemap,
} from "./product.repository";
