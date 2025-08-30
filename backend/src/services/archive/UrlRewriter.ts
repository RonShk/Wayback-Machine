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
        if (urlMappings.has(href)) {
          $(el).attr('href', './' + urlMappings.get(href));
        } else if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
          // For external font URLs that couldn't be downloaded, remove them
          // The fallback fonts in ViewerService will handle this
          console.log(`🔤 Removing external font link: ${href}`);
          $(el).remove();
        }
      }
    });
    
    // Rewrite script sources
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && urlMappings.has(src)) {
        $(el).attr('src', './' + urlMappings.get(src));
      }
    });
    
    // Rewrite image sources
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && urlMappings.has(src)) {
        $(el).attr('src', './' + urlMappings.get(src));
      }
    });
    
    // Rewrite favicon links
    $('link[rel*="icon"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && urlMappings.has(href)) {
        $(el).attr('href', './' + urlMappings.get(href));
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
