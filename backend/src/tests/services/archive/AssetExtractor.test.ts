import { AssetExtractor } from '../../../services/archive/AssetExtractor.ts';

describe('AssetExtractor', () => {
  let extractor: AssetExtractor;

  beforeEach(() => {
    extractor = new AssetExtractor();
  });

  describe('parseAssetsFromHtml', () => {
    it('should extract CSS links', async () => {
      const html = '<link rel="stylesheet" href="/styles.css">';
      const assets = await extractor.parseAssetsFromHtml(html, 'https://amazon.com');
      
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('css');
      expect(assets[0].url).toBe('https://amazon.com/styles.css');
    });

    it('should extract JavaScript files', async () => {
      const html = '<script src="/app.js"></script>';
      const assets = await extractor.parseAssetsFromHtml(html, 'https://amazon.com');
      
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('js');
    });

    it('should extract images', async () => {
      const html = '<img src="/logo.png" alt="Logo">';
      const assets = await extractor.parseAssetsFromHtml(html, 'https://amazon.com');
      
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('image');
    });
  });

  describe('parseAssetsFromCss', () => {
    it('should extract background images from CSS', async () => {
      const css = 'body { background-image: url("/bg.jpg"); }';
      const assets = await extractor.parseAssetsFromCss(css, 'https://amazon.com');
      
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('image');
    });

    it('should extract font files from CSS', async () => {
      const css = '@font-face { src: url("/font.woff2"); }';
      const assets = await extractor.parseAssetsFromCss(css, 'https://amazon.com');
      
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('font');
    });
  });
});