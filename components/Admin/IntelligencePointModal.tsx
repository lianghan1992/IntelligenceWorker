import React from 'react';

interface IntelligencePointModalProps {
    onClose: () => void;
    // Add other props as needed, e.g., for editing an existing point
}

export const IntelligencePointModal: React.FC<IntelligencePointModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">添加/编辑情报点</h3>
                </div>
                <div className="p-6">
                    <p>情报点表单将在此处实现。</p>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded-lg">取消</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">保存</button>
                </div>
            </div>
        </div>
    );
};
