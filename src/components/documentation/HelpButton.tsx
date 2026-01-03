import { HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';
import type { ViewType } from '../../App';
import { DocumentationService } from '../../lib/services/documentation-service';

interface HelpButtonProps {
  view?: ViewType;
  docId?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function HelpButton({ 
  view, 
  docId, 
  className,
  variant = 'ghost',
  size = 'icon',
}: HelpButtonProps) {
  const handleClick = () => {
    const docs = docId
      ? [DocumentationService.getDocumentationById(docId)]
      : view
      ? DocumentationService.getDocumentationForView(view)
      : [];

    const doc = docs.find(d => d !== undefined);
    if (doc) {
      const path = DocumentationService.getDocumentationPath(doc.file);
      window.open(path, '_blank');
    }
  };

  const docs = docId
    ? [DocumentationService.getDocumentationById(docId)]
    : view
    ? DocumentationService.getDocumentationForView(view)
    : [];

  const hasDocs = docs.some(d => d !== undefined);
  const tooltipText = docId
    ? 'View documentation'
    : view && docs.length > 0
    ? `View ${docs.length} related documentation${docs.length > 1 ? 's' : ''}`
    : 'No documentation available';

  if (!hasDocs && !docId) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          className={className}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
