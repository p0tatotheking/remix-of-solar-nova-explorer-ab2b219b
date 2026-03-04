import React, { useState } from 'react';
import { Settings, Search, Shield, Server } from 'lucide-react';
import { useProxy, SearchEngine } from '@/contexts/ProxyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getHolyUnblockerUrl, setHolyUnblockerUrl, HOLY_UNBLOCKER_BASE } from '@/lib/proxyConfig';

const searchEngines: { id: SearchEngine; name: string; description: string }[] = [
  { id: 'google', name: 'Google', description: 'The most popular search engine' },
  { id: 'bing', name: 'Bing', description: 'Microsoft\'s search engine' },
  { id: 'duckduckgo', name: 'DuckDuckGo', description: 'Privacy-focused search engine' },
];

export function ProxySettings() {
  const { searchEngine, setSearchEngine } = useProxy();
  const [proxyUrl, setProxyUrl] = useState(getHolyUnblockerUrl());
  const [saved, setSaved] = useState(false);

  const handleSaveProxyUrl = () => {
    setHolyUnblockerUrl(proxyUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setProxyUrl(HOLY_UNBLOCKER_BASE);
    setHolyUnblockerUrl(HOLY_UNBLOCKER_BASE);
    localStorage.removeItem('holy-unblocker-url');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-full p-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Proxy Settings</h1>
            <p className="text-muted-foreground">Configure your browsing experience</p>
          </div>
        </div>

        {/* Holy Unblocker Backend URL */}
        <Card className="bg-background/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Proxy Backend URL
            </CardTitle>
            <CardDescription>
              The URL where your Holy Unblocker instance is running. Default is <code>/holy/</code> (same server).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="/holy/"
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveProxyUrl} size="sm">
                {saved ? '✓ Saved' : 'Save'}
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm">
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Engine */}
        <Card className="bg-background/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Default Search Engine
            </CardTitle>
            <CardDescription>
              Choose which search engine to use when searching from the address bar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={searchEngine}
              onValueChange={(value) => setSearchEngine(value as SearchEngine)}
              className="space-y-3"
            >
              {searchEngines.map((engine) => (
                <div
                  key={engine.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    searchEngine === engine.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <RadioGroupItem value={engine.id} id={engine.id} />
                  <Label htmlFor={engine.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{engine.name}</div>
                    <div className="text-sm text-muted-foreground">{engine.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Privacy & Security Info */}
        <Card className="bg-background/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Powered by Holy Unblocker (Ultraviolet proxy)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
              <div>
                <div className="font-medium">Full Website Support</div>
                <div className="text-muted-foreground">
                  Uses service workers to proxy all requests — supports YouTube, Discord, Google, and more
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
              <div>
                <div className="font-medium">Session Privacy</div>
                <div className="text-muted-foreground">
                  Browsing data stays in your browser session and is not logged server-side
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
              <div>
                <div className="font-medium">Self-Hosted</div>
                <div className="text-muted-foreground">
                  The proxy backend runs on the same server as SolarNova for maximum speed
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500" />
              <div>
                <div className="font-medium">Self-Hosted</div>
                <div className="text-muted-foreground">
                  The proxy backend runs on the same server as SolarNova for maximum speed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
