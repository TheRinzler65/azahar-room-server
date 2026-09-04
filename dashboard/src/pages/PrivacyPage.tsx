import { Link } from "react-router-dom";
import { Window } from "../components/Window";

export const PrivacyPage = () => (
  <div className="max-w-3xl mx-auto p-4 space-y-4 font-mono text-xs">
    <Window title="LEGAL NOTICES & PRIVACY">
      <div className="space-y-4 text-muted-400 leading-relaxed">
        <div className="flex items-center justify-between">
          <span className="text-muted-300 font-bold text-sm">
            Last updated: September 2026
          </span>
          <Link to="/" className="text-primary-400 hover:underline">
            ← Back
          </Link>
        </div>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">1. Hosting</h2>
          <p>
            This website is hosted by:<br />
            <strong>OVH SAS</strong><br />
            2 rue Kellermann - 59100 Roubaix - France
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">2. Data Collected</h2>
          <p>
            We collect only the minimum data required to operate the multiplayer
            service:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="text-primary-400">Account data</span> — username,
              password hash, and a generated authentication token.
            </li>
            <li>
              <span className="text-primary-400">Game data</span> — preferred
              game title/ID, play time, and room activity.
            </li>
            <li>
              <span className="text-primary-400">Connection data</span> — IP
              address (used for ban enforcement only, not stored permanently).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">3. How Data Is Used</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To authenticate players and manage multiplayer sessions.</li>
            <li>To enforce bans and maintain fair play.</li>
            <li>
              To display aggregate statistics (player count, active rooms).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">4. Data Storage</h2>
          <p>
            All data is stored in a MySQL database on the server. Passwords are
            salted and hashed using secure algorithms. No plain-text passwords are
            stored or transmitted.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">5. Third-Party Services</h2>
          <p>
            We do not share data with third parties. A Discord webhook may be
            used for administrative notifications only.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">6. Your Rights</h2>
          <p>
            You can request deletion of your account and all associated data by{" "}
            <a
              href="https://discord.com/users/590070698140237826"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              contacting the server administrator on Discord
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-muted-200 font-bold">7. Changes</h2>
          <p>
            This policy may be updated at any time. Changes will be reflected on
            this page with an updated date.
          </p>
        </section>
      </div>
    </Window>
  </div>
);