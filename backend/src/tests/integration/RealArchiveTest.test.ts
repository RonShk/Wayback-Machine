import { ArchiveService } from '../../services/ArchiveService.ts';
import fs from 'fs/promises';
import path from 'path';

describe('Real Archive Integration Test', () => {
  let archiveService: ArchiveService;

  beforeEach(() => {
    archiveService = new ArchiveService();
    // Set conservative limits for testing
    archiveService.setCrawlerLimits(1, 2); // Max depth 1, max 2 pages
  });

  it('should actually archive httpbin.org/html and show detailed results', async () => {
    // Use a simple, reliable test site
    const testUrl = 'https://www.amazon.com/';
    
    console.log(`\n🚀 Starting real archive test for: ${testUrl}`);
    console.log(`📊 Archive limits: depth=1, maxPages=2`);
    
    // Start archiving
    const result = await archiveService.createArchive(testUrl);
    
    console.log(`✅ Archive initiated successfully:`);
    console.log(`   Archive ID: ${result.id}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    
    expect(result.id).toBeDefined();
    expect(result.status).toBe('started');
    
    // Wait for archiving to complete with detailed progress
    console.log(`\n⏳ Waiting for archive to complete...`);
    let status = await archiveService.getArchiveStatus(result.id);
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    while (status?.status === 'processing' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      status = await archiveService.getArchiveStatus(result.id);
      attempts++;
      
      if (attempts % 5 === 0) { // Log every 5 seconds
        console.log(`   ⏰ Still processing... (${attempts}s elapsed)`);
      }
    }
    
    console.log(`\n📋 Final archive status:`);
    console.log(`   Status: ${status?.status}`);
    console.log(`   Pages crawled: ${status?.pageCount || 0}`);
    console.log(`   Assets found: ${status?.assetCount || 0}`);
    console.log(`   Created: ${status?.createdAt}`);
    console.log(`   Completed: ${status?.completedAt || 'N/A'}`);
    
    if (status?.error) {
      console.log(`   ❌ Error: ${status.error}`);
    }
    
    // Verify completion
    expect(status?.status).toBe('completed');
    expect(status?.pageCount).toBeGreaterThan(0);
    
    // Check file system structure
    const archiveDir = path.join(process.cwd(), 'archives', result.id);
    const pagesDir = path.join(archiveDir, 'pages');
    const assetsDir = path.join(archiveDir, 'assets');
    
    console.log(`\n📁 Checking file structure:`);
    console.log(`   Archive directory: ${archiveDir}`);
    
    // Check directories exist
    const archiveDirExists = await fs.access(archiveDir).then(() => true).catch(() => false);
    const pagesDirExists = await fs.access(pagesDir).then(() => true).catch(() => false);
    const assetsDirExists = await fs.access(assetsDir).then(() => true).catch(() => false);
    
    console.log(`   📂 Archive dir exists: ${archiveDirExists ? '✅' : '❌'}`);
    console.log(`   📂 Pages dir exists: ${pagesDirExists ? '✅' : '❌'}`);
    console.log(`   📂 Assets dir exists: ${assetsDirExists ? '✅' : '❌'}`);
    
    expect(archiveDirExists).toBe(true);
    expect(pagesDirExists).toBe(true);
    expect(assetsDirExists).toBe(true);
    
    // List generated files
    try {
      const pageFiles = await fs.readdir(pagesDir);
      console.log(`\n📄 HTML files generated (${pageFiles.length}):`);
      pageFiles.forEach(file => {
        console.log(`   📝 ${file}`);
      });
      
      expect(pageFiles.length).toBeGreaterThan(0);
      expect(pageFiles.some(file => file.endsWith('.html'))).toBe(true);
      
      // Check assets subdirectories
      const assetSubdirs = await fs.readdir(assetsDir);
      console.log(`\n🎨 Asset directories (${assetSubdirs.length}):`);
      assetSubdirs.forEach(dir => {
        console.log(`   📁 ${dir}/`);
      });
      
      // Count total asset files
      let totalAssets = 0;
      for (const subdir of assetSubdirs) {
        try {
          const subdirPath = path.join(assetsDir, subdir);
          const files = await fs.readdir(subdirPath);
          if (files.length > 0) {
            console.log(`   📁 ${subdir}/ (${files.length} files):`);
            files.forEach(file => {
              console.log(`      📎 ${file}`);
            });
            totalAssets += files.length;
          }
        } catch (e) {
          // Skip if not a directory
        }
      }
      
      console.log(`\n📊 Archive Summary:`);
      console.log(`   ✅ Status: ${status?.status}`);
      console.log(`   📄 Pages archived: ${status?.pageCount}`);
      console.log(`   🎨 Assets downloaded: ${totalAssets}`);
      console.log(`   📂 Location: ${archiveDir}`);
      console.log(`   🕒 Duration: ${attempts} seconds`);
      
      // Read and show sample HTML content
      if (pageFiles.length > 0) {
        const sampleHtmlPath = path.join(pagesDir, pageFiles[0]);
        const htmlContent = await fs.readFile(sampleHtmlPath, 'utf8');
        const htmlPreview = htmlContent.substring(0, 200) + '...';
        console.log(`\n📖 Sample HTML content (${pageFiles[0]}):`);
        console.log(`   ${htmlPreview.replace(/\n/g, '\\n')}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error reading files: ${error}`);
      throw error;
    }
    
    console.log(`\n🎉 Archive test completed successfully!`);
    
  }, 120000); // 2 minute timeout

  it('should handle archive status correctly', async () => {
    console.log(`\n🔍 Testing archive status functionality...`);
    
    // Test with non-existent archive
    const nonExistentStatus = await archiveService.getArchiveStatus('fake-id');
    console.log(`   📋 Non-existent archive status: ${nonExistentStatus}`);
    expect(nonExistentStatus).toBeNull();
    
    // Test listing archives
    const archivesList = await archiveService.listArchives();
    console.log(`   📋 Total archives in system: ${archivesList.total}`);
    console.log(`   📋 Archives list length: ${archivesList.archives.length}`);
    
    expect(archivesList).toHaveProperty('archives');
    expect(archivesList).toHaveProperty('total');
    expect(Array.isArray(archivesList.archives)).toBe(true);
    
    console.log(`\n✅ Status functionality test passed!`);
  });
});
