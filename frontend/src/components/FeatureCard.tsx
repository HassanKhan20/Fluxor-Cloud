import React from 'react';
import { Link } from 'react-router-dom';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay?: number;
    href?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, href }) => {
    const cardContent = (
        <div className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300">
                <div className="text-blue-600 group-hover:text-white transition-colors duration-300">
                    {icon}
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                {title}
            </h3>
            <p className="text-gray-600" style={{ lineHeight: '1.7' }}>
                {description}
            </p>
        </div>
    );

    if (href) {
        return (
            <Link to={href} onClick={() => window.scrollTo(0, 0)}>
                {cardContent}
            </Link>
        );
    }

    return cardContent;
};

export default FeatureCard;
