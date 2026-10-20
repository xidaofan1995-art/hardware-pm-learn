import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type TextareaHTMLAttributes,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';

/** Native scrolling and native keyboards; this layer never draws device chrome. */
export function MobileScroll({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={['pwa-scroll', className].filter(Boolean).join(' ')}
      style={{ overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', minHeight: 0 }}
    >
      {children}
    </div>
  );
}

export function Carousel({ ariaLabel, className, contentClassName, children }: PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
}>) {
  return (
    <div
      className={['pwa-carousel', className].filter(Boolean).join(' ')}
      role="region"
      aria-label={ariaLabel || '横向列表'}
      tabIndex={0}
      style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', overscrollBehaviorX: 'contain' }}
    >
      <div className={contentClassName} style={{ display: 'flex', width: 'max-content', minWidth: '100%' }}>{children}</div>
    </div>
  );
}

export const KeyboardInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function KeyboardInput(props, ref) {
    return <input {...props} ref={ref} />;
  },
);

export const KeyboardTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function KeyboardTextarea(props, ref) {
    return <textarea {...props} ref={ref} />;
  },
);

function dismissNativeKeyboard() {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable)) {
    active.blur();
  }
}

export function useKeyboard() {
  const hide = useCallback(() => dismissNativeKeyboard(), []);
  return useMemo(() => ({ hide }), [hide]);
}

/**
 * iOS keeps the layout viewport while moving/shrinking its visual viewport.
 * Android browsers that already resize the layout naturally report zero inset.
 * Browser toolbar changes and pinch zoom must not be treated as keyboards.
 */
export function useKeyboardInsets(): { bottomInset: number } {
  const [bottomInset, setBottomInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable);
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setBottomInset(editing && Math.abs(viewport.scale - 1) < 0.05 && inset > 100 ? Math.round(inset) : 0);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return { bottomInset };
}

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  snap?: number;
}>;

const sheetStyles = `
.pwa-sheet-overlay{position:fixed;inset:0;z-index:1000;background:rgba(30,48,62,.36);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);animation:pwa-overlay-in .15s ease-out}
.pwa-sheet-content{position:fixed;z-index:1001;left:0;right:0;bottom:var(--pwa-keyboard-inset,0px);display:flex;flex-direction:column;width:100%;height:var(--pwa-sheet-snap,80dvh);max-height:min(90dvh,calc(100dvh - var(--pwa-keyboard-inset,0px) - 12px));margin:0;background:#fafcfd;color:#243744;border:1px solid rgba(255,255,255,.8);border-radius:26px 26px 0 0;box-shadow:0 -10px 60px #16364e20;outline:none;font:15px/1.5 CanvasUI,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:pwa-sheet-in .18s ease-out}
.pwa-sheet-content,.pwa-sheet-content *{box-sizing:border-box}
.pwa-sheet-content button,.pwa-sheet-content input,.pwa-sheet-content select,.pwa-sheet-content textarea{font:inherit}
.pwa-sheet-content button{border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pwa-sheet-content button:focus-visible,.pwa-sheet-content input:focus-visible,.pwa-sheet-content textarea:focus-visible,.pwa-sheet-content select:focus-visible,.pwa-sheet-content a:focus-visible{outline:2px solid #366b9f;outline-offset:3px}
.pwa-sheet-content svg{width:20px;height:20px;flex-shrink:0}
.pwa-sheet-header{position:relative;flex-shrink:0;padding:27px 28px 18px;padding-right:64px}
.pwa-sheet-title{font-size:20px;font-weight:500;line-height:1.4;letter-spacing:-.4px;margin:0 0 8px}
.pwa-sheet-description{font-size:12px;line-height:1.7;color:#7c919f;margin:0}
.pwa-sheet-close{position:absolute;top:22px;right:22px;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#eaf0f4;color:#647e90}
.pwa-sheet-body{min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 22px max(22px,env(safe-area-inset-bottom));flex:1}
.pwa-sheet-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes pwa-overlay-in{from{opacity:0}to{opacity:1}}
@keyframes pwa-sheet-in{from{opacity:0;translate:0 18px}to{opacity:1;translate:0 0}}
@media(min-width:700px){.pwa-sheet-content{left:50%;right:auto;top:50%;bottom:auto;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 48px));border-radius:26px;height:auto;max-height:90dvh}.pwa-sheet-body{flex:0 1 auto}}
@media(prefers-reduced-motion:reduce){.pwa-sheet-overlay,.pwa-sheet-content{animation:none}}
`;

export function BottomSheet({ open, onOpenChange, title, description, snap = 0.8, children }: BottomSheetProps) {
  const { bottomInset } = useKeyboardInsets();
  const handleOpenChange = (next: boolean) => {
    dismissNativeKeyboard();
    onOpenChange(next);
  };
  const snapValue = Math.round(Math.max(0.3, Math.min(0.9, Number.isFinite(snap) ? snap : 0.8)) * 100);
  const variables = {
    '--pwa-keyboard-inset': `${bottomInset}px`,
    '--pwa-sheet-snap': `${snapValue}dvh`,
  } as CSSProperties;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <style>{sheetStyles}</style>
        <Dialog.Overlay className="pwa-sheet-overlay" />
        <Dialog.Content className="pwa-sheet-content" style={variables}>
          <header className="pwa-sheet-header">
            <Dialog.Title className="pwa-sheet-title">{title}</Dialog.Title>
            <Dialog.Description className={description ? 'pwa-sheet-description' : 'pwa-sheet-sr-only'}>
              {description || '查看或编辑内容。按 Escape 或点击遮罩可关闭。'}
            </Dialog.Description>
            <Dialog.Close className="pwa-sheet-close" aria-label="关闭">
              <Cross2Icon />
            </Dialog.Close>
          </header>
          <div className="pwa-sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
