import * as cheerio from 'cheerio';

export interface Asset {
  url: string;
  type: 'css' | 'js' | 'image' | 'font' | 'other';
  foundOn: string;
}

export class AssetExtractor {
  
  async extractAssetsFromPages(pagesData: Array<{url: string, html: string}>): Promise<Asset[]> {
    const allAssets: Asset[] = [];
    
    for (const page of pagesData) {
      const htmlAssets = await this.parseAssetsFromHtml(page.html, page.url);
      allAssets.push(...htmlAssets);
      
      // Extract assets from inline CSS
      const cssAssets = await this.extractFromInlineCSS(page.html, page.url);
      allAssets.push(...cssAssets);
    }
    
    // Remove duplicates
    return this.deduplicateAssets(allAssets);
  }

  async parseAssetsFromHtml(html: string, baseUrl: string): Promise<Asset[]> {
    const $ = cheerio.load(html);
    const assets: Asset[] = [];

    // CSS files
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const resolvedUrl = this.resolveUrl(baseUrl, href);
        console.log(`🎨 Found CSS: ${resolvedUrl}`);
        assets.push({
          url: resolvedUrl,
          type: 'css',
          foundOn: baseUrl
        });
        
        // If this is a Google Fonts or external font CSS, mark it for special handling
        if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
          console.log(`🔤 Found external font CSS: ${resolvedUrl}`);
        }
      }
    });

    // JavaScript files
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        assets.push({
          url: this.resolveUrl(baseUrl, src),
          type: 'js',
          foundOn: baseUrl
        });
      }
    });

    // Images
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        assets.push({
          url: this.resolveUrl(baseUrl, src),
          type: 'image',
          foundOn: baseUrl
        });
      }
    });

    // Favicons
    $('link[rel*="icon"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        assets.push({
          url: this.resolveUrl(baseUrl, href),
          type: 'image',
          foundOn: baseUrl
        });
      }
    });

    return assets;
  }

  async parseAssetsFromCss(css: string, baseUrl: string): Promise<Asset[]> {
    const assets: Asset[] = [];
    
    // Match url() in CSS
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    let match;
    
    while ((match = urlRegex.exec(css)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('data:')) {
        const assetType = this.determineAssetType(url);
        assets.push({
          url: this.resolveUrl(baseUrl, url),
          type: assetType,
          foundOn: baseUrl
        });
      }
    }
    
    // Match @import statements
    const importRegex = /@import\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(css)) !== null) {
      assets.push({
        url: this.resolveUrl(baseUrl, match[1]),
        type: 'css',
        foundOn: baseUrl
      });
    }
    
    return assets;
  }

  private async extractFromInlineCSS(html: string, baseUrl: string): Promise<Asset[]> {
    const $ = cheerio.load(html);
    const assets: Asset[] = [];

    $('style').each((_, el) => {
      const css = $(el).html();
      if (css) {
        const cssAssets = this.parseAssetsFromCssSync(css, baseUrl);
        assets.push(...cssAssets);
      }
    });

    return assets;
  }

  private parseAssetsFromCssSync(css: string, baseUrl: string): Asset[] {
    const assets: Asset[] = [];
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    let match;
    
    while ((match = urlRegex.exec(css)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('data:')) {
        assets.push({
          url: this.resolveUrl(baseUrl, url),
          type: this.determineAssetType(url),
          foundOn: baseUrl
        });
      }
    }
    
    return assets;
  }

  private determineAssetType(url: string): Asset['type'] {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['css'].includes(extension || '')) return 'css';
    if (['js', 'mjs'].includes(extension || '')) return 'js';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(extension || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(extension || '')) return 'font';
    
    return 'other';
  }

  private resolveUrl(baseUrl: string, relativeUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  private deduplicateAssets(assets: Asset[]): Asset[] {
    const seen = new Set<string>();
    return assets.filter(asset => {
      if (seen.has(asset.url)) return false;
      seen.add(asset.url);
      return true;
    });
  }
}
