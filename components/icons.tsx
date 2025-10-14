import React from 'react';

const createIcon = (path: React.ReactNode) => (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        {path}
    </svg>
);

export const SearchIcon = createIcon(
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
);

export const BellIcon = createIcon(
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 16a2 2 0 100-4 2 2 0 000 4z" />
);

export const ChevronDownIcon = createIcon(
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
);

export const ChevronRightIcon = createIcon(
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
);

export const MenuIcon = createIcon(
    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
);

export const FeedIcon = createIcon(
    <path d="M3.75 3A1.75 1.75 0 002 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25V4.75A1.75 1.75 0 0016.25 3H3.75zM3.5 4.75a.25.25 0 01.25-.25h5.5a.25.25 0 01.25.25v10.5a.25.25 0 01-.25.25h-5.5a.25.25 0 01-.25-.25V4.75zM11 5.5a.5.5 0 000 1h5a.5.5 0 000-1h-5zm0 3a.5.5 0 000 1h5a.5.5 0 000-1h-5zm0 3a.5.5 0 000 1h5a.5.5 0 000-1h-5z" />
);

export const DiveIcon = createIcon(
    <path fillRule="evenodd" d="M3.21 4.21a.75.75 0 01.02 1.06l-1.5 1.93A.75.75 0 01.66 6.34l1.5-1.93a.75.75 0 011.05-.19zM6.5 4a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V4.75A.75.75 0 016.5 4zm3.5 0a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V4.75A.75.75 0 0110 4zm3.5 0a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V4.75A.75.75 0 0113.5 4zm-11 6a.75.75 0 000 1.5h15a.75.75 0 000-1.5h-15zM2.5 14a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H3.25a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H3.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
);

export const ChartIcon = createIcon(
    <path d="M15 13.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-3zM8 6.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v10a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-10zM2 9.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-7z" />
);

export const SparklesIcon = createIcon(
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
);

export const PlusIcon = createIcon(
    <path fillRule="evenodd" d="M10 5.5a.5.5 0 01.5.5v4h4a.5.5 0 010 1h-4v4a.5.5 0 01-1 0v-4h-4a.5.5 0 010-1h4v-4a.5.5 0 01.5-.5z" clipRule="evenodd" />
);

export const HomeIcon = createIcon(
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
);

export const LogoIcon = createIcon(
    <path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1.5a4.5 4.5 0 0 0-4.5 4.5a.75.75 0 0 0 1.5 0A3 3 0 0 1 7 12a3 3 0 0 1 3 3a.75.75 0 0 0 1.5 0A4.5 4.5 0 0 0 7 10.5zm9-1.5a.75.75 0 0 1-1.5 0a3 3 0 0 0-3-3a.75.75 0 0 1 0-1.5a4.5 4.5 0 0 1 4.5 4.5z" />
);

export const GearIcon = createIcon(
    <path fillRule="evenodd" d="M11.49 3.17a.75.75 0 01.75.75v1.25a.75.75 0 01-1.5 0V4.34a6.5 6.5 0 00-6.32 8.44l-1.3-1.3a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 0l1.3 1.3A6.5 6.5 0 0011.49 3.17zM8.51 16.83a.75.75 0 01-.75-.75V14.8a.75.75 0 011.5 0v1.23a6.5 6.5 0 006.32-8.44l1.3 1.3a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 01-1.06 0l-1.3-1.3a6.5 6.5 0 00-6.32 8.44z" clipRule="evenodd" />
);

export const CloseIcon = createIcon(
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
);

export const CheckIcon = createIcon(
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
);

export const ArrowLeftIcon = createIcon(
    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H16a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
);

export const ArrowRightIcon = createIcon(
    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H4a1 1 0 110-2h8.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
);


export const DocumentTextIcon = createIcon(
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 1h8a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1zm1 3a.5.5 0 000 1h6a.5.5 0 000-1H7zm0 3a.5.5 0 000 1h6a.5.5 0 000-1H7zm0 3a.5.5 0 000 1h4a.5.5 0 000-1H7z" clipRule="evenodd" />
);

export const BookmarkIcon = createIcon(
    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12l-5-2.5L5 16V4z" />
);

export const RssIcon = createIcon(
    <path d="M3.5 4.5a.5.5 0 01.5-.5h12a.5.5 0 010 1H4a.5.5 0 01-.5-.5zM3.5 8.5a.5.5 0 01.5-.5h9a.5.5 0 010 1H4a.5.5 0 01-.5-.5zM3.5 12.5a.5.5 0 01.5-.5h6a.5.5 0 010 1H4a.5.5 0 01-.5-.5zM3 15.75A2.75 2.75 0 103 10.25a2.75 2.75 0 000 5.5z" />
);

export const TrendingUpIcon = createIcon(
    <path d="M14.5 4.5L12 7l-2.5-2.5L5 9V6.5a.5.5 0 011 0V10a.5.5 0 01-.5.5H2a.5.5 0 010-1h2.5L9 5l2.5 2.5L15 4h-2.5a.5.5 0 010-1H16a.5.5 0 01.5.5v3.5a.5.5 0 01-1 0V4.5z" />
);

export const VideoCameraIcon = createIcon(
    <path fillRule="evenodd" d="M1.5 5.25A2.25 2.25 0 013.75 3h6.5a2.25 2.25 0 012.25 2.25v2.818l4.159-2.08A1.5 1.5 0 0118 7.332v5.336a1.5 1.5 0 01-1.341 1.444l-4.159-2.079V14.75A2.25 2.25 0 0110.25 17h-6.5A2.25 2.25 0 011.5 14.75v-9.5z" clipRule="evenodd" />
);

export const DownloadIcon = createIcon(
    <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v8.586l1.96-1.97a.75.75 0 111.06 1.06l-3.24 3.25a.75.75 0 01-1.06 0L6.22 10.4a.75.75 0 111.06-1.06l1.97 1.97V2.75A.75.75 0 0110 2zM3.5 14.5a.5.5 0 000 1h13a.5.5 0 000-1h-13z" clipRule="evenodd" />
);

export const TagIcon = createIcon(
    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v5.528c0 .448.193.86.518 1.15l7.106 6.19a1.5 1.5 0 002.166-.205l4.318-5.216a1.5 1.5 0 00.205-2.166l-6.19-7.106A1.5 1.5 0 0010.028 2H4.5zM6.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
);

export const PlayIcon = createIcon(
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
);

export const StopIcon = createIcon(
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
);

export const TrashIcon = createIcon(
    <path fillRule="evenodd" d="M9 2a1 1 0 00-1 1H6a1 1 0 000 2h8a1 1 0 100-2h-2a1 1 0 00-1-1H9zM3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM5 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" />
);

export const LightBulbIcon = createIcon(
    <path fillRule="evenodd" d="M10 2a7 7 0 00-7 7c0 1.956.84 3.738 2.183 5.034.22.213.433.43.636.654.21.232.41.473.593.722.18.245.344.5.485.758a.5.5 0 00.938 0c.14-.258.304-.513.485-.758.183-.25.383-.49.593-.722.203-.224.416-.44.636-.654A6.974 6.974 0 0017 9a7 7 0 00-7-7zM8.5 17.5a1.5 1.5 0 003 0h-3z" clipRule="evenodd" />
);

// 修复：将两个 <path> 元素包裹在一个 React Fragment 中，以作为单个参数传递给 createIcon。
export const EyeIcon = createIcon(
    <>
        <path fillRule="evenodd" d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.18l.88-1.464a1.65 1.65 0 011.696-.882l1.32.221a1.65 1.65 0 011.12 1.12l.221 1.32c.16.956.033 1.956-.363 2.791l-1.055.772a.825.825 0 01-1.228-.217l-.028-.046a.825.825 0 01.217-1.228l1.055-.772a.825.825 0 00.182-1.396l-.22-1.32a.825.825 0 00-.56-.56l-1.32-.22a.825.825 0 00-.848.441l-.88 1.464a.825.825 0 01-1.476.59l-.028-.046a.825.825 0 01.59-1.476l.028.046zM19.336 9.41a1.651 1.651 0 010 1.18l-.88 1.464a1.65 1.65 0 01-1.696.882l-1.32-.221a1.65 1.65 0 01-1.12-1.12l-.221-1.32a1.65 1.65 0 01.363-2.791l1.055-.772a.825.825 0 011.228.217l.028.046a.825.825 0 01-.217 1.228l-1.055.772a.825.825 0 00-.182 1.396l.22 1.32a.825.825 0 00.56.56l1.32.22a.825.825 0 00.848-.441l.88-1.464a.825.825 0 011.476-.59l.028.046a.825.825 0 01-.59 1.476l-.028-.046z" clipRule="evenodd" />
    </>
);

export const UsersIcon = createIcon(
    <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM1.994 14.996a.75.75 0 01.75-.75h8.512a.75.75 0 010 1.5H2.744a.75.75 0 01-.75-.75zM12.25 14.25a2.75 2.75 0 100 5.5 2.75 2.75 0 000-5.5z" />
);

export const PencilIcon = createIcon(
    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
);

export const ClusterIcon = createIcon(
    <>
        <path d="M3.75 3A1.75 1.75 0 002 4.75v.5A1.75 1.75 0 003.75 7h12.5A1.75 1.75 0 0018 5.25v-.5A1.75 1.75 0 0016.25 3H3.75z" opacity="0.4" />
        <path d="M3.75 9A1.75 1.75 0 002 10.75v.5A1.75 1.75 0 003.75 13h12.5a1.75 1.75 0 001.75-1.75v-.5A1.75 1.75 0 0016.25 9H3.75z" opacity="0.6" />
        <path d="M3.75 15A1.75 1.75 0 002 16.75v.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 17.25v-.5A1.75 1.75 0 0016.25 15H3.75z" />
    </>
);

export const BrainIcon = createIcon(
    <path fillRule="evenodd" d="M7.75 3.5a.75.75 0 00-1.5 0V4c-1.354 0-2.58.5-3.5 1.373A.75.75 0 103.817 6.43a3.001 3.001 0 013.933.002.75.75 0 101.066-1.066A4.501 4.501 0 002.5 4.253V3.5a2.25 2.25 0 014.5 0v.161c.42.062.83.161 1.226.294a.75.75 0 00.548-1.408A6.035 6.035 0 007.75 2V1.25a.75.75 0 00-1.5 0V2a6.002 6.002 0 00-4.5 5.25v.758c0 .248-.024.492-.07.73a.75.75 0 001.48.283c.038-.19.06-.385.06-.584v-.735A4.5 4.5 0 016.25 3.5v.5a.75.75 0 001.5 0V3.5zm4.5 0a.75.75 0 00-1.5 0v.253a4.5 4.5 0 00-6.316 5.215.75.75 0 001.066 1.066 3 3 0 014.184-3.51V8a.75.75 0 001.5 0V6.916a3 3 0 011.832 3.82.75.75 0 101.408.548A4.5 4.5 0 0013.25 6V3.5zM12.5 11a.75.75 0 01.75.75v.735c0 .199.022.394.06.584a.75.75 0 001.48-.283c-.046-.238-.07-.482-.07-.73v-.758A6.002 6.002 0 0011 2.75v-.5a.75.75 0 00-1.5 0v.5A4.501 4.501 0 0116.067 8.18a.75.75 0 10-1.066-1.066 3 3 0 00-3.934-.002.75.75 0 10-1.067 1.066c1.233-1.234 3.104-1.488 4.717-.772V8a.75.75 0 00-1.5 0v.092a6.035 6.035 0 00-1.024-1.54.75.75 0 00-1.048 1.074c.396.495.73.953 1 .953v.5a.75.75 0 001.5 0v-.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
);

export const SentimentHappyIcon = createIcon(
    <>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-5 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
    </>
);

export const SentimentNeutralIcon = createIcon(
    <>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-5 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
    </>
);

export const SentimentSadIcon = createIcon(
    <>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zM12.707 13.707a1 1 0 01-1.414 0L10 12.293l-1.293 1.414a1 1 0 01-1.414-1.414l2-2a1 1 0 011.414 0l2 2a1 1 0 010 1.414z" clipRule="evenodd" />
    </>
);