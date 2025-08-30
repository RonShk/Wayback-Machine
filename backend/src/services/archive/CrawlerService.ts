import { chromium } from 'playwright';

export interface PageData {
  url: string;
  html: string;
  title: string;
  links: string[];
}

export class CrawlerService {
  private visitedUrls = new Set<string>();
  private maxDepth = 20;
  private maxPages = 100;

  async crawlWebsite(startUrl: string): Promise<PageData[]> {
    this.visitedUrls.clear();
    const pagesData: PageData[] = [];
    const urlQueue = [{ url: startUrl, depth: 0 }];
    
    while (urlQueue.length > 0 && pagesData.length < this.maxPages) {
      const { url, depth } = urlQueue.shift()!;
      
      if (this.visitedUrls.has(url) || depth > this.maxDepth) {
        continue;
      }
      
      try {
        const pageData = await this.crawlPage(url);
        this.visitedUrls.add(url);
        pagesData.push(pageData); // Store the complete page data (HTML + links)
        
        // Add internal links to queue for further crawling
        if (depth < this.maxDepth) {
          pageData.links.forEach(link => {
            if (!this.visitedUrls.has(link) && this.isSameDomain(startUrl, link)) {
              urlQueue.push({ url: link, depth: depth + 1 });
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to crawl ${url}:`, error);
      }
    }
    
    return pagesData;
  }


  async crawlPage(url: string): Promise<PageData> {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      const html = await page.content();
      const title = await page.title();
      
      // Extract all internal links
      const links = await page.evaluate((baseUrl) => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors
          .map(a => a.getAttribute('href'))
          .filter(href => href)
          .map(href => new URL(href!, baseUrl).href);
      }, url);
      
      return { url, html, title, links };
    } finally {
      await browser.close();
    }
  }

  private isSameDomain(url1: string, url2: string): boolean {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2;
    } catch {
      return false;
    }
  }

  setLimits(maxDepth: number, maxPages: number) {
    this.maxDepth = maxDepth;
    this.maxPages = maxPages;
  }
}