import { Link } from 'react-router-dom';
import { Window } from '../components/Window';

export const NotFoundPage = () => {
    return (
        <div className="max-w-2xl mx-auto p-4 mt-10">
            <Window title="ERROR 404">
                <div className="font-mono text-xs p-4 space-y-3">
                    <div className="text-red-500 font-bold">SYSTEM ERROR: ROUTE NOT FOUND</div>
                    <div className="text-neutral-400">
                        <pre className="whitespace-pre-wrap text-red-400">{`ERROR_CODE: 404
DESCRIPTION: The requested resource does not exist on this server.
LOCATION: unknown
STATUS: missing`}</pre>
                    </div>
                    <div className="text-neutral-500">
                        The page you are looking for has been moved, deleted, or never existed.
                    </div>
                    <div className="pt-2 flex gap-3">
                        <Link to="/" className="text-sky-400 hover:underline">&gt; return to root</Link>
                        <Link to="/play" className="text-green-400 hover:underline">&gt; go to play</Link>
                    </div>
                </div>
            </Window>
        </div>
    );
};
