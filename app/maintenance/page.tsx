import Image from 'next/image';
import Link from 'next/link';

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />

            {/* Main Glass Container */}
            <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center">

                {/* Logo/Icon Area */}
                <div className="mb-8 relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg animate-pulse">
                    <svg
                        viewBox="0 0 24 24"
                        className="w-12 h-12 text-white fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>

                {/* Text Content */}
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight uppercase">
                    Fuera de Servicio
                </h1>

                <p className="text-xl md:text-2xl text-purple-200/80 mb-8 font-light max-w-md uppercase tracking-wider">
                    LF Player - Estamos mejorando para ti
                </p>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />

                <div className="space-y-4 text-gray-400 max-w-md leading-relaxed">
                    <p>
                        Estamos realizando una reconstrucción profunda de nuestra infraestructura para ofrecerte una experiencia más robusta y sin interrupciones.
                    </p>
                    <p className="text-sm italic">
                        Sincronizando bibliotecas y optimizando conexiones...
                    </p>
                </div>

                <div className="mt-12 group flex items-center space-x-2 text-white/50 hover:text-white transition-colors duration-300">
                    <span className="text-xs uppercase tracking-widest">Volemos pronto</span>
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" />
                </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-12 relative z-10">
                <span className="text-white/20 text-sm font-medium tracking-widest uppercase">
                    &copy; 2026 LF Player Internal Recovery
                </span>
            </div>
        </div>
    );
}
