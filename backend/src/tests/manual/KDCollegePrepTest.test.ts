import { CrawlerService } from '../../services/archive/CrawlerService.ts';
import { ArchiveService } from '../../services/ArchiveService.ts';

describe('KD College Prep Website Test', () => {
  let crawlerService: CrawlerService;
  let archiveService: ArchiveService;

  beforeEach(() => {
    crawlerService = new CrawlerService();
    archiveService = new ArchiveService();
    // Set conservative limits for testing
    crawlerService.setLimits(1, 3);
    archiveService.setCrawlerLimits(1, 3);
  });

  it('should crawl https://ondemand.kdcollegeprep.com/ and show detailed results', async () => {
    const testUrl = 'https://ondemand.kdcollegeprep.com/';
    
    console.log(`\n🎓 Testing KD College Prep website: ${testUrl}`);
    console.log(`📊 Crawler limits: depth=1, maxPages=3`);
    
    try {
      console.log(`\n🔍 Step 1: Testing single page crawl...`);
      
      // Test single page crawl first
      const pageData = await crawlerService.crawlPage(testUrl);
      
      console.log(`✅ Single page crawl results:`);
      console.log(`   URL: ${pageData.url}`);
      console.log(`   Title: "${pageData.title}"`);
      console.log(`   HTML length: ${pageData.html.length} characters`);
      console.log(`   Links found: ${pageData.links.length}`);
      
      // Show some of the links found
      if (pageData.links.length > 0) {
        console.log(`   📋 First 5 links found:`);
        pageData.links.slice(0, 5).forEach((link, i) => {
          console.log(`      ${i + 1}. ${link}`);
        });
        if (pageData.links.length > 5) {
          console.log(`      ... and ${pageData.links.length - 5} more links`);
        }
      }
      
      // Show HTML content preview
      const htmlPreview = pageData.html.substring(0, 500).replace(/\s+/g, ' ');
      console.log(`   📖 HTML preview (first 500 chars):`);
      console.log(`      ${htmlPreview}...`);
      
      // Check if it contains expected content from the website
      const expectedContent = [
        'KD College Prep',
        'On-Demand',
        'Login',
        'Dashboard'
      ];
      
      console.log(`\n🔍 Checking for expected content:`);
      expectedContent.forEach(content => {
        const found = pageData.html.includes(content);
        console.log(`   ${found ? '✅' : '❌'} "${content}": ${found ? 'Found' : 'Not found'}`);
      });
      
      // Basic assertions
      expect(pageData.url).toBe(testUrl);
      expect(pageData.title).toBeDefined();
      expect(pageData.html.length).toBeGreaterThan(100);
      expect(pageData.html).toContain('KD College Prep');
      
      console.log(`\n🌐 Step 2: Testing full website crawl...`);
      
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
      
      console.log(`\n🎉 KD College Prep crawl test completed successfully!`);
      
    } catch (error: any) {
      console.log(`\n❌ Error crawling KD College Prep website:`);
      console.log(`   Error type: ${error?.name || 'Unknown'}`);
      console.log(`   Error message: ${error?.message || 'No message'}`);
      console.log(`   Full error:`, error);
      
      // Still want to see what the error was
      throw error;
    }
    
  }, 60000); // 60 second timeout

  it('should archive https://ondemand.kdcollegeprep.com/ end-to-end', async () => {
    const testUrl = 'https://ondemand.kdcollegeprep.com/';
    
    console.log(`\n📦 Testing full archive process for: ${testUrl}`);
    
    try {
      // Start archiving
      const result = await archiveService.createArchive(testUrl);
      
      console.log(`✅ Archive initiated:`);
      console.log(`   Archive ID: ${result.id}`);
      console.log(`   Status: ${result.status}`);
      
      // Wait for completion
      console.log(`\n⏳ Waiting for archive to complete...`);
      let status = await archiveService.getArchiveStatus(result.id);
      let attempts = 0;
      const maxAttempts = 60;
      
      while (status?.status === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        status = await archiveService.getArchiveStatus(result.id);
        attempts++;
        
        if (attempts % 10 === 0) {
          console.log(`   ⏰ Still processing... (${attempts}s elapsed)`);
        }
      }
      
      console.log(`\n📋 Final archive results:`);
      console.log(`   Status: ${status?.status}`);
      console.log(`   Pages crawled: ${status?.pageCount || 0}`);
      console.log(`   Assets found: ${status?.assetCount || 0}`);
      console.log(`   Created: ${status?.createdAt}`);
      console.log(`   Completed: ${status?.completedAt || 'N/A'}`);
      
      if (status?.error) {
        console.log(`   ❌ Error: ${status.error}`);
      }
      
      // Check if archive completed successfully
      expect(status?.status).toBe('completed');
      expect(status?.pageCount).toBeGreaterThan(0);
      
      console.log(`\n🎉 KD College Prep archive completed successfully!`);
      console.log(`   Archive ID: ${result.id}`);
      console.log(`   You can find the archived files in: backend/archives/${result.id}/`);
      
    } catch (error: any) {
      console.log(`\n❌ Error during archive process:`);
      console.log(`   Error type: ${error?.name || 'Unknown'}`);
      console.log(`   Error message: ${error?.message || 'No message'}`);
      
      throw error;
    }
    
  }, 120000); // 2 minute timeout
});
