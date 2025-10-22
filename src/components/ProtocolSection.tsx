import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { LucideIcon } from 'lucide-react';

interface Fuse {
  name: string;
  description: string;
}

interface Feature {
  name: string;
  description: string;
  config: string;
  fuses?: Fuse[];
}

interface ProtocolSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: Feature[];
  searchQuery: string;
}

export function ProtocolSection({ icon: Icon, title, description, features, searchQuery }: ProtocolSectionProps) {
  const filteredFeatures = features.filter(feature => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      feature.name.toLowerCase().includes(query) ||
      feature.description.toLowerCase().includes(query) ||
      feature.config.toLowerCase().includes(query)
    );
  });

  if (filteredFeatures.length === 0 && searchQuery) return null;

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-2">
          {filteredFeatures.map((feature, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span>{feature.name}</span>
                  {feature.fuses && (
                    <Badge variant="secondary" className="ml-2">
                      {feature.fuses.length} Fuses
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <p className="text-slate-700 mb-3">{feature.description}</p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-slate-600">{feature.config}</p>
                  </div>
                </div>
                
                {feature.fuses && (
                  <div className="mt-4 space-y-3">
                    <p className="text-slate-700">Available Fuses:</p>
                    <div className="space-y-2">
                      {feature.fuses.map((fuse, fuseIndex) => (
                        <div key={fuseIndex} className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-800 shrink-0">
                              {fuse.name}
                            </Badge>
                            <p className="text-slate-600">{fuse.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
