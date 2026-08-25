import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

const CONTAINER_ID = 'container-9dc43cb8d09066d1d7053919bd224497';
const INVOKE_SRC =
  'https://pl31023592.profitableratecpmnetwork.com/9dc43cb8d09066d1d7053919bd224497/invoke.js';

export function NativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!document.querySelector(`script[src="${INVOKE_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = INVOKE_SRC;
      script.async = true;
      script.dataset.cfasync = 'false';
      document.body.appendChild(script);
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      setFilled(container.childElementCount > 0 || container.innerHTML.length > 0);
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden w-full',
        !filled && 'hidden'
      )}
    >
      <div id={CONTAINER_ID} ref={containerRef} />
    </div>
  );
}
