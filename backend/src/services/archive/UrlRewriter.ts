import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

export class UrlRewriter {
  
  async rewriteUrls(
    pagesData: Array<{url: string, html: string, path: string}>, 
    urlMappings: Map<string, string>, 
    archiveId: string
  ): Promise<void> {
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    
    // Create page URL mappings for internal navigation
    const pageUrlMappings = this.createPageUrlMappings(pagesData);
    
    for (const page of pagesData) {
      const rewrittenHtml = this.rewriteHtmlUrls(page.html, urlMappings, pageUrlMappings, page.path, archiveId);
      const filePath = path.join(archiveDir, page.path);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      await fs.writeFile(filePath, rewrittenHtml, 'utf8');
    }
    
    // Also rewrite URLs in CSS files
    await this.rewriteCssFiles(urlMappings, archiveId);
  }

  private createPageUrlMappings(pagesData: Array<{url: string, html: string, path: string}>): Map<string, string> {
    const pageUrlMappings = new Map<string, string>();
    
    for (const page of pagesData) {
      pageUrlMappings.set(page.url, page.path);
      
      // Also handle URLs with and without trailing slashes
      const urlWithoutSlash = page.url.endsWith('/') ? page.url.slice(0, -1) : page.url;
      const urlWithSlash = page.url.endsWith('/') ? page.url : page.url + '/';
      
      pageUrlMappings.set(urlWithoutSlash, page.path);
      pageUrlMappings.set(urlWithSlash, page.path);
    }
    
    return pageUrlMappings;
  }

  private rewriteHtmlUrls(html: string, urlMappings: Map<string, string>, pageUrlMappings?: Map<string, string>, currentPagePath?: string, archiveId?: string): string {
    const $ = cheerio.load(html);
    
    // Add base tag to fix relative URL resolution for subpages
    if (archiveId && currentPagePath) {
      // Calculate how many directories deep this page is
      const depth = (currentPagePath.match(/\//g) || []).length;
      
      if (depth > 0 || currentPagePath !== 'index.html') {
        // For subpages, add a base tag that points back to the archive root
        const baseHref = '/api/archives/view/' + archiveId + '/';
        
        // Remove any existing base tags first
        $('base').remove();
        
        // Add the new base tag to the head
        if ($('head').length === 0) {
          $('html').prepend('<head></head>');
        }
        $('head').prepend(`<base href="${baseHref}">`);
        
        console.log(`🔧 Added base tag: ${baseHref} for page: ${currentPagePath}`);
      }
    }
    
    // Rewrite CSS links
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        let mappedPath = null;
        
        // Try exact match first
        if (urlMappings.has(href)) {
          mappedPath = urlMappings.get(href);
        } else {
          // Try to find a mapping by checking if any URL ends with the same path
          for (const [originalUrl, localPath] of urlMappings.entries()) {
            if (href.startsWith('/') && originalUrl.endsWith(href)) {
              mappedPath = localPath;
              console.log(`🔗 Mapped absolute path ${href} to ${localPath} via ${originalUrl}`);
              break;
            }
            // Also try matching just the filename
            const hrefFilename = href.split('/').pop();
            const originalFilename = originalUrl.split('/').pop();
            if (hrefFilename && originalFilename && hrefFilename === originalFilename && localPath.includes('css/')) {
              mappedPath = localPath;
              console.log(`🔗 Mapped by filename ${href} to ${localPath}`);
              break;
            }
          }
        }
        
        if (mappedPath) {
          // For pages with base tags, use absolute paths relative to archive root
          if (archiveId && currentPagePath && currentPagePath !== 'index.html') {
            $(el).attr('href', mappedPath);
          } else {
            // Calculate relative path from current page to the asset
            const relativePath = currentPagePath ? 
              this.calculateRelativePath(currentPagePath, mappedPath) : 
              mappedPath;
            $(el).attr('href', relativePath);
          }
        } else if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
          // For external font URLs that couldn't be downloaded, remove them
          console.log(`🔤 Removing external font link: ${href}`);
          $(el).remove();
        } else {
          console.log(`⚠️ Could not map CSS link: ${href}`);
        }
      }
    });
    
    // Rewrite script sources
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        let mappedPath = null;
        
        // Try exact match first
        if (urlMappings.has(src)) {
          mappedPath = urlMappings.get(src);
        } else {
          // Try to find a mapping by checking if any URL ends with the same path
          for (const [originalUrl, localPath] of urlMappings.entries()) {
            if (src.startsWith('/') && originalUrl.endsWith(src)) {
              mappedPath = localPath;
              console.log(`🔗 Mapped absolute script path ${src} to ${localPath} via ${originalUrl}`);
              break;
            }
            // Also try matching just the filename
            const srcFilename = src.split('/').pop();
            const originalFilename = originalUrl.split('/').pop();
            if (srcFilename && originalFilename && srcFilename === originalFilename && localPath.includes('js/')) {
              mappedPath = localPath;
              console.log(`🔗 Mapped script by filename ${src} to ${localPath}`);
              break;
            }
          }
        }
        
        if (mappedPath) {
          // For pages with base tags, use absolute paths relative to archive root
          if (archiveId && currentPagePath && currentPagePath !== 'index.html') {
            $(el).attr('src', mappedPath);
          } else {
            // Calculate relative path from current page to the asset
            const relativePath = currentPagePath ? 
              this.calculateRelativePath(currentPagePath, mappedPath) : 
              mappedPath;
            $(el).attr('src', relativePath);
          }
        } else {
          console.log(`⚠️ Could not map script: ${src}`);
        }
      }
    });
    
    // Rewrite image sources and favicons
    $('img[src], link[rel*="icon"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href');
      if (src) {
        let mappedPath = null;
        
        // Try exact match first
        if (urlMappings.has(src)) {
          mappedPath = urlMappings.get(src);
        } else {
          // Try to find a mapping by checking if any URL ends with the same path
          for (const [originalUrl, localPath] of urlMappings.entries()) {
            if (src.startsWith('/') && originalUrl.endsWith(src)) {
              mappedPath = localPath;
              console.log(`🔗 Mapped absolute image path ${src} to ${localPath} via ${originalUrl}`);
              break;
            }
            // Also try matching just the filename
            const srcFilename = src.split('/').pop();
            const originalFilename = originalUrl.split('/').pop();
            if (srcFilename && originalFilename && srcFilename === originalFilename) {
              mappedPath = localPath;
              console.log(`🔗 Mapped image by filename ${src} to ${localPath}`);
              break;
            }
          }
        }
        
        if (mappedPath) {
          // For pages with base tags, use absolute paths relative to archive root
          if (archiveId && currentPagePath && currentPagePath !== 'index.html') {
            const attrName = $(el).attr('src') ? 'src' : 'href';
            $(el).attr(attrName, mappedPath);
          } else {
            // Calculate relative path from current page to the asset
            const relativePath = currentPagePath ? 
              this.calculateRelativePath(currentPagePath, mappedPath) : 
              mappedPath;
            if ($(el).attr('src')) {
              $(el).attr('src', relativePath);
            } else {
              $(el).attr('href', relativePath);
            }
          }
        } else {
          console.log(`⚠️ Could not map image/icon: ${src}`);
        }
      }
    });

    // Rewrite inline CSS
    $('style').each((_, el) => {
      const css = $(el).html();
      if (css) {
        const rewrittenCss = this.rewriteCssUrls(css, urlMappings);
        $(el).html(rewrittenCss);
      }
    });

    // Rewrite inline JavaScript and add error suppression
    $('script:not([src])').each((_, el) => {
      const jsContent = $(el).html();
      if (jsContent) {
        let rewrittenJs = this.rewriteJavaScriptUrls(jsContent, urlMappings, currentPagePath);
        
        // Add error suppression for archived content
        rewrittenJs = this.addErrorSuppressionToJs(rewrittenJs);
        
        $(el).html(rewrittenJs);
      }
    });
    
    // Rewrite internal page navigation links
    if (pageUrlMappings) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && pageUrlMappings.has(href)) {
          const localPageFile = pageUrlMappings.get(href)!;
          // For pages with base tags, use absolute paths relative to archive root
          if (archiveId && currentPagePath && currentPagePath !== 'index.html') {
            $(el).attr('href', localPageFile);
          } else {
            // Calculate relative path from current page to the target page
            const relativePath = currentPagePath ? 
              this.calculateRelativePath(currentPagePath, localPageFile) : 
              localPageFile;
            $(el).attr('href', relativePath);
          }
          console.log(`🔗 Rewritten page link: ${href} -> ${localPageFile}`);
        }
      });
    }
    
    return $.html();
  }

  private addErrorSuppressionToJs(jsContent: string): string {
    let wrapped = jsContent;
    
    // Wrap any console.error calls that mention duplicates
    wrapped = wrapped.replace(
      /console\.error\s*\(\s*(['"][^'"]*[Dd]uplicated[^'"]*['"])/gi,
      'console.warn($1'
    );
    
    // Wrap Facebook Pixel code that might cause errors
    if (wrapped.includes('fbq') || wrapped.includes('__fbeventsModules')) {
      wrapped = `try { ${wrapped} } catch(e) { console.warn('Facebook tracking error in archived version:', e); }`;
    }
    
    // Wrap any throw statements about duplicates
    wrapped = wrapped.replace(
      /throw\s+new\s+Error\s*\(\s*(['"][^'"]*[Dd]uplicated[^'"]*['"])/gi,
      'console.warn($1); return'
    );
    
    return wrapped;
  }

  private rewriteJavaScriptUrls(jsContent: string, urlMappings: Map<string, string>, currentPagePath?: string): string {
    let rewrittenJs = jsContent;
    
    // Rewrite fetch() calls
    const fetchRegex = /fetch\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    rewrittenJs = rewrittenJs.replace(fetchRegex, (match, url) => {
      let mappedPath = null;
      
      // Try exact match first
      if (urlMappings.has(url)) {
        mappedPath = urlMappings.get(url);
      } else {
        // Try to find a mapping by checking if any URL ends with the same path
        for (const [originalUrl, localPath] of urlMappings.entries()) {
          if (url.startsWith('/') && originalUrl.endsWith(url)) {
            mappedPath = localPath;
            console.log(`🔗 Mapped fetch URL ${url} to ${localPath} via ${originalUrl}`);
            break;
          }
        }
      }
      
      if (mappedPath) {
        // Use relative path from current page to the asset
        const relativePath = currentPagePath ? 
          this.calculateRelativePath(currentPagePath, mappedPath) : 
          mappedPath;
        return `fetch("${relativePath}")`;
      }
      return match;
    });
    
    // Rewrite XMLHttpRequest .open() calls
    const xhrRegex = /\.open\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g;
    rewrittenJs = rewrittenJs.replace(xhrRegex, (match, url) => {
      let mappedPath = null;
      
      // Try exact match first
      if (urlMappings.has(url)) {
        mappedPath = urlMappings.get(url);
      } else {
        // Try to find a mapping by checking if any URL ends with the same path
        for (const [originalUrl, localPath] of urlMappings.entries()) {
          if (url.startsWith('/') && originalUrl.endsWith(url)) {
            mappedPath = localPath;
            console.log(`🔗 Mapped XHR URL ${url} to ${localPath} via ${originalUrl}`);
            break;
          }
        }
      }
      
      if (mappedPath) {
        // Use relative path from current page to the asset
        const relativePath = currentPagePath ? 
          this.calculateRelativePath(currentPagePath, mappedPath) : 
          mappedPath;
        return match.replace(url, relativePath);
      }
      return match;
    });
    
    // Rewrite other common URL patterns in strings
    const urlStringRegex = /(['"])([^'"]*\.(json|css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf))\1/g;
    rewrittenJs = rewrittenJs.replace(urlStringRegex, (match, quote, url) => {
      if (url.startsWith('/')) {
        let mappedPath = null;
        
        // Try exact match first
        if (urlMappings.has(url)) {
          mappedPath = urlMappings.get(url);
        } else {
          // Try to find a mapping by checking if any URL ends with the same path
          for (const [originalUrl, localPath] of urlMappings.entries()) {
            if (originalUrl.endsWith(url)) {
              mappedPath = localPath;
              console.log(`🔗 Mapped JS string URL ${url} to ${localPath} via ${originalUrl}`);
              break;
            }
          }
        }
        
        if (mappedPath) {
          // Use relative path from current page to the asset
          const relativePath = currentPagePath ? 
            this.calculateRelativePath(currentPagePath, mappedPath) : 
            mappedPath;
          return `${quote}${relativePath}${quote}`;
        }
      }
      return match;
    });
    
    return rewrittenJs;
  }

  private rewriteCssUrls(css: string, urlMappings: Map<string, string>, currentCssPath?: string): string {
    let rewrittenCss = css;
    
    // Rewrite url() statements
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    rewrittenCss = rewrittenCss.replace(urlRegex, (match, url) => {
      if (urlMappings.has(url)) {
        const mappedPath = urlMappings.get(url)!;
        const relativePath = currentCssPath ? 
          this.calculateRelativePath(currentCssPath, mappedPath) : 
          mappedPath;
        return `url('${relativePath}')`;
      }
      return match;
    });
    
    // Rewrite @import statements
    const importRegex = /@import\s+['"]([^'"]+)['"]/g;
    rewrittenCss = rewrittenCss.replace(importRegex, (match, url) => {
      if (urlMappings.has(url)) {
        const mappedPath = urlMappings.get(url)!;
        const relativePath = currentCssPath ? 
          this.calculateRelativePath(currentCssPath, mappedPath) : 
          mappedPath;
        return `@import '${relativePath}'`;
      }
      return match;
    });
    
    return rewrittenCss;
  }

  private async rewriteCssFiles(urlMappings: Map<string, string>, archiveId: string): Promise<void> {
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    
    try {
      // Find all CSS files in the archive (they could be anywhere now)
      const cssFiles = await this.findCssFiles(archiveDir);
      
      for (const cssFilePath of cssFiles) {
        const css = await fs.readFile(cssFilePath, 'utf8');
        const relativeCssPath = path.relative(archiveDir, cssFilePath);
        const rewrittenCss = this.rewriteCssUrls(css, urlMappings, relativeCssPath);
        await fs.writeFile(cssFilePath, rewrittenCss, 'utf8');
      }
    } catch (error) {
      console.warn('Failed to rewrite CSS files:', error);
    }
  }

  private async findCssFiles(dir: string): Promise<string[]> {
    const cssFiles: string[] = [];
    
    async function searchDir(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await searchDir(fullPath);
        } else if (entry.name.endsWith('.css')) {
          cssFiles.push(fullPath);
        }
      }
    }
    
    await searchDir(dir);
    return cssFiles;
  }

  /**
   * Calculate relative path from one file to another
   */
  private calculateRelativePath(fromPath: string, toPath: string): string {
    const fromDir = path.dirname(fromPath);
    const relativePath = path.relative(fromDir, toPath);
    
    // Ensure we use forward slashes for web paths
    return relativePath.replace(/\\/g, '/');
  }
}