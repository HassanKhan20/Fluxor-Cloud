import React from 'react';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => {
    return (
        <div
            className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-[#005CFF]/20 
                 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer
                 opacity-0 animate-[fadeInUp_0.6s_ease_forwards]"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6
                      group-hover:bg-[#005CFF] group-hover:scale-110 transition-all duration-300">
                <div className="text-[#005CFF] group-hover:text-white transition-colors duration-300">
                    {icon}
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#005CFF] transition-colors duration-300">
                {title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
                {description}
            </p>
        </div>
    );
};

export default FeatureCard;
