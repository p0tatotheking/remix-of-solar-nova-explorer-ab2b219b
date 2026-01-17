import React from 'react';
import { Settings, Search, Shield, Info } from 'lucide-react';
import { useProxy, SearchEngine } from '@/contexts/ProxyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const searchEngines: { id: SearchEngine; name: string; description: string }[] = [
  { id: 'google', name: 'Google', description: 'The most popular search engine' },
  { id: 'bing', name: 'Bing', description: 'Microsoft\'s search engine' },
  { id: 'duckduckgo', name: 'DuckDuckGo', description: 'Privacy-focused search engine' },
];

export function ProxySettings() {
  const { searchEngine, setSearchEngine } = useProxy();

  return (
    <div className="min-h-full p-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Proxy Settings</h1>
            <p className="text-muted-foreground">Configure your browsing experience</p>
          </div>
        </div>

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
              Privacy & Security
            </CardTitle>
            <CardDescription>
              How the proxy keeps you safe while browsing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500" />
              <div>
                <div className="font-medium">Content Sanitization</div>
                <div className="text-muted-foreground">
                  All fetched content is sanitized to remove potentially harmful scripts
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500" />
              <div>
                <div className="font-medium">No Data Storage</div>
                <div className="text-muted-foreground">
                  Your browsing history is only stored in your current session and not saved to any server
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500" />
              <div>
                <div className="font-medium">Rate Limiting</div>
                <div className="text-muted-foreground">
                  Request rate limiting helps prevent abuse and ensures fair usage
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limitations */}
        <Card className="bg-background/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Known Limitations
            </CardTitle>
            <CardDescription>
              Some things the proxy cannot do
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• Some websites may block proxy requests or require JavaScript execution</p>
            <p>• Video streaming sites (Netflix, Hulu, etc.) won't work due to DRM</p>
            <p>• Login sessions and cookies are not preserved between tabs</p>
            <p>• Complex single-page applications may have limited functionality</p>
            <p>• Downloads and file handling are not supported</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
