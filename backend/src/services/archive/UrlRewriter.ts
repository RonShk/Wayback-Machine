import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

export class UrlRewriter {
  
  async rewriteUrls(
    pagesData: Array<{url: string, html: string}>, 
    urlMappings: Map<string, string>, 
    archiveId: string
  ): Promise<void> {
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    
    // Create page URL mappings for internal navigation
    const pageUrlMappings = this.createPageUrlMappings(pagesData);
    
    for (const page of pagesData) {
      const rewrittenHtml = this.rewriteHtmlUrls(page.html, urlMappings, pageUrlMappings);
      const filename = this.generatePageFilename(page.url);
      const filePath = path.join(archiveDir, 'pages', filename);
      
      await fs.writeFile(filePath, rewrittenHtml, 'utf8');
    }
    
    // Also rewrite URLs in CSS files
    await this.rewriteCssFiles(urlMappings, archiveId);
  }

  private createPageUrlMappings(pagesData: Array<{url: string, html: string}>): Map<string, string> {
    const pageUrlMappings = new Map<string, string>();
    
    for (const page of pagesData) {
      const filename = this.generatePageFilename(page.url);
      pageUrlMappings.set(page.url, filename);
      
      // Also handle URLs with and without trailing slashes
      const urlWithoutSlash = page.url.endsWith('/') ? page.url.slice(0, -1) : page.url;
      const urlWithSlash = page.url.endsWith('/') ? page.url : page.url + '/';
      
      pageUrlMappings.set(urlWithoutSlash, filename);
      pageUrlMappings.set(urlWithSlash, filename);
    }
    
    return pageUrlMappings;
  }

  private rewriteHtmlUrls(html: string, urlMappings: Map<string, string>, pageUrlMappings?: Map<string, string>): string {
    const $ = cheerio.load(html);
    
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
          $(el).attr('href', './' + mappedPath);
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
          $(el).attr('src', './' + mappedPath);
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
          if ($(el).attr('src')) {
            $(el).attr('src', './' + mappedPath);
          } else {
            $(el).attr('href', './' + mappedPath);
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
    
    // Rewrite internal page navigation links
    if (pageUrlMappings) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && pageUrlMappings.has(href)) {
          const localPageFile = pageUrlMappings.get(href);
          $(el).attr('href', './' + localPageFile);
          console.log(`🔗 Rewritten page link: ${href} -> ./${localPageFile}`);
        }
      });
    }
    
    return $.html();
  }

  private rewriteCssUrls(css: string, urlMappings: Map<string, string>): string {
    let rewrittenCss = css;
    
    // Rewrite url() statements
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    rewrittenCss = rewrittenCss.replace(urlRegex, (match, url) => {
      if (urlMappings.has(url)) {
        return `url('./${urlMappings.get(url)}')`;
      }
      return match;
    });
    
    // Rewrite @import statements
    const importRegex = /@import\s+['"]([^'"]+)['"]/g;
    rewrittenCss = rewrittenCss.replace(importRegex, (match, url) => {
      if (urlMappings.has(url)) {
        return `@import './${urlMappings.get(url)}'`;
      }
      return match;
    });
    
    return rewrittenCss;
  }

  private async rewriteCssFiles(urlMappings: Map<string, string>, archiveId: string): Promise<void> {
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    const cssDir = path.join(archiveDir, 'assets', 'css');
    
    try {
      const cssFiles = await fs.readdir(cssDir);
      
      for (const file of cssFiles) {
        if (file.endsWith('.css')) {
          const filePath = path.join(cssDir, file);
          const css = await fs.readFile(filePath, 'utf8');
          const rewrittenCss = this.rewriteCssUrls(css, urlMappings);
          await fs.writeFile(filePath, rewrittenCss, 'utf8');
        }
      }
    } catch (error) {
      console.warn('Failed to rewrite CSS files:', error);
    }
  }

  private generatePageFilename(url: string): string {
    const urlObj = new URL(url);
    let filename = urlObj.pathname.replace(/\//g, '_');
    
    if (!filename || filename === '_') {
      filename = 'index';
    }
    
    return filename.endsWith('.html') ? filename : `${filename}.html`;
  }
}
