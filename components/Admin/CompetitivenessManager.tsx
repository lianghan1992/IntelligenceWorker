import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CompetitivenessEntity, CompetitivenessModule } from '../../types';
import { 
    getEntities, createEntity, updateEntity, deleteEntity,
    getModules, createModule, updateModule, deleteModule, createBackfillJob
} from '../../api';
import { 
    CloseIcon, PlusIcon, TrashIcon, PencilIcon, SearchIcon, RefreshIcon, 
    ChevronLeftIcon, ChevronRightIcon, BrainIcon 
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

// --- Reusable Components ---
const Spinner: React.FC<{ small?: boolean }> = ({ small }) => (
    <svg className={`animate-spin ${small ? 'h-5 w-5' : 'h-8 w-8'} text-blue-600`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TagInput: React.FC<{ value: string[]; onChange: (value: string[]) => void }> = ({ value, onChange }) => {
    const [inputValue, setInputValue] = useState('');
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!value.includes(inputValue.trim())) {
                onChange([...value, inputValue.trim()]);
            }
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };
    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {value.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-blue-500 hover:text-blue-700">
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入别名后按回车添加..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3"
            />
        </div>
    );
};

// --- Entity Manager ---
// ... (Implementation will be inside the main component)

// --- Module Manager ---
// ... (Implementation will be inside the main component)


// --- Main CompetitivenessManager Component ---
export const CompetitivenessManager: React.FC = () => {
    const [subView, setSubView] = useState<'entities' | 'modules'>('entities');

    const renderSubView = () => {
        switch (subView) {
            case 'entities': return <EntityManager />;
            case 'modules': return <div>模块管理正在开发中</div>;
            default: return <EntityManager />;
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setSubView('entities')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${subView === 'entities' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            实体管理
                        </button>
                         <button
                            onClick={() => setSubView('modules')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${subView === 'modules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            模块管理
                        </button>
                    </nav>
                </div>
            </div>
            <div className="flex-1 mt-6 overflow-hidden">
                {renderSubView()}
            </div>
        </div>
    );
};


// ===================================================================================
// 2. ENTITY MANAGER VIEW
// ===================================================================================
const EntityManager: React.FC = () => {
    // Component implementation will go here
    return <div>实体管理功能即将上线，敬请期待。</div>;
};