import { defineConfig } from 'astro/config';

// blastimage coming-soon landing — static output, deployed as a Cloudflare Worker.
// Dev port 4003 is pinned (strictPort) per the fleet port registry
// (~/Code/natabula/docs/PORT-REGISTRY.md): 3003 is the blastimage app.
// site: is the apex canonical origin, never the www host.
// www redirects to this origin in Cloudflare DNS, not a second Worker.
// See natabula docs/DESIGN-STANDARDS.md §"Landing surfaces".
export default defineConfig({
  // Apex only. Do not put the www host here.
  site: 'https://blastimage.com',
  devToolbar: { enabled: false },
  server: {
    port: 4003,
    host: false,
  },
  vite: {
    server: {
      strictPort: true,
      // Copy and art are imported from ../brand/ (one source), outside this root.
      // Setting allow replaces Vite's default, so this root is listed too.
      fs: { allow: ['.', '../brand'] },
    },
  },
});
