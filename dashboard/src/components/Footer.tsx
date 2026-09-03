export const Footer = () => (
    <footer className="bg-neutral-950 border-t border-border px-4 py-3 font-mono text-[10px] text-neutral-500">
        <div className="max-w-6xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-neutral-400">AZAHAR ROOM SERVER</span>
                <span className="hidden sm:inline text-neutral-700">|</span>
                <span>v1.0.0</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <a href="https://github.com/TheRinzler65/azahar-room-server" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-sky-400 transition-colors">GitHub</a>
                <span className="hidden sm:inline text-neutral-700">|</span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
                    <span className="text-green-600">All systems operational</span>
                </span>
                <span className="hidden sm:inline text-neutral-700">|</span>
                <span>© 2026 Rinzler</span>
            </div>
        </div>
    </footer>
);
