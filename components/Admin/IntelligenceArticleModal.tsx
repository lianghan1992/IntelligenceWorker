
import React from 'react';
import { InfoItem } from '../../types';
import { CloseIcon } from '../icons';

interface IntelligenceArticleModalProps {
  article: InfoItem;
  onClose: () => void;
}

const formatContent = (content: string) => {
    return content.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>);
};

export const IntelligenceArticleModal: React.FC<IntelligenceArticleModalProps> = ({ article, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
        <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
          <div className="overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">{article.title}</h3>
            <p className="text-sm text-gray-500">{article.source_name} / {article.point_name} - {new Date(article.publish_date || article.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 prose max-w-none">
          {formatContent(article.content)}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end rounded-b-2xl">
          <a href={article.original_url} target="_blank" rel="noopener noreferrer" className="py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
            查看原文
          </a>
        </div>
      </div>
    </div>
  );
};
