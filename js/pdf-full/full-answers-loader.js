/* Load all 720 complete answers extracted from 硬件产品经理面试题.pdf.
   Existing summarized answers remain as fallback; this loader overwrites them with full 答案: sections. */
(() => {
  const scriptSrc = document.currentScript && document.currentScript.src;
  const base = scriptSrc ? scriptSrc.slice(0, scriptSrc.lastIndexOf('/') + 1) : './js/pdf-full/';
  const chunkCount = 21;

  window.fullPdfAnswersReady = (async () => {
    try {
      const urls = Array.from({ length: chunkCount }, (_, i) => `${base}chunk${String(i + 1).padStart(2, '0')}.txt`);
      const parts = await Promise.all(urls.map(async (url) => {
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`answer chunk load failed: ${r.status} ${url}`);
        return r.text();
      }));
      const b64 = parts.join('').replace(/\s+/g, '');
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      if (!('DecompressionStream' in window)) throw new Error('DecompressionStream is not supported by this browser');
      const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
      const json = await new Response(stream).text();
      const full = JSON.parse(json);
      Object.assign(ANSWER_DATA.byQuestion, full);
      window.__FULL_PDF_ANSWER_COUNT__ = Object.keys(full).length;
      console.info(`[硬件PM知识花园] 已加载 ${window.__FULL_PDF_ANSWER_COUNT__} 道 PDF 完整答案`);
      return full;
    } catch (err) {
      console.error('[硬件PM知识花园] 完整 PDF 答案加载失败，已回退到原答案层', err);
      return null;
    }
  })();
})();
