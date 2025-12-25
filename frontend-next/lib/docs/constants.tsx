import { NavGroup } from './types';

export const DOCS_STRUCTURE: NavGroup[] = [
    {
        title: "Overview",
        items: [
            { id: "introduction", label: "Introduction" },
        ]
    },
    {
        title: "Technical",
        items: [
            { id: "core", label: "Core Concepts" },
            { id: "architecture", label: "Architecture" },
            { id: "workflow", label: "Workflow" },
            { id: "security", label: "Security" },
            { id: "privacy", label: "Privacy Implementation" },
            { id: "testing", label: "Testing & Reliability" },
            { id: "notifications", label: "Email Notifications" },
            { id: "api", label: "API Reference" },
        ]
    },
    {
        title: "Quick Start",
        items: [
            { id: "installation", label: "Installation" },
            { id: "placing-bids", label: "How to Place a Bid" },
        ]
    }
];

export const Icons = {
    Lock: () => (
        <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth={ 2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
  ),
Code: () => (
    <svg className= "w-5 h-5" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
  ),
Shield: () => (
    <svg className= "w-5 h-5" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
  ),
Copy: () => (
    <svg className= "w-4 h-4" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
  ),
CheckCircle: () => (
    <svg className= "w-5 h-5" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
  ),
EyeOff: () => (
    <svg className= "w-5 h-5" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
  ),
Mail: () => (
    <svg className= "w-5 h-5" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
  )
};
