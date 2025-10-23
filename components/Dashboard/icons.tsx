import React from 'react';

// A generic icon component to avoid repeating props
const Icon: React.FC<React.SVGProps<SVGSVGElement>> = ({ children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    {children}
  </svg>
);

export const FireIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.316 3.051a1.5 1.5 0 01.063 2.122l-2.022 2.871c.216.096.42.22.607.368l2.73-3.896a1.5 1.5 0 012.122-.063l.995.995a1.5 1.5 0 01-.063 2.122l-2.09 2.982c.45.32.793.728 1.056 1.188l2.982-2.09a1.5 1.5 0 012.122.063l.995.995a1.5 1.5 0 01-.063 2.122l-2.73 3.896c-.34.484-.77.91-1.248 1.272l2.09 2.982a1.5 1.5 0 01-.063 2.122l-.995.995a1.5 1.5 0 01-2.122-.063l-2.982-2.09c-.484.34-.99.61-1.52.77l-1.074 2.242a1.5 1.5 0 01-2.83 0l-1.074-2.242c-.53-.16-1.036-.43-1.52-.77l-2.982 2.09a1.5 1.5 0 01-2.122-.063l-.995-.995a1.5 1.5 0 01.063-2.122l2.09-2.982a6.47 6.47 0 01-1.056-1.188l-2.982 2.09a1.5 1.5 0 01-2.122-.063l-.995-.995a1.5 1.5 0 01.063-2.122l2.73-3.896a6.47 6.47 0 011.248-1.272L3.05 5.234a1.5 1.5 0 01.063-2.122l.995-.995a1.5 1.5 0 012.122.063l2.022 2.871c.28-.148.574-.268.88-.354l.94-1.978a1.5 1.5 0 012.83 0l.94 1.978c.306.086.6.206.88.354l2.022-2.871a1.5 1.5 0 012.122-.063l.995.995z" clipRule="evenodd" />
    </Icon>
);

export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props} >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25m10.5-2.25v2.25M3.75 11.25h16.5M3.75 6.75A2.25 2.25 0 016 4.5h12A2.25 2.25 0 0120.25 6.75v9.75A2.25 2.25 0 0118 18.75H6A2.25 2.25 0 013.75 16.5V6.75z" />
    </Icon>
);

export const BookmarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <Icon {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </Icon>
);
