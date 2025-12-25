export interface NavItem {
    id: string;
    label: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface SectionProps {
    id: string;
    title: string;
    category?: string;
    children: React.ReactNode;
}
