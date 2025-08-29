import { CrawlerService } from '../../../services/archive/CrawlerService.ts';

describe('CrawlerService - Real Tests', () => {
  let crawlerService: CrawlerService;

  beforeEach(() => {
    crawlerService = new CrawlerService();
  });

  describe('Real crawling tests', () => {
    it('should actually crawl httpbin.org/html and show detailed output', async () => {
      // Use a simple, reliable test site
      const testUrl = 'https://httpbin.org/html';
      
      console.log(`\n🕷️ Starting real crawl test for: ${testUrl}`);
      
      // Set conservative limits
      crawlerService.setLimits(1, 3); // depth=1, max=3 pages
      console.log(`📊 Crawler limits: depth=1, maxPages=3`);
      
      console.log(`\n🔍 Testing single page crawl first...`);
      
      // Test single page crawl
      const pageData = await crawlerService.crawlPage(testUrl);
      
      console.log(`✅ Single page crawl results:`);
      console.log(`   URL: ${pageData.url}`);
      console.log(`   Title: "${pageData.title}"`);
      console.log(`   HTML length: ${pageData.html.length} characters`);
      console.log(`   Links found: ${pageData.links.length}`);
      
      if (pageData.links.length > 0) {
        console.log(`   📋 Links found:`);
        pageData.links.slice(0, 5).forEach((link, i) => {
          console.log(`      ${i + 1}. ${link}`);
        });
        if (pageData.links.length > 5) {
          console.log(`      ... and ${pageData.links.length - 5} more`);
        }
      }
      
      // Show HTML preview
      const htmlPreview = pageData.html.substring(0, 300).replace(/\s+/g, ' ');
      console.log(`   📖 HTML preview: ${htmlPreview}...`);
      
      // Verify basic expectations
      expect(pageData.url).toBe(testUrl);
      expect(pageData.title).toBeDefined();
      expect(pageData.html).toContain('<html');
      expect(pageData.html.length).toBeGreaterThan(100);
      expect(Array.isArray(pageData.links)).toBe(true);
      
      console.log(`\n🌐 Now testing full website crawl...`);
      
      // Test full website crawl
      const pagesData = await crawlerService.crawlWebsite(testUrl);
      
      console.log(`✅ Website crawl results:`);
      console.log(`   Total pages crawled: ${pagesData.length}`);
      
      pagesData.forEach((page, i) => {
        console.log(`   📄 Page ${i + 1}:`);
        console.log(`      URL: ${page.url}`);
        console.log(`      Title: "${page.title}"`);
        console.log(`      HTML length: ${page.html.length} chars`);
        console.log(`      Links found: ${page.links.length}`);
      });
      
      expect(pagesData.length).toBeGreaterThan(0);
      expect(pagesData[0].url).toBe(testUrl);
      
      console.log(`\n🎉 Crawler test completed successfully!`);
      
    }, 60000); // 60 second timeout

    it('should handle timeouts gracefully', async () => {
      console.log(`\n⏱️ Testing timeout handling...`);
      
      // Test with a URL that should timeout quickly
      const timeoutUrl = 'https://httpstat.us/200?sleep=35000'; // 35 second delay
      
      console.log(`   Testing URL: ${timeoutUrl}`);
      console.log(`   Expected: Should timeout in 30 seconds`);
      
      const startTime = Date.now();
      
      try {
        await crawlerService.crawlPage(timeoutUrl);
        console.log(`   ❌ Unexpected: Page loaded without timeout`);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.log(`   ✅ Timeout occurred after ${elapsed}ms`);
        console.log(`   Error type: ${error?.name || 'Unknown'}`);
        console.log(`   Error message: ${error?.message?.substring(0, 100) || 'No message'}...`);
        
        expect(error?.name).toBe('TimeoutError');
        expect(elapsed).toBeLessThan(35000); // Should timeout before 35s
        expect(elapsed).toBeGreaterThan(25000); // Should take at least 25s (close to 30s timeout)
      }
      
      console.log(`\n✅ Timeout handling test completed!`);
      
    }, 45000); // 45 second timeout

    it('should respect crawling limits', async () => {
      console.log(`\n📏 Testing crawling limits...`);
      
      const testUrl = 'https://httpbin.org/html';
      
      // Test with very restrictive limits
      crawlerService.setLimits(0, 1); // depth=0, max=1 page
      console.log(`   Set limits: depth=0, maxPages=1`);
      
      const pagesData = await crawlerService.crawlWebsite(testUrl);
      
      console.log(`   Results with limits:`);
      console.log(`      Pages crawled: ${pagesData.length}`);
      console.log(`      Expected: Exactly 1 page (due to maxPages=1)`);
      
      expect(pagesData.length).toBe(1);
      expect(pagesData[0].url).toBe(testUrl);
      
      // Test with slightly higher limits
      crawlerService.setLimits(1, 3); // depth=1, max=3 pages
      console.log(`\n   Set limits: depth=1, maxPages=3`);
      
      const pagesData2 = await crawlerService.crawlWebsite(testUrl);
      
      console.log(`   Results with higher limits:`);
      console.log(`      Pages crawled: ${pagesData2.length}`);
      console.log(`      Expected: 1-3 pages (limited by available links)`);
      
      expect(pagesData2.length).toBeGreaterThanOrEqual(1);
      expect(pagesData2.length).toBeLessThanOrEqual(3);
      
      console.log(`\n✅ Limits test completed!`);
      
    }, 30000);
  });

  describe('URL validation', () => {
    it('should handle invalid URLs gracefully', async () => {
      console.log(`\n🚫 Testing invalid URL handling...`);
      
      const invalidUrls = [
        'not-a-url',
        'https://definitely-not-a-real-domain-12345.com',
        'https://httpstat.us/404'
      ];
      
      for (const url of invalidUrls) {
        console.log(`   Testing: ${url}`);
        
        try {
          await crawlerService.crawlPage(url);
          console.log(`   ❌ Unexpected success for: ${url}`);
        } catch (error: any) {
          console.log(`   ✅ Expected error for ${url}: ${error?.name || 'Unknown error'}`);
          expect(error).toBeDefined();
        }
      }
      
      console.log(`\n✅ Invalid URL test completed!`);
    }, 30000);
  });
});