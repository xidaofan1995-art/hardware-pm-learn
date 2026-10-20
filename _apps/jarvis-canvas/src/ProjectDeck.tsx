import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowTopRightIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon, FileTextIcon, ImageIcon, ListBulletIcon, MagnifyingGlassIcon, ReaderIcon } from '@radix-ui/react-icons';
import { safePreviewImage, safeUrl, type Artifact } from './import-engine';
import type { Collection, PreviewPage } from './preview-types';
import './project-deck.css';

type ProjectDeckProps = {
  collection: Collection;
  /** Resolve collection.artifactIds in their declared order before passing these records. */
  artifacts: Artifact[];
  onOpenArtifact?: (artifact: Artifact) => void;
};

const formatLabels: Record<Artifact['type'], string> = {
  report: '报告', table: '表格', html: 'HTML', note: '笔记', link: '链接', image: '图集', pdf: 'PDF',
};

function pagesFor(artifact: Artifact): PreviewPage[] {
  if (artifact.previewPages?.length) return artifact.previewPages;
  if (artifact.items?.length) {
    const items = artifact.items.slice(0, 48);
    return Array.from({ length: Math.ceil(items.length / 6) }, (_, page) => ({
      id: `${artifact.id}-preview-${page + 1}`,
      kind: 'table' as const,
      title: artifact.title,
      subtitle: artifact.items!.length > 48 ? '预览前 48 项，完整内容请查看详情。' : artifact.summary,
      columns: ['条目', '说明'],
      rows: items.slice(page * 6, page * 6 + 6).map(item => [item.title, item.detail || '—']),
    }));
  }
  return [{
    id: `${artifact.id}-summary`, kind: 'text', title: artifact.title,
    subtitle: artifact.summary,
    sections: artifact.type !== 'html' && artifact.content
      ? [{ heading: '内容预览', body: artifact.content.slice(0, 700) + (artifact.content.length > 700 ? '…' : '') }]
      : [{ heading: '摘要', body: artifact.summary }],
  }];
}

function PreviewImage({ page, reading, zoom, onZoom }: { page: PreviewPage; reading: boolean; zoom: boolean; onZoom: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = safePreviewImage(page.image?.src);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className="deck-image-fallback"><ImageIcon/><strong>暂时无法显示预览图</strong><p>{page.image?.alt || page.title}</p></div>;
  return <figure className={'deck-image-figure ' + (zoom ? 'is-zoomed' : '')}>
    {reading && <button type="button" className="deck-zoom-button" onClick={onZoom} aria-pressed={zoom}><MagnifyingGlassIcon/>{zoom ? '适应窗口' : '放大图片'}</button>}
    <div className="deck-image-viewport"><img src={src} alt={page.image?.alt || page.title} loading="lazy" decoding="async" onError={() => setFailed(true)}/></div>
    {page.image?.caption && <figcaption>{page.image.caption}</figcaption>}
  </figure>;
}

function PageContent({ page, artifact, reading = false, zoom = false, onZoom = () => {} }: {
  page: PreviewPage; artifact: Artifact; reading?: boolean; zoom?: boolean; onZoom?: () => void;
}) {
  return <article className={'deck-paper ' + (reading ? 'is-reading' : '')}>
    <div className="deck-paper-eyebrow"><span>{formatLabels[artifact.type]}</span><span>{artifact.producer}</span></div>
    <h3>{page.title}</h3>
    {page.subtitle && <p className="deck-paper-subtitle">{page.subtitle}</p>}
    {page.kind === 'image' && <PreviewImage page={page} reading={reading} zoom={zoom} onZoom={onZoom}/>}
    {page.kind === 'table' && !!page.columns?.length && <div className="deck-table-wrap"><table><thead><tr>{page.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead><tbody>{page.rows?.map((row, rowIndex) => <tr key={rowIndex}>{page.columns!.map((_, index) => <td key={index}>{row[index] || '—'}</td>)}</tr>)}</tbody></table></div>}
    {page.sections?.map((section, index) => <section className="deck-paper-section" key={index}><h4>{section.heading}</h4><p>{section.body}</p></section>)}
  </article>;
}

/** A collection keeps file identity separate from the pages belonging to each file. */
export function ProjectDeck({ collection, artifacts, onOpenArtifact }: ProjectDeckProps) {
  const rootRef = useRef<HTMLElement>(null);
  const readerScroll = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [selectedId, setSelectedId] = useState(artifacts[0]?.id || '');
  const [pagePositions, setPagePositions] = useState<Record<string, number>>({});
  const [readerOpen, setReaderOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [direction, setDirection] = useState(1);
  const [transitionKey, setTransitionKey] = useState(0);
  const scrollPositions = useRef<Record<string, number>>({});
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const titleId = useId();
  const directoryId = useId();
  const selectedIndex = Math.max(0, artifacts.findIndex(artifact => artifact.id === selectedId));
  const artifact = artifacts[selectedIndex];
  const pages = useMemo(() => artifact ? pagesFor(artifact) : [], [artifact]);
  const pageIndex = Math.min(pagePositions[artifact?.id] || 0, pages.length - 1);
  const page = pages[pageIndex];
  const scrollKey = `${artifact?.id}:${page?.id}`;
  const originalUrl = artifact && safeUrl(artifact.url);
  const driveOriginal = originalUrl && /^(drive|docs)\.google\.com$/i.test(new URL(originalUrl).hostname);
  const totalPages = artifacts.reduce((total, item) => total + pagesFor(item).length, 0);

  useEffect(() => { setPortalContainer(rootRef.current?.closest<HTMLElement>('.canvas-app') || null); }, []);
  useLayoutEffect(() => {
    if (readerOpen && readerScroll.current) readerScroll.current.scrollTop = scrollPositions.current[scrollKey] || 0;
  }, [readerOpen, scrollKey]);

  if (!artifact || !page) return null;
  const rememberScroll = () => { if (readerScroll.current) scrollPositions.current[scrollKey] = readerScroll.current.scrollTop; };
  const animateChange = (nextDirection: number) => { setDirection(nextDirection); setTransitionKey(key => key + 1); };
  const selectDocument = (index: number) => {
    if (index < 0 || index >= artifacts.length || index === selectedIndex) return;
    rememberScroll(); setSelectedId(artifacts[index].id); setZoom(false); animateChange(index > selectedIndex ? 1 : -1);
  };
  const selectPage = (index: number) => {
    if (index < 0 || index >= pages.length || index === pageIndex) return;
    rememberScroll(); setPagePositions(positions => ({ ...positions, [artifact.id]: index })); setZoom(false); animateChange(index > pageIndex ? 1 : -1);
  };
  const changeReaderOpen = (open: boolean) => { if (!open) rememberScroll(); setReaderOpen(open); setZoom(false); };
  const openReader = (button: HTMLButtonElement) => { opener.current = button; setReaderOpen(true); };
  const onKey = (event: KeyboardEvent, reading: boolean) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (!reading && (event.target as HTMLElement).closest('.project-deck-dialog')) return;
    if (zoom && (event.target as HTMLElement).closest('.deck-image-viewport')) return;
    event.preventDefault(); event.stopPropagation();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    if (reading) selectPage(pageIndex + delta); else selectDocument(selectedIndex + delta);
  };
  const onPointerDown = (event: PointerEvent, reading: boolean) => {
    if (event.button !== 0 || (reading && zoom)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent, reading: boolean) => {
    const start = pointerStart.current; pointerStart.current = null;
    if (!start) return;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    if (Math.abs(x) < 48 || Math.abs(x) <= Math.abs(y) * 1.5) return;
    event.preventDefault(); suppressClickUntil.current = Date.now() + 450;
    const delta = x < 0 ? 1 : -1;
    if (reading) selectPage(pageIndex + delta); else selectDocument(selectedIndex + delta);
  };
  const clickCapture = (event: React.MouseEvent) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } };
  const documentPager = (reading: boolean) => <nav className="deck-document-pager" aria-label={reading ? '阅读中的文件切换' : '资料集文件切换'}>
    <button type="button" className="deck-circle" disabled={selectedIndex === 0} onClick={() => selectDocument(selectedIndex - 1)} aria-label="上一份资料"><ChevronLeftIcon/></button>
    <div><strong>{artifact.title}</strong><span>文件 {selectedIndex + 1} / {artifacts.length}</span></div>
    <button type="button" className="deck-circle" disabled={selectedIndex === artifacts.length - 1} onClick={() => selectDocument(selectedIndex + 1)} aria-label="下一份资料"><ChevronRightIcon/></button>
  </nav>;

  return <section ref={rootRef} className="project-deck" aria-labelledby={titleId} onKeyDown={event => onKey(event, false)} onClickCapture={clickCapture}>
    <header className="deck-heading"><div><p className="deck-project-name">{collection.project} · 项目资料集</p><h2 id={titleId}>{collection.title}</h2></div>{collection.demoContent && <span className="deck-demo-label">演示资料</span>}</header>
    <p className="deck-summary">{collection.summary}</p>
    <div className="deck-counts"><span>{artifacts.length} 份资料</span><span>{totalPages} 个预览页</span></div>
    <div className="deck-stack" onPointerDown={event => onPointerDown(event, false)} onPointerUp={event => onPointerUp(event, false)} onPointerCancel={() => { pointerStart.current = null; }}>
      {artifacts.length > 2 && <div className="deck-back deck-back-far" aria-hidden="true"/>}
      {artifacts.length > 1 && <div className="deck-back deck-back-near" aria-hidden="true"/>}
      <div className={'deck-front ' + (transitionKey ? 'deck-page-change ' + (direction > 0 ? 'from-next' : 'from-previous') : '')} key={transitionKey}>
        <div className="deck-preview-clip" aria-hidden="true"><PageContent page={page} artifact={artifact}/></div>
        <div className="deck-preview-footer">预览 {pageIndex + 1} / {pages.length}<ArrowTopRightIcon/></div>
        <button type="button" className="deck-cover-button" onClick={event => openReader(event.currentTarget)} aria-label={'展开阅读' + artifact.title}/>
      </div>
    </div>
    <p className="deck-gesture-hint">左右翻资料 · 点卡片展开阅读</p>
    {documentPager(false)}
    <div className="deck-actions"><button type="button" className="deck-primary" onClick={event => openReader(event.currentTarget)}>展开阅读 <ArrowTopRightIcon/></button><button type="button" className="deck-secondary" onClick={() => setDirectoryOpen(open => !open)} aria-expanded={directoryOpen} aria-controls={directoryId}><ListBulletIcon/>目录</button></div>
    {directoryOpen && <nav className="deck-directory" id={directoryId} aria-label="资料集目录">{artifacts.map((item, index) => <button type="button" key={item.id} aria-current={item.id === artifact.id ? 'true' : undefined} onClick={() => { selectDocument(index); setDirectoryOpen(false); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.deck-cover-button')?.focus()); }}><span className="deck-directory-icon">{item.type === 'image' ? <ImageIcon/> : item.type === 'table' ? <ListBulletIcon/> : <FileTextIcon/>}</span><span><strong>{item.title}</strong><small>{formatLabels[item.type]} · {pagesFor(item).length} 个预览页</small></span><span className="deck-directory-number">{index + 1}</span></button>)}</nav>}
    <p className="deck-sr-only" aria-live="polite">{artifact.title}，文件 {selectedIndex + 1} / {artifacts.length}，预览页 {pageIndex + 1} / {pages.length}</p>
    <Dialog.Root open={readerOpen} onOpenChange={changeReaderOpen}>
      {portalContainer && <Dialog.Portal container={portalContainer}><Dialog.Overlay className="project-deck-overlay"/><Dialog.Content className="project-deck-dialog" onKeyDown={event => onKey(event, true)} onClickCapture={clickCapture} onOpenAutoFocus={() => { if (readerScroll.current) readerScroll.current.scrollTop = scrollPositions.current[scrollKey] || 0; }} onCloseAutoFocus={event => { event.preventDefault(); const target = opener.current?.isConnected ? opener.current : rootRef.current?.querySelector<HTMLButtonElement>('.deck-cover-button'); target?.focus({ preventScroll: true }); }}>
        <header className="deck-reader-header"><Dialog.Close className="deck-circle" aria-label="收起回资料集"><Cross2Icon/></Dialog.Close><div className="deck-reader-titles"><Dialog.Title>{artifact.title}</Dialog.Title><Dialog.Description>{formatLabels[artifact.type]} · 文件 {selectedIndex + 1} / {artifacts.length}{collection.demoContent ? ' · 演示' : ''}</Dialog.Description></div>{originalUrl && <a className="deck-original" href={originalUrl} target="_blank" rel="noreferrer">{driveOriginal ? 'Drive 原件' : '原始链接'}<ArrowTopRightIcon/></a>}</header>
        <div className="deck-reader-scroll" ref={readerScroll}>
          <div className={'deck-reader-paper ' + (zoom ? 'allows-image-pan ' : '') + (transitionKey ? 'deck-page-change ' + (direction > 0 ? 'from-next' : 'from-previous') : '')} key={transitionKey} onPointerDown={event => onPointerDown(event, true)} onPointerUp={event => onPointerUp(event, true)} onPointerCancel={() => { pointerStart.current = null; }}><PageContent page={page} artifact={artifact} reading zoom={zoom} onZoom={() => setZoom(value => !value)}/></div>
          <p className="deck-source-note">{artifact.sourceLabel || (collection.demoContent ? '演示内容，非已核验研究结论。' : '预览摘要，请结合原件与来源判断。')}{page.sourcePage ? ` · 原件第 ${page.sourcePage} 页` : ''}</p>
          {!originalUrl && <p className="deck-source-note">{collection.demoContent ? '演示资料未绑定 Drive 原件。' : '本条暂未提供原件链接。'}</p>}
          {onOpenArtifact && <button type="button" className="deck-detail-button" onClick={() => { changeReaderOpen(false); onOpenArtifact(artifact); }}><ReaderIcon/>{artifact.type === 'html' ? '查看隔离预览与详情' : '查看成果详情'}</button>}
        </div>
        <footer className="deck-reader-footer"><div className="deck-page-pager"><button type="button" disabled={pageIndex === 0} onClick={() => selectPage(pageIndex - 1)} aria-label="上一预览页"><ChevronLeftIcon/>上一页</button><span aria-live="polite">{page.kind === 'image' ? '图片' : '预览页'} {pageIndex + 1} / {pages.length}</span><button type="button" disabled={pageIndex === pages.length - 1} onClick={() => selectPage(pageIndex + 1)} aria-label="下一预览页">下一页<ChevronRightIcon/></button></div>{documentPager(true)}</footer>
      </Dialog.Content></Dialog.Portal>}
    </Dialog.Root>
  </section>;
}
