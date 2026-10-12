import { BoundaryError } from '../domain/errors.ts';
import { Effect } from 'effect';
import type { Article } from '../domain/types.ts';
import { Readability } from '@mozilla/readability';
import {
  sanitizeArticle,
  inspectWebP,
  MAX_IMAGES,
  MAX_IMAGE_DIMENSION,
  MAX_TOTAL_IMAGE_URI_LENGTH,
  MAX_TOTAL_IMAGE_PIXELS,
  validImageDimensions
} from './sanitize.ts';






type ImageBudget = { attempts:number;bytes:number;examined:number;screenshots:number;pixels:number;nativeChecked:WeakSet<HTMLImageElement>;deadline:number;stageDeadline:number;limitExceeded:boolean };
type CaptureResult = {ok:true;imageLimitExceeded:boolean;imageWarning:string;article:Article & {textContent:string}}|{ok:false;error:string};
type CaptureMessage = {type?:string;action?:string;captureToken?:string};
type CaptureListener = (message:CaptureMessage,sender:chrome.runtime.MessageSender,sendResponse:(response:CaptureResult)=>void)=>true|undefined;

const IMAGE_FETCH_TIMEOUT = 2000;
const MAX_IMAGE_FETCH_BYTES = 2 * 1024 * 1024;
const MAX_CAPTURE_FETCH_BYTES = 8 * 1024 * 1024;
const IMAGE_CAPTURE_TIMEOUT = 8000;
const IMAGE_STAGE_TIMEOUT = 25000;


function afterPaint(view: Window, deadline: number): Promise<boolean> {
  if (Date.now() >= deadline) return Promise.resolve(false);
  return new Promise((resolve) => {
    
    const finish = (painted: boolean) => {
      clearTimeout(timer);
      resolve(painted);
    };
    const timer = setTimeout(
      () => finish(false),
      Math.min(500, deadline - Date.now())
    );
    view.requestAnimationFrame(() =>
      view.requestAnimationFrame(() => finish(true))
    );
  });
}


async function screenshotPixels(
  original: HTMLImageElement,
  sourceDocument: Document,
  budget: ImageBudget,
  captureToken: string|undefined
): Promise<HTMLCanvasElement|null> {
  const view = sourceDocument.defaultView;
  if (
    !captureToken ||
    !globalThis.chrome?.runtime?.sendMessage ||
    !view?.createImageBitmap ||
    budget.screenshots >= MAX_IMAGES ||
    Date.now() >= budget.stageDeadline
  )
    return null;
  const scroll = [view.scrollX, view.scrollY];
  
  let viewport: ImageBitmap|undefined;
  
  let overlay: HTMLImageElement|undefined;
  try {
    if (!original.complete || original.naturalWidth <= 1) {
      original.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant'
      });
      if (!(await afterPaint(view, budget.stageDeadline))) return null;
    }
    // Scrolling can activate the publisher's ordinary lazy loading. Do not wait indefinitely.
    if (!original.complete || original.naturalWidth <= 1) {
      await new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          original.removeEventListener('load', done);
          original.removeEventListener('error', done);
          resolve(undefined);
        };
        const timer = setTimeout(done, 500);
        original.addEventListener('load', done, { once: true });
        original.addEventListener('error', done, { once: true });
      });
    }
    if (
      !original.complete ||
      original.naturalWidth <= 1 ||
      original.naturalHeight <= 1 ||
      Date.now() >= budget.stageDeadline
    )
      return null;
    if (
      !validImageDimensions({
        width: original.naturalWidth,
        height: original.naturalHeight
      })
    ) {
      budget.limitExceeded = true;
      return null;
    }
    if (!budget.nativeChecked.has(original)) {
      budget.nativeChecked.add(original);
      budget.pixels += original.naturalWidth * original.naturalHeight;
      if (budget.pixels > MAX_TOTAL_IMAGE_PIXELS) {
        budget.limitExceeded = true;
        return null;
      }
    }
    overlay = sourceDocument.createElement('img');
    overlay.src = original.currentSrc || original.src;
    overlay.alt = '';
    const fit = Math.min(
      1,
      (view.innerWidth - 32) / original.naturalWidth,
      (view.innerHeight - 32) / original.naturalHeight
    );
    const width = Math.max(1, Math.floor(original.naturalWidth * fit)),
      height = Math.max(1, Math.floor(original.naturalHeight * fit));
    overlay.setAttribute(
      'style',
      `all:initial!important;position:fixed!important;left:${Math.floor((view.innerWidth - width) / 2)}px!important;top:${Math.floor((view.innerHeight - height) / 2)}px!important;width:${width}px!important;height:${height}px!important;max-width:none!important;max-height:none!important;z-index:2147483647!important;background:white!important;object-fit:fill!important;opacity:1!important;visibility:visible!important;display:block!important;`
    );
    sourceDocument.documentElement.append(overlay);
    let decodeTimer;
    try {
      const decoded = await Promise.race([
        overlay.decode().then(() => true),
        new Promise((resolve) => {
          decodeTimer = setTimeout(() => resolve(false), 1000);
        })
      ]);
      if (!decoded) return null;
    } finally {
      clearTimeout(decodeTimer);
    }
    if (!(await afterPaint(view, budget.stageDeadline))) return null;
    const rect = overlay.getBoundingClientRect();
    if (
      rect.width < 2 ||
      rect.height < 2 ||
      rect.left < 0 ||
      rect.top < 0 ||
      rect.right > view.innerWidth ||
      rect.bottom > view.innerHeight
    )
      return null;
    budget.screenshots++;
    const response: unknown = (await chrome.runtime.sendMessage({
      target: 'background',
      action: 'CAPTURE_IMAGE_PIXELS',
      captureToken
    }));
    if (
      typeof response !== 'object' || response === null || !('ok' in response) || response.ok !== true ||
      !('data' in response) || typeof response.data !== 'object' || response.data === null || !('dataUrl' in response.data) ||
      typeof response.data.dataUrl !== 'string' ||
      !response.data.dataUrl.startsWith('data:image/png;base64,')
    )
      return null;
    const encoded = response.data.dataUrl.slice('data:image/png;base64,'.length);
    const binary = view.atob(encoded),
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    viewport = await view.createImageBitmap(
      new Blob([bytes], { type: 'image/png' })
    );
    const scaleX = viewport.width / view.innerWidth,
      scaleY = viewport.height / view.innerHeight;
    const canvas = sourceDocument.createElement('canvas');
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / rect.width,
      MAX_IMAGE_DIMENSION / rect.height
    );
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(
      viewport,
      rect.left * scaleX,
      rect.top * scaleY,
      rect.width * scaleX,
      rect.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return canvas;
  } catch {
    return null;
  } finally {
    viewport?.close();
    overlay?.remove();
    view.scrollTo({ left: scroll[0], top: scroll[1], behavior: 'instant' });
  }
}


function encodeImage(image: HTMLImageElement|HTMLCanvasElement|ImageBitmap, sourceDocument: Document, maximumLength: number, budget: ImageBudget) {
  const width = 'naturalWidth' in image ? image.naturalWidth || image.width : image.width,
    height = 'naturalHeight' in image ? image.naturalHeight || image.height : image.height;
  if (!validImageDimensions({ width, height })) {
    budget.limitExceeded = true;
    return null;
  }
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / width,
    MAX_IMAGE_DIMENSION / height
  );
  const canvas = sourceDocument.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const candidate = canvas.toDataURL('image/webp', 0.8);
  if (candidate.length > maximumLength) {
    budget.limitExceeded = true;
    return null;
  }
  return inspectWebP(candidate) ? candidate : null;
}


async function anonymousPixels(original: HTMLImageElement, sourceDocument: Document, budget: ImageBudget): Promise<ImageBitmap|null> {
  const view = sourceDocument.defaultView;
  if (
    !view?.fetch ||
    !view.createImageBitmap ||
    budget.attempts >= MAX_IMAGES ||
    Date.now() >= budget.deadline ||
    budget.bytes >= MAX_CAPTURE_FETCH_BYTES
  )
    return null;
  let url;
  try {
    url = new URL(
      original.currentSrc || original.src,
      sourceDocument.location.href
    );
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
  } catch {
    return null;
  }
  budget.attempts++;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(IMAGE_FETCH_TIMEOUT, budget.deadline - Date.now())
  );
  try {
    const response = await view.fetch(url.href, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    const mime = ((response.headers.get('content-type') || '').split(';')[0] || '')
      .trim()
      .toLowerCase();
    if (
      !response.ok ||
      !response.body ||
      ![
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/avif'
      ].includes(mime) ||
      Number(response.headers.get('content-length')) > MAX_IMAGE_FETCH_BYTES
    )
      return null;
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        budget.bytes += value.byteLength;
        if (
          size > MAX_IMAGE_FETCH_BYTES ||
          budget.bytes > MAX_CAPTURE_FETCH_BYTES
        ) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (controller.signal.aborted || Date.now() >= budget.deadline) return null;
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / original.naturalWidth,
      MAX_IMAGE_DIMENSION / original.naturalHeight
    );
    const decoded = view
      .createImageBitmap(new Blob(chunks, { type: mime }), {
        resizeWidth: Math.max(1, Math.round(original.naturalWidth * scale)),
        resizeHeight: Math.max(1, Math.round(original.naturalHeight * scale)),
        resizeQuality: 'high'
      })
      .then((bitmap) => {
        if (controller.signal.aborted) {
          bitmap.close();
          return null;
        }
        return bitmap;
      });
    const aborted = new Promise<null>((resolve) =>
      controller.signal.addEventListener('abort', () => resolve(null), {
        once: true
      })
    );
    const bitmap = await Promise.race([decoded, aborted]);
    if (!bitmap) return null;
    if (controller.signal.aborted || Date.now() >= budget.deadline) {
      bitmap.close();
      return null;
    }
    return bitmap;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}


async function embedLoadedImages(html: string, sourceDocument: Document, baseUrl: string, captureToken: string|undefined) {
  
  const loaded = new Map<string,HTMLImageElement>();
  for (const image of sourceDocument.querySelectorAll('img')) {
    for (const src of [image.currentSrc, image.src])
      if (src) loaded.set(src, image);
  }
  const template = sourceDocument.createElement('template');
  template.innerHTML = html;
  let images = 0,
    total = 0;
  
  const budget: ImageBudget = {
    limitExceeded: false,
    attempts: 0,
    bytes: 0,
    examined: 0,
    screenshots: 0,
    pixels: 0,
    nativeChecked: new WeakSet(),
    deadline: Date.now() + IMAGE_CAPTURE_TIMEOUT,
    stageDeadline: Date.now() + IMAGE_STAGE_TIMEOUT
  };
  const sourceImages = [...template.content.querySelectorAll('img')];
  budget.limitExceeded = sourceImages.length > MAX_IMAGES;
  for (const image of sourceImages) {
    const alt = (image.getAttribute('alt') || '').slice(
      0,
      500
    );
    let original;
    try {
      original = loaded.get(new URL(image.getAttribute('src') || '', baseUrl).href);
    } catch {
      /* Invalid source becomes a placeholder. */
    }
    let encoded;
    const nativePixels = original ? original.naturalWidth * original.naturalHeight : 0;
    const dimensionsAllowed =
      !original || !nativePixels ||
      validImageDimensions({
        width: original.naturalWidth,
        height: original.naturalHeight
      });
    if (original && nativePixels) {
      budget.pixels += nativePixels;
      budget.nativeChecked.add(original);
    }
    if (!dimensionsAllowed || budget.pixels > MAX_TOTAL_IMAGE_PIXELS)
      budget.limitExceeded = true;
    if (
      dimensionsAllowed &&
      budget.pixels <= MAX_TOTAL_IMAGE_PIXELS &&
      original &&
      budget.examined < MAX_IMAGES &&
      Date.now() < budget.stageDeadline &&
      images < MAX_IMAGES &&
      total < MAX_TOTAL_IMAGE_URI_LENGTH
    ) {
      budget.examined++;
      const maximumLength = Math.min(
              MAX_TOTAL_IMAGE_URI_LENGTH - total
      );
      if (
        original.complete &&
        original.naturalWidth > 1 &&
        original.naturalHeight > 1
      )
        try {
          encoded = encodeImage(
            original,
            sourceDocument,
            maximumLength,
            budget
          );
        } catch {
          const bitmap = await anonymousPixels(
            original,
            sourceDocument,
            budget
          );
          if (bitmap) {
            try {
              encoded = encodeImage(
                bitmap,
                sourceDocument,
                maximumLength,
                budget
              );
            } catch {
              /* Unreadable pixels remain a placeholder. */
            } finally {
              bitmap.close();
            }
          }
        }
      if (!encoded) {
        const pixels = await screenshotPixels(
          original,
          sourceDocument,
          budget,
          captureToken
        );
        if (pixels)
          try {
            encoded = encodeImage(
              pixels,
              sourceDocument,
              maximumLength,
              budget
            );
          } catch {
            /* Keep a placeholder if rendered capture fails. */
          }
      }
    }
    if (encoded) {
      image.removeAttribute('srcset');
      image.setAttribute('src', encoded);
      image.setAttribute('alt', alt);
      images++;
      total += encoded.length;
    } else {
      const placeholder = sourceDocument.createElement('span');
      placeholder.textContent = `[Image: ${alt || 'Image unavailable'}]`;
      image.replaceWith(placeholder);
    }
  }
  return {
    content: template.innerHTML,
    imageLimitExceeded: budget.limitExceeded
  };
}

/** A class containing "author" can also describe navigation, such as authority controls. */

function articleByline(sourceDocument: Document, extractedByline: string|null|undefined) {
  
  const clean = (value: unknown) =>
    (typeof value === 'string' ? value : '')
      .replace(/\s+/g, ' ')
      .trim();
  for (const meta of sourceDocument.head?.querySelectorAll('meta') || []) {
    const field = (
      meta.getAttribute('name') ||
      meta.getAttribute('property') ||
      ''
    )
      .toLowerCase()
      .trim();
    if (
      ![
        'author',
        'article:author',
        'dc.creator',
        'dcterms.creator',
        'parsely-author'
      ].includes(field)
    )
      continue;
    const value = clean(meta.getAttribute('content'));
    if (value && !/^https?:\/\//i.test(value)) return value.slice(0, 500);
  }
  const byline = clean(extractedByline);
  if (!byline) return '';
  const authorToken =
    /(?:^|[\s_-])(?:byline|author|dateline|writtenby|p-author)(?:$|[\s_-])/i;
  for (const node of sourceDocument.querySelectorAll(
    '[rel~="author"], [itemprop~="author"], [class], [id]'
  )) {
    if (
      !node.matches('[rel~="author"], [itemprop~="author"]') &&
      !authorToken.test(`${node.getAttribute('class') || ''} ${node.id}`)
    )
      continue;
    const value = clean(
      (node.querySelector('[itemprop~="name"]') || node).textContent
    );
    if (value === byline) return byline.slice(0, 500);
  }
  return '';
}


async function captureArticleSnapshot(
  sourceDocument: Document = document,
  { captureToken }: {captureToken?:string} = {}
): Promise<CaptureResult> {
  try {
    const url = new URL(sourceDocument.location.href);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error('Open an article on a regular web page to capture it.');
    }
    url.hash = '';
    const clone = sourceDocument.cloneNode(true) as Document;
    for (const node of clone.querySelectorAll(
      '[hidden], [aria-hidden="true"], script, style, noscript, form, iframe'
    ))
      node.remove();
    const extracted = new Readability(clone).parse();
    if (!extracted?.content)
      throw new Error(
        'No readable article found. Try opening the full article first.'
      );
    const embedded = await embedLoadedImages(
      extracted.content,
      sourceDocument,
      url.href,
      captureToken
    );
    const content = sanitizeArticle(embedded.content, url.href);
    const preview = sourceDocument.createElement('div');
    preview.innerHTML = content;
    const textContent = preview.textContent.trim();
    if (textContent.length < 80)
      throw new Error(
        'There is too little article text to capture. Open the full article and try again.'
      );
    return {
      ok: true,
      imageLimitExceeded: embedded.imageLimitExceeded,
      imageWarning: embedded.imageLimitExceeded
        ? 'This capture exceeds the image budget. Choose text only to save it, or discard and try another page.'
        : '',
      article: {
        url: url.href,
        title: String(
          extracted.title || sourceDocument.title || 'Untitled article'
        )
          .trim()
          .slice(0, 500),
        byline: articleByline(sourceDocument, extracted.byline),
        content,
        textContent,
        capturedAt: Date.now()
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error && error.message ? error.message : 'This page could not be captured.'
    };
  }
}

export const captureArticleEffect = Effect.fn('captureArticle')((sourceDocument:Document = document, options:{captureToken?:string} = {}) =>
  Effect.tryPromise({try: () => captureArticleSnapshot(sourceDocument, options), catch: error => BoundaryError.from(error, error instanceof Error ? error.message : 'This page could not be captured.')})
);
export function captureArticle(sourceDocument:Document = document, options:{captureToken?:string} = {}):Promise<CaptureResult> {
  return Effect.runPromise(captureArticleEffect(sourceDocument, options));
}

// Repeated injections replace our listener so the current bundle always handles capture.
export function startContentCapture() {
  const state = globalThis as typeof globalThis & {__emberpageCaptureListener?:CaptureListener};
  if (globalThis.chrome?.runtime?.onMessage) {
    if (state.__emberpageCaptureListener)
      chrome.runtime.onMessage.removeListener(
        state.__emberpageCaptureListener
      );
    state.__emberpageCaptureListener = (message, _sender, sendResponse) => {
      if (
        message?.type !== 'CAPTURE_ARTICLE' &&
        message?.action !== 'CAPTURE_ARTICLE'
      )
        return;
      captureArticle(document, { captureToken: message.captureToken }).then(sendResponse, (error:unknown) => sendResponse({ok:false,error:error instanceof Error ? error.message : 'This page could not be captured.'})).catch(() => { /* The requesting page may close before the response arrives. */ });
      return true;
    };
    chrome.runtime.onMessage.addListener(state.__emberpageCaptureListener);
  }
}
