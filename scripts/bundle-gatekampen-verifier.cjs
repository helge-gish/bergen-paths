const path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..');
const destination=path.join(root,'apps/gatekampen/backend/supabase/functions/gatekampen-verify/index.ts');
fs.mkdirSync(path.dirname(destination),{recursive:true});
require('esbuild').buildSync({entryPoints:[path.join(root,'apps/gatekampen/backend/edge-entry.js')],bundle:true,format:'esm',platform:'neutral',outfile:destination,target:'es2022',banner:{js:'// @ts-nocheck\n// GENERATED JavaScript bundle for Deno. Source types checked in backend/verify.ts.'}});
console.log('Built Gatekampen verifier from the shared Tråkk algorithm.');
