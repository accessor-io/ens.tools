import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Search, BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DocumentationService,
  type DocumentationEntry,
} from '../../lib/services/documentation-service';
import type { ViewType } from '../../App';

interface DocumentationViewerProps {
  currentView?: ViewType;
  initialDocId?: string;
}

export function DocumentationViewer({ currentView, initialDocId }: DocumentationViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentationEntry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [iframeKey, setIframeKey] = useState(0);

  const categories = ['All', ...DocumentationService.getAllCategories()];
  
  const allDocs = DocumentationService.searchDocumentation(searchQuery);
  const filteredDocs = selectedCategory === 'All'
    ? allDocs
    : allDocs.filter(doc => doc.category === selectedCategory);

  const viewDocs = currentView
    ? DocumentationService.getDocumentationForView(currentView)
    : [];

  useEffect(() => {
    if (initialDocId) {
      const doc = DocumentationService.getDocumentationById(initialDocId);
      if (doc) {
        setSelectedDoc(doc);
        setIframeKey(prev => prev + 1);
      }
    } else if (viewDocs.length > 0 && !selectedDoc) {
      setSelectedDoc(viewDocs[0]);
      setIframeKey(prev => prev + 1);
    }
  }, [initialDocId, viewDocs]);

  const handleDocSelect = (doc: DocumentationEntry) => {
    setSelectedDoc(doc);
    setIframeKey(prev => prev + 1);
  };

  const docPath = selectedDoc
    ? DocumentationService.getDocumentationPath(selectedDoc.file)
    : null;

  return (
    <div className="flex h-full gap-4 bg-white">
      {/* Sidebar - Documentation List */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-slate-200">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="All" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="View" className="text-xs">
                {currentView ? 'View Related' : 'All'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Documentation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentView && viewDocs.length > 0 && selectedCategory === 'View' && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Related to Current View
              </h3>
              {viewDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedDoc?.id === doc.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleDocSelect(doc)}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium leading-tight">
                        {doc.title}
                      </CardTitle>
                      {selectedDoc?.id === doc.id && (
                        <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {doc.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <Badge variant="outline" className="text-xs">
                      {doc.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {selectedCategory === 'All' ? 'All Documentation' : selectedCategory}
            </h3>
            {filteredDocs.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 text-center">
                No documentation found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocs.map((doc) => (
                  <Card
                    key={doc.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedDoc?.id === doc.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleDocSelect(doc)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium leading-tight">
                          {doc.title}
                        </CardTitle>
                        {selectedDoc?.id === doc.id && (
                          <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {doc.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <Badge variant="outline" className="text-xs">
                        {doc.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Documentation Viewer */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedDoc && docPath ? (
          <>
            {/* Header */}
            <div className="border-b border-slate-200 p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-slate-600" />
                    <h2 className="text-xl font-semibold text-slate-900">
                      {selectedDoc.title}
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {selectedDoc.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedDoc.category}</Badge>
                    {selectedDoc.keywords && selectedDoc.keywords.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {selectedDoc.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(docPath, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            </div>

            {/* Documentation Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                key={iframeKey}
                src={docPath}
                className="w-full h-full border-0"
                title={selectedDoc.title}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Select Documentation
              </h3>
              <p className="text-sm text-slate-600">
                Choose a documentation entry from the sidebar to view its contents
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
