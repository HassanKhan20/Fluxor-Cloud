import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize2 } from 'lucide-react';

const Demo: React.FC = () => {
    const openFullscreen = () => {
        const iframe = document.getElementById('demo-frame') as HTMLIFrameElement | null;
        if (iframe?.requestFullscreen) iframe.requestFullscreen();
    };

    return (
        <div className="min-h-screen bg-[#04060B] text-white flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f172a]/60 backdrop-blur-xl">
                <Link to="/" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <ArrowLeft size={18} />
                    Back to Fluxor Cloud
                </Link>
                <div className="text-sm tracking-[0.25em] text-blue-400 font-medium uppercase">Product Demo</div>
                <button
                    onClick={openFullscreen}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                    <Maximize2 size={16} />
                    Fullscreen
                </button>
            </div>

            <div className="flex-1 relative">
                <iframe
                    id="demo-frame"
                    src="/fluxor_demo.html"
                    title="Fluxor Cloud Product Demo"
                    className="absolute inset-0 w-full h-full border-0"
                    allow="fullscreen"
                />
            </div>
        </div>
    );
};

export default Demo;
