// Bundles the real, unmodified corpus/matchup/pulse/scoring logic against
// an in-memory mock of @devvit/web/server (see mockDevvitServer.mjs) so
// run.mjs can exercise it standalone, with zero real redis/reddit.* calls.
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(__dirname, 'entry.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(__dirname, '.bundle', 'entry.mjs'),
  plugins: [
    {
      name: 'mock-devvit-server',
      setup(build) {
        // external + a relative path (not an absolute one) is required so
        // this resolves to the SAME module instance run.mjs imports
        // directly — an absolute path here gets inlined by esbuild instead
        // of kept external, producing a second, disconnected copy of the
        // mock's in-memory store (a real bug hit once building this).
        build.onResolve({ filter: /^@devvit\/web\/server$/ }, () => ({
          path: '../mockDevvitServer.mjs',
          external: true,
        }));
      },
    },
  ],
});

console.log('simulate: build ok');
