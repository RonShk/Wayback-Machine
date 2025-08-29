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
    
    for (const page of pagesData) {
      const rewrittenHtml = this.rewriteHtmlUrls(page.html, urlMappings);
      const filename = this.generatePageFilename(page.url);
      const filePath = path.join(archiveDir, 'pages', filename);
      
      await fs.writeFile(filePath, rewrittenHtml, 'utf8');
    }
    
    // Also rewrite URLs in CSS files
    await this.rewriteCssFiles(urlMappings, archiveId);
  }

  private rewriteHtmlUrls(html: string, urlMappings: Map<string, string>): string {
    const $ = cheerio.load(html);
    
    // Rewrite CSS links
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && urlMappings.has(href)) {
        $(el).attr('href', './' + urlMappings.get(href));
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
