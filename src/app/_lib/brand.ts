export const BRAND_CONFIGS = [
  { brand: 'vi', hostSuffix: 'myvi.in', label: 'VI Movies & TV', color: '#2563eb' },
  { brand: 'redbull', hostSuffix: 'redbull.com', label: 'Red Bull', color: '#dc2626' },
] as const

export type BrandId = (typeof BRAND_CONFIGS)[number]['brand'] | 'all'

export function detectBrand(url: string): BrandId | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const config of BRAND_CONFIGS) {
      if (hostname === config.hostSuffix || hostname.endsWith(`.${config.hostSuffix}`)) {
        return config.brand
      }
    }
    return null
  } catch {
    return null
  }
}

export function isBrandUrl(url: string, brand: BrandId): boolean {
  if (brand === 'all') return detectBrand(url) !== null
  return detectBrand(url) === brand
}

export function getBrandConfig(brand: BrandId | null | undefined) {
  if (!brand || brand === 'all') return null
  return BRAND_CONFIGS.find((c) => c.brand === brand) ?? null
}

export function getBrandLabel(brand: BrandId | null | undefined): string {
  const config = getBrandConfig(brand)
  return config?.label ?? 'All Brands'
}
