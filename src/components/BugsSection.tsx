import { AlertCircle, XCircle } from 'lucide-react';

interface BugItem {
  title: string;
  status: 'down' | 'issue';
}

interface BugCategory {
  category: string;
  items: BugItem[];
}

export function BugsSection() {
  const bugs: BugCategory[] = [
    {
      category: 'FNF',
      items: [
        { title: 'Week 2', status: 'down' },
        { title: 'Week End 1', status: 'down' },
        { title: 'Long Loading Times', status: 'issue' },
      ],
    },
    {
      category: 'Games',
      items: [
        { title: 'Proxy', status: 'down' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
          Known Issues
        </h2>
        <p className="text-muted-foreground text-lg">
          Current system status and known problems
        </p>
      </div>

      <div className="grid gap-6">
        {bugs.map((category) => (
          <div
            key={category.category}
            className="bg-gradient-card border border-border/30 rounded-xl p-6"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-primary" />
              {category.category}
            </h3>

            <div className="space-y-3">
              {category.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-background/30 rounded-lg px-4 py-3 border border-border/20"
                >
                  <span className="text-foreground/80 font-medium">{item.title}</span>
                  <span
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      item.status === 'down'
                        ? 'bg-destructive/20 text-destructive border border-destructive/50'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                    }`}
                  >
                    {item.status === 'down' ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Down
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Issue
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-gradient-to-br from-destructive/10 to-background border border-destructive/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-destructive mb-3">
            All items requiring proxy are currently down
          </h3>
          <p className="text-muted-foreground">
            Games and features that depend on the proxy service are temporarily unavailable.
            We're working on resolving this issue.
          </p>
        </div>
      </div>
    </div>
  );
}
