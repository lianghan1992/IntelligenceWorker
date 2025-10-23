import React, { useState, useEffect, useRef, ReactNode } from 'react';
// FIX: Removed unused 'FireIcon' import which was causing an error.
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
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border p-5">
                <div className="flex justify-between items-center">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="mt-4 space-y-3">
                    <div className="h-5 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>
        </div>
    </div>
);


export const SubscriptionManagerSkeleton: React.FC = () => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <RssIcon className="w-6 h-6 text-blue-600" />
                情报源订阅
            </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-2xl h-36 animate-pulse"></div>
            ))}
        </div>
    </div>
);