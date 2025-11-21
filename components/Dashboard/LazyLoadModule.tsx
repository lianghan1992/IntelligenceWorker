
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { RssIcon, VideoCameraIcon } from '../icons';

// --- Reusable Intersection Observer Hook ---
const useIntersectionObserver = (
    options: IntersectionObserverInit = { root: null, rootMargin: '0px', threshold: 0.1 }
): [React.RefObject<HTMLDivElement>, boolean] => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsIntersecting(true);
                observer.disconnect(); // Disconnect after intersecting once
            }
        }, options);

        const currentRef = containerRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [options]);

    return [containerRef, isIntersecting];
};

// --- Lazy Load Wrapper Component ---
interface LazyLoadModuleProps {
    children: ReactNode;
    placeholder: ReactNode;
}

export const LazyLoadModule: React.FC<LazyLoadModuleProps> = ({ children, placeholder }) => {
    const [ref, isIntersecting] = useIntersectionObserver({
        rootMargin: '200px 0px', // Start loading when the module is 200px away from the viewport
        threshold: 0.01
    });

    return (
        <div ref={ref}>
            {isIntersecting ? children : placeholder}
        </div>
    );
};


// --- Skeleton Components ---

export const TodaysEventsSkeleton: React.FC = () => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <VideoCameraIcon className="w-6 h-6 text-indigo-500" />
                今日事件
            </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-[4/3] w-full bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
        </div>
    </div>
);

export const FocusPointsSkeleton: React.FC = () => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">我的关注点</h2>
        </div>
        {/* Masonry Skeleton */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4">
            <div className="bg-white rounded-xl border p-4 h-48 animate-pulse break-inside-avoid">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                </div>
            </div>
            <div className="bg-white rounded-xl border p-4 h-32 animate-pulse break-inside-avoid">
                <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                </div>
            </div>
             <div className="bg-white rounded-xl border p-4 h-56 animate-pulse break-inside-avoid">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    </div>
);


export const SubscriptionManagerSkeleton: React.FC = () => (
    <div className="border-t border-gray-200 pt-8 mt-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <RssIcon className="w-5 h-5 text-blue-600" />
                情报源订阅
            </h2>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-40 h-32 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
        </div>
    </div>
);
