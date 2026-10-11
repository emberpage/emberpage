import { hashUrl } from '../src/core/article.js';
import { PROVIDER } from '../src/network/nostr.js';
export async function listing(now=Date.now(), overrides={}) {
  const url=overrides.url || 'https://example.com/article';
  return {id:'a'.repeat(64),pubkey:'b'.repeat(64),url,urlHash:await hashUrl(url),contentHash:'c'.repeat(64),blobHash:'d'.repeat(64),size:150000,title:'Science field notes',byline:'A researcher',capturedAt:now-60*86400_000,createdAt:now,provider:PROVIDER,...overrides};
}
export function vote(entry, overrides={}) {return {id:'e'.repeat(64),pubkey:'f'.repeat(64),createdAt:entry.createdAt,urlHash:entry.urlHash,contentHash:entry.contentHash,value:1,...overrides};}
