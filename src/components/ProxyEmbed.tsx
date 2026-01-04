import { GameOverlayBar } from './GameOverlayBar';

interface ProxyEmbedProps {
  onClose: () => void;
}

export function ProxyEmbed({ onClose }: ProxyEmbedProps) {
  const proxyUrl = 'https://pgqlruiivbpsqxikagdn.supabase.co/functions/v1/web-proxy?path=/browsing';

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <iframe
        src={proxyUrl}
        title="Proxy"
        className="w-full h-full border-0"
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
      <GameOverlayBar onClose={onClose} />
    </div>
  );
}
