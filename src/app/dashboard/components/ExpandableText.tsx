'use client';

import { useState } from "react";
import { truncateText } from "../utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableTextProps {
  text: string;
}

export function ExpandableText({ text }: ExpandableTextProps) {
  const [isOpen, setIsOpen] = useState(false);
  const truncated = truncateText(text);
  const needsTruncation = text.length > truncated.length;

  if (!needsTruncation) {
    return <div className="text-sm text-gray-900">{text}</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="text-sm text-gray-900">
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:text-gray-600">
            {isOpen ? text : truncated}
            <button className="ml-2 inline-flex items-center text-blue-600 hover:text-blue-800">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  );
} 