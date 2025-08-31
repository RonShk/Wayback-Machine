import * as cheerio from 'cheerio';

export interface Asset {
  url: string;
  type: 'css' | 'js' | 'image' | 'font' | 'model' | 'other';
  foundOn: string;
}

export class AssetExtractor {
  
  async extractAssetsFromPages(pagesData: Array<{url: string, html: string}>): Promise<Asset[]> {
    const allAssets: Asset[] = [];
    const jsFilesToParse: Asset[] = [];
    
    for (const page of pagesData) {
      const htmlAssets = await this.parseAssetsFromHtml(page.html, page.url);
      allAssets.push(...htmlAssets);
      
      // Collect JS files for later parsing
      jsFilesToParse.push(...htmlAssets.filter(asset => asset.type === 'js'));
      
      // Extract assets from inline CSS
      const cssAssets = await this.extractFromInlineCSS(page.html, page.url);
      allAssets.push(...cssAssets);
      
      // Extract assets from JavaScript content (inline scripts only for now)
      const jsAssets = await this.extractFromJavaScript(page.html, page.url);
      allAssets.push(...jsAssets);
    }
    
    // Parse external JavaScript files for additional asset references
    console.log(`🔍 Parsing ${jsFilesToParse.length} external JS files for asset references...`);
    for (const jsAsset of jsFilesToParse) {
      try {
        const jsContent = await this.fetchJavaScriptContent(jsAsset.url);
        if (jsContent) {
          const additionalAssets = this.parseAssetsFromJavaScript(jsContent, jsAsset.url);
          console.log(`🔍 Found ${additionalAssets.length} additional assets in ${jsAsset.url}`);
          allAssets.push(...additionalAssets);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse JS file ${jsAsset.url}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Also parse external CSS files for additional asset references
    const cssFilesToParse = allAssets.filter(asset => asset.type === 'css');
    console.log(`🎨 Parsing ${cssFilesToParse.length} external CSS files for asset references...`);
    for (const cssAsset of cssFilesToParse) {
      try {
        const cssContent = await this.fetchCSSContent(cssAsset.url);
        if (cssContent) {
          const additionalAssets = this.parseAssetsFromCssSync(cssContent, cssAsset.url);
          console.log(`🎨 Found ${additionalAssets.length} additional assets in ${cssAsset.url}`);
          allAssets.push(...additionalAssets);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse CSS file ${cssAsset.url}:`, error instanceof Error ? error.message : String(error));
      }
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

  private async extractFromJavaScript(html: string, baseUrl: string): Promise<Asset[]> {
    const $ = cheerio.load(html);
    const assets: Asset[] = [];

    // Extract from inline JavaScript
    $('script:not([src])').each((_, el) => {
      const jsContent = $(el).html();
      if (jsContent) {
        const jsAssets = this.parseAssetsFromJavaScript(jsContent, baseUrl);
        assets.push(...jsAssets);
      }
    });

    return assets;
  }

  private parseAssetsFromJavaScript(jsContent: string, baseUrl: string): Asset[] {
    const assets: Asset[] = [];
    
    // Enhanced patterns to catch fetch calls and JSON files
    const patterns = [
      // Fetch calls - catch any URL in fetch()
      /fetch\s*\(\s*['"]([^'"]+)['"]\s*\)/gi,
      // JSON files specifically
      /"([^"]*\.json)"/gi,
      /'([^']*\.json)'/gi,
      // Direct asset references with common extensions (including json now)
      /"([^"]*\.(css|js|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|glb|gltf))"/gi,
      /'([^']*\.(css|js|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|glb|gltf))'/gi,
      // Import statements (ES6 and CommonJS) - only for actual files
      /import\s+.*?\s+from\s+['"]([^'"]+\.(css|js|mjs|json))['"]/gi,
      /require\s*\(\s*['"]([^'"]+\.(css|js|mjs|json))['"]\s*\)/gi,
      // Dynamic imports - only for JS/CSS/JSON
      /import\s*\(\s*['"]([^'"]+\.(js|mjs|css|json))['"]\s*\)/gi,
      // Asset loading patterns - be more specific
      /(?:src|href|url|path|file|asset)\s*[:=]\s*['"]([^'"]*\.(css|js|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|glb|gltf))['"]?/gi,
      // URL constructor patterns - only for likely assets
      /new\s+URL\s*\(\s*['"]([^'"]+\.(css|js|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|glb|gltf))['"]/gi,
      // XMLHttpRequest patterns
      /\.open\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/gi,
      // Axios and other HTTP library patterns
      /(?:axios|http)\.get\s*\(\s*['"]([^'"]+)['"]/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(jsContent)) !== null) {
        const url = match[1];
        if (url && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('javascript:') && this.isLikelyRealAsset(url)) {
          try {
            const resolvedUrl = this.resolveUrl(baseUrl, url);
            const assetType = this.determineAssetType(url);
            
            // Only log occasionally to reduce noise
            if (Math.random() < 0.1) {
              console.log(`🔍 Found JS asset: ${resolvedUrl} (${assetType})`);
            }
            
            assets.push({
              url: resolvedUrl,
              type: assetType,
              foundOn: baseUrl
            });
          } catch (error) {
            // Skip invalid URLs silently
          }
        }
      }
    }

    return assets;
  }

  /**
   * Check if a URL is likely to be a real asset (not a template or placeholder)
   */
  private isLikelyRealAsset(url: string): boolean {
    // Skip URLs that look like templates or placeholders
    if (url.includes('${') || url.includes('{') || url.includes('%')) return false;
    if (url.includes('__') || url.includes('{{')) return false;
    if (url.length < 3 || url.length > 200) return false;
    if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
    if (url.includes('example.') || url.includes('test.')) return false;
    
    // Must have a reasonable file extension or be a common API endpoint
    const ext = url.split('.').pop()?.toLowerCase();
    const validExts = ['css', 'js', 'mjs', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'glb', 'gltf'];
    
    // Also allow common API endpoints without extensions
    const commonEndpoints = ['/spec', '/api/', '/swagger', '/openapi'];
    const hasCommonEndpoint = commonEndpoints.some(endpoint => url.includes(endpoint));
    
    return validExts.includes(ext || '') || hasCommonEndpoint;
  }

  private async fetchJavaScriptContent(url: string): Promise<string | null> {
    try {
      console.log(`📥 Fetching JS content from: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },

      });
      
      if (!response.ok) {
        console.log(`⚠️ Failed to fetch JS file: ${url} (${response.status})`);
        return null;
      }
      
      const content = await response.text();
      console.log(`✅ Fetched ${content.length} characters from ${url}`);
      return content;
    } catch (error) {
      console.log(`❌ Error fetching JS file ${url}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async fetchCSSContent(url: string): Promise<string | null> {
    try {
      console.log(`📥 Fetching CSS content from: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },

      });
      
      if (!response.ok) {
        console.log(`⚠️ Failed to fetch CSS file: ${url} (${response.status})`);
        return null;
      }
      
      const content = await response.text();
      console.log(`✅ Fetched ${content.length} characters from ${url}`);
      return content;
    } catch (error) {
      console.log(`❌ Error fetching CSS file ${url}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private determineAssetType(url: string): Asset['type'] {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['css'].includes(extension || '')) return 'css';
    if (['js', 'mjs'].includes(extension || '')) return 'js';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(extension || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(extension || '')) return 'font';
    if (['glb', 'gltf', 'obj', 'fbx', 'dae', '3ds', 'ply', 'stl'].includes(extension || '')) return 'model';
    
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